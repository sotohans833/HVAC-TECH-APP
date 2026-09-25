'use client';

import { useEffect, useState } from 'react';
import type { ServiceTitanMode } from '@/lib/servicetitan/types';
import { fetchApi } from '@/features/auth/fetchApi';

/** Null while unknown; 'off' when ServiceTitan is not connected. */
export function useServiceTitanMode(): ServiceTitanMode | null {
  const [mode, setMode] = useState<ServiceTitanMode | null>(null);
  useEffect(() => {
    let live = true;
    fetchApi('/api/servicetitan/status')
      .then((response) => (response.ok ? response.json() : { mode: 'off' }))
      .then((body: { mode: ServiceTitanMode }) => live && setMode(body.mode))
      .catch(() => live && setMode('off'));
    return () => {
      live = false;
    };
  }, []);
  return mode;
}
