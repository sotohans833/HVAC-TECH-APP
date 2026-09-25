import { SESSION_COOKIE, technicianForToken } from './session';
import type { Technician } from './technicians';

function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

/**
 * The technician making an API request, or a 401 to return as is.
 *
 * API routes sit outside the page middleware, so each one checks for itself;
 * a route that forgets to is a route anyone on the internet can call.
 */
export async function requireTechnician(
  request: Request,
): Promise<{ technician: Technician } | { response: Response }> {
  const technician = await technicianForToken(cookieValue(request, SESSION_COOKIE));
  if (technician) return { technician };
  return { response: Response.json({ error: 'unauthorized' }, { status: 401 }) };
}
