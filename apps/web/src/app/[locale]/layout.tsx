import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { ThemeScript } from '../theme-script';
import { AppBar } from '@/features/shell/AppBar';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Manifold — HVAC field tools',
  description: 'Bilingual diagnostics and invoicing for HVAC technicians.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <NextIntlClientProvider>
          <div className="app-shell">
            <AppBar />
            <main className="app-main">{children}</main>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
