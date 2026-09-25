'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Panel } from '@manifold/ui';
import { useRouter } from '@/i18n/navigation';
import { forgetTechnician } from './useTechnician';
import styles from './LoginForm.module.css';

type Status = 'idle' | 'sending' | 'invalid' | 'locked' | 'failed';

/** useSearchParams needs a Suspense boundary for the page to prerender. */
export function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}

function LoginFormInner() {
  const t = useTranslations('login');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState('');
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  // Null until the server says whether any technician exists yet.
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((response) => response.json() as Promise<{ configured: boolean }>)
      .then((body) => setConfigured(body.configured))
      // Unreachable server: show the form, whose error explains it on submit.
      .catch(() => setConfigured(true));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('sending');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user, pin }),
      });
      if (response.ok) {
        forgetTechnician();
        // Only follow in-app paths, never an address someone put in a link.
        const next = searchParams.get('next') ?? '/';
        const target = next.startsWith('/') && !next.startsWith('//') ? next : '/';
        router.replace(target.replace(/^\/(es|en)(?=\/|$)/, '') || '/');
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus(
        body.error === 'locked' ? 'locked' : body.error === 'invalid' ? 'invalid' : 'failed',
      );
      setPin('');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.eyebrow}>{t('eyebrow')}</p>
      <h1 className={styles.heading}>{t('heading')}</h1>

      {configured === null ? (
        <div className={styles.placeholder} aria-busy="true" />
      ) : !configured ? (
        <Panel>
          <p className={styles.setup}>{t('notConfigured')}</p>
          <code className={styles.command}>pnpm tech add Juan Perez</code>
        </Panel>
      ) : (
        <Panel>
          <form className={styles.form} onSubmit={(event) => void submit(event)}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-user">
                {t('user')}
              </label>
              <input
                id="login-user"
                className={styles.input}
                value={user}
                onChange={(event) => setUser(event.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="juan-perez"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-pin">
                {t('pin')}
              </label>
              <input
                id="login-pin"
                className={[styles.input, styles.pin].join(' ')}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                pattern="\d{6}"
                required
              />
            </div>

            {status === 'invalid' || status === 'locked' || status === 'failed' ? (
              <p className={styles.error} role="alert">
                {t(`errors.${status}`)}
              </p>
            ) : null}

            <Button type="submit" block disabled={status === 'sending'}>
              {status === 'sending' ? t('signingIn') : t('signIn')}
            </Button>
            <p className={styles.hint}>{t('hint')}</p>
          </form>
        </Panel>
      )}
    </div>
  );
}
