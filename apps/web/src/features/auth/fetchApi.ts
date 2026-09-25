'use client';

import { forgetTechnician } from './useTechnician';

/**
 * fetch for the app's own API. A 401 means the session ran out or the
 * technician was removed, so it goes straight to the login page and brings the
 * technician back here afterwards.
 */
export async function fetchApi(input: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401) {
    forgetTechnician();
    const locale = window.location.pathname.split('/')[1] || 'es';
    const next = encodeURIComponent(window.location.pathname);
    window.location.assign(`/${locale}/login?next=${next}`);
  }
  return response;
}
