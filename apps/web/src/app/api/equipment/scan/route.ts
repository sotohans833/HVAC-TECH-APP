import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { requireTechnician } from '@/lib/auth/request.server';
import { NAMEPLATE_PROMPT, NameplateReadingSchema } from '@/lib/nameplate';

/**
 * Reads a nameplate photo with Claude and returns the fields as JSON.
 *
 * This runs on the server because the API key cannot ship to the phone. It is
 * a helper, not a dependency: with no key, no signal or an error, the app
 * still saves the photo and the technician types the fields in. See ADR 0007.
 */

export const runtime = 'nodejs';

const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

/** A downscaled plate photo is a few hundred KB; this leaves generous room. */
const MAX_BASE64_LENGTH = 8_000_000;

function error(code: string, status: number) {
  return Response.json({ error: code }, { status });
}

export async function POST(request: Request) {
  // Each reading costs money, so only signed-in technicians can make one.
  const auth = await requireTechnician(request);
  if ('response' in auth) return auth.response;
  if (!process.env.ANTHROPIC_API_KEY) return error('not-configured', 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('bad-request', 400);
  }

  const { image, mediaType } = (body ?? {}) as { image?: unknown; mediaType?: unknown };
  if (
    typeof image !== 'string' ||
    image.length === 0 ||
    image.length > MAX_BASE64_LENGTH ||
    !MEDIA_TYPES.includes(mediaType as MediaType)
  ) {
    return error('bad-request', 400);
  }

  const client = new Anthropic();

  try {
    const response = await client.beta.messages.parse({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-5',
      max_tokens: 4000,
      // Transcribing a plate is reading, not reasoning; low effort keeps the
      // technician waiting a couple of seconds rather than ten.
      output_config: {
        effort: 'low',
        format: betaZodOutputFormat(NameplateReadingSchema),
      },
      // If a request is ever declined, retry it on a fallback model inside the
      // same call instead of failing the scan.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as MediaType, data: image },
            },
            { type: 'text', text: NAMEPLATE_PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      return error('unreadable', 422);
    }
    return Response.json(response.parsed_output);
  } catch (caught) {
    if (caught instanceof Anthropic.AuthenticationError) return error('not-configured', 503);
    if (caught instanceof Anthropic.RateLimitError) return error('busy', 429);
    if (caught instanceof Anthropic.APIConnectionError) return error('upstream', 502);
    if (caught instanceof Anthropic.APIError) {
      console.error('Nameplate scan failed', caught.status, caught.message);
      return error('upstream', 502);
    }
    throw caught;
  }
}
