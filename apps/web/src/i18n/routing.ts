import { defineRouting } from 'next-intl/routing';

/**
 * Spanish is the default locale. That is a product decision, not a placeholder:
 * the technicians this is built for work in Spanish, and the app meets them
 * there. The invoice still comes out in English — see lib/invoice.ts.
 */
export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
});

export type Locale = (typeof routing.locales)[number];
