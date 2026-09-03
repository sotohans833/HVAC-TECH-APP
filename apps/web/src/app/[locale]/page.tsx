import { setRequestLocale } from 'next-intl/server';
import { InvoiceBuilder } from '@/features/invoice/InvoiceBuilder';
import type { Locale } from '@/i18n/routing';

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <InvoiceBuilder locale={locale} />;
}
