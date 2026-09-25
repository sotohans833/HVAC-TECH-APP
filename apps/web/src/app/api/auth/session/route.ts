import { requireTechnician } from '@/lib/auth/request.server';

export const runtime = 'nodejs';

/** Who is signed in, for the name in the app bar and on saved records. */
export async function GET(request: Request) {
  const auth = await requireTechnician(request);
  if ('response' in auth) return auth.response;
  return Response.json({ id: auth.technician.id, name: auth.technician.name });
}
