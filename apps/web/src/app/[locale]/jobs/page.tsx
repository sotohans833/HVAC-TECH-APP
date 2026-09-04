import { setRequestLocale } from 'next-intl/server';
import { JobList } from '@/features/jobs/JobList';
import type { Locale } from '@/i18n/routing';

export default async function JobsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <JobList locale={locale} />;
}
