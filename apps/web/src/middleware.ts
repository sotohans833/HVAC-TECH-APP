import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, technicianForToken } from './lib/auth/session';
import { routing, type Locale } from './i18n/routing';

const intl = createMiddleware(routing);

function localeOf(pathname: string): Locale {
  const first = pathname.split('/')[1];
  return routing.locales.find((locale) => locale === first) ?? routing.defaultLocale;
}

/**
 * Every page needs a signed-in technician except the login page itself. API
 * routes are outside this matcher and check the session themselves.
 */
export default async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const locale = localeOf(pathname);
  const isLogin = pathname === `/${locale}/login`;

  if (!isLogin) {
    const technician = await technicianForToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!technician) {
      const login = new URL(`/${locale}/login`, request.url);
      if (pathname !== '/' && pathname !== `/${locale}`) {
        login.searchParams.set('next', pathname + search);
      }
      return NextResponse.redirect(login);
    }
  }

  return intl(request);
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
  // Node rather than edge, so it reads the same live environment as the API
  // routes: a technician added with `pnpm tech add` can sign in without a
  // restart, and one removed is locked out of pages as well as the API.
  runtime: 'nodejs',
};
