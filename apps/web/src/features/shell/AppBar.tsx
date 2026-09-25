'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge, GlobeIcon, LogOutIcon, MoonIcon, SunIcon } from '@manifold/ui';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { forgetTechnician, useTechnician } from '@/features/auth/useTechnician';

type Theme = 'light' | 'dark';

export function AppBar() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const [theme, setTheme] = useState<Theme>('dark');
  const [online, setOnline] = useState(true);
  const technician = useTechnician();
  const onLogin = pathname === '/login';

  // Read the theme the inline script already applied, rather than assuming one.
  useEffect(() => {
    const applied = document.documentElement.getAttribute('data-theme');
    setTheme(applied === 'light' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('mf-theme', next);
    } catch {
      // Private browsing or blocked storage — the theme still applies for this
      // session, it just will not be remembered. Nothing to recover from.
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    forgetTechnician();
    router.replace('/login');
    router.refresh();
  }

  function switchLocale() {
    const next =
      routing.locales.find((candidate) => candidate !== locale) ?? routing.defaultLocale;
    router.replace(pathname, { locale: next });
  }

  return (
    <header className="app-bar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
        </span>
        <span className="brand-name">{t('app.name')}</span>
      </div>

      {onLogin ? (
        <span className="app-nav" />
      ) : (
        <nav className="app-nav" aria-label={t('nav.label')}>
          <Link
            href="/"
            className="nav-link"
            aria-current={pathname === '/' ? 'page' : undefined}
          >
            {t('nav.builder')}
          </Link>
          <Link
            href="/jobs"
            className="nav-link"
            aria-current={pathname === '/jobs' ? 'page' : undefined}
          >
            {t('nav.jobs')}
          </Link>
          <Link
            href="/equipment"
            className="nav-link"
            aria-current={pathname === '/equipment' ? 'page' : undefined}
          >
            {t('nav.equipment')}
          </Link>
        </nav>
      )}

      <Badge tone={online ? 'ok' : 'warn'} dot>
        {online ? t('status.local') : t('status.offline')}
      </Badge>

      <button
        type="button"
        className="icon-button"
        onClick={switchLocale}
        aria-label={`${t('locale.switch')}: ${locale === 'es' ? 'English' : 'Español'}`}
      >
        <GlobeIcon size={19} />
      </button>

      {technician && !onLogin ? (
        <button
          type="button"
          className="icon-button tech-button"
          onClick={() => void signOut()}
          aria-label={t('auth.signOut', { name: technician.name })}
          title={t('auth.signOut', { name: technician.name })}
        >
          <span className="tech-initials" aria-hidden="true">
            {technician.name
              .split(' ')
              .map((word) => word.charAt(0))
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <LogOutIcon size={17} />
        </button>
      ) : null}

      <button
        type="button"
        className="icon-button"
        onClick={toggleTheme}
        aria-label={t('theme.toggle')}
      >
        {theme === 'dark' ? <SunIcon size={19} /> : <MoonIcon size={19} />}
      </button>
    </header>
  );
}
