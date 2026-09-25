import { setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/features/auth/LoginForm';
import type { Locale } from '@/i18n/routing';

export default async function LoginPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LoginForm />;
}
