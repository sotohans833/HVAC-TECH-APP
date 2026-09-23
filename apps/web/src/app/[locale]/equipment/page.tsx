import { setRequestLocale } from 'next-intl/server';
import { EquipmentCapture } from '@/features/equipment/EquipmentCapture';
import type { Locale } from '@/i18n/routing';

export default async function EquipmentPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <EquipmentCapture locale={locale} />;
}
