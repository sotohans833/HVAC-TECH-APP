import { requireTechnician } from '@/lib/auth/request.server';
import { serviceTitanMode } from '@/lib/servicetitan/client.server';

export const runtime = 'nodejs';

/** Whether ServiceTitan is connected, so screens can hide what cannot work. */
export async function GET(request: Request) {
  const auth = await requireTechnician(request);
  if ('response' in auth) return auth.response;
  return Response.json({ mode: serviceTitanMode() });
}
