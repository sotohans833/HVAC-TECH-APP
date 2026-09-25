import { requireTechnician } from '@/lib/auth/request.server';
import { lookupJob } from '@/lib/servicetitan/client.server';
import { ServiceTitanError, serviceTitanErrorResponse } from '@/lib/servicetitan/errors';

export const runtime = 'nodejs';

/** The job's location and the equipment ServiceTitan already has there. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const auth = await requireTechnician(request);
  if ('response' in auth) return auth.response;

  const query = decodeURIComponent((await params).number).trim();
  if (!/^[A-Za-z0-9-]{1,32}$/.test(query)) {
    return Response.json({ error: 'bad-request' }, { status: 400 });
  }

  try {
    const job = await lookupJob(query);
    return job ? Response.json(job) : Response.json({ error: 'not-found' }, { status: 404 });
  } catch (error) {
    if (error instanceof ServiceTitanError) return serviceTitanErrorResponse(error);
    throw error;
  }
}
