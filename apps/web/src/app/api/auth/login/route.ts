import { clearFailures, isLocked, recordFailure } from '@/lib/auth/lockout.server';
import { verifyPin } from '@/lib/auth/pin.server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  authConfig,
  isAuthConfigured,
  signSession,
} from '@/lib/auth/session';
import { findTechnician } from '@/lib/auth/technicians';

export const runtime = 'nodejs';

const DUMMY_SALT = 'A'.repeat(22);
const DUMMY_HASH = 'A'.repeat(43);

function error(code: string, status: number) {
  return Response.json({ error: code }, { status });
}

export async function POST(request: Request) {
  const config = authConfig();
  if (!isAuthConfigured(config)) return error('not-configured', 503);

  let body: { user?: unknown; pin?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return error('bad-request', 400);
  }
  if (typeof body.user !== 'string' || typeof body.pin !== 'string') {
    return error('bad-request', 400);
  }

  const key = body.user.trim().toLowerCase();
  if (isLocked(key)) return error('locked', 429);

  const technician = findTechnician(config.technicians, key);
  let valid = false;
  if (technician) {
    valid = await verifyPin(body.pin.trim(), technician.salt, technician.hash);
  } else {
    // Hash anyway, so a wrong name and a wrong PIN take the same time and
    // cannot be told apart.
    await verifyPin(body.pin, DUMMY_SALT, DUMMY_HASH);
  }

  if (!technician || !valid) {
    recordFailure(key);
    return error(isLocked(key) ? 'locked' : 'invalid', 401);
  }

  clearFailures(key);
  const token = await signSession(technician.id, config.secret);
  const secure = new URL(request.url).protocol === 'https:';
  return Response.json(
    { name: technician.name },
    {
      headers: {
        'set-cookie': [
          `${SESSION_COOKIE}=${token}`,
          'Path=/',
          'HttpOnly',
          'SameSite=Lax',
          `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
          // Off on plain http so the office-Wi-Fi setup keeps working.
          secure ? 'Secure' : null,
        ]
          .filter(Boolean)
          .join('; '),
      },
    },
  );
}
