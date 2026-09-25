import { isAuthConfigured } from '@/lib/auth/session';

export const runtime = 'nodejs';

/**
 * Whether anyone can sign in yet, so the login page can show setup steps
 * instead of a form that can never work. Asked per request because the answer
 * changes with `pnpm tech add`, long after the page itself was built.
 */
export function GET() {
  return Response.json({ configured: isAuthConfigured() });
}
