'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Badge, Button, CloseIcon, SearchIcon } from '@manifold/ui';
import type { JobLookup, ServiceTitanMode } from '@/lib/servicetitan/types';
import { fetchApi } from '@/features/auth/fetchApi';
import styles from './EquipmentCapture.module.css';

type Status = 'idle' | 'searching' | 'not-found' | 'error';

/** Error codes from the API, mapped to the messages under `servicetitan.errors`. */
export function serviceTitanErrorKey(code: string | undefined): string {
  switch (code) {
    case 'off':
    case 'auth':
    case 'forbidden':
    case 'invalid':
    case 'not-found':
      return code;
    default:
      return 'upstream';
  }
}

export function JobLookupPanel({
  mode,
  job,
  onFound,
  onClear,
}: {
  mode: ServiceTitanMode;
  job: JobLookup | null;
  onFound: (job: JobLookup) => void;
  onClear: () => void;
}) {
  const t = useTranslations('servicetitan');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorKey, setErrorKey] = useState('upstream');

  async function search(event: FormEvent) {
    event.preventDefault();
    const number = query.trim();
    if (!number) return;
    if (!navigator.onLine) {
      setErrorKey('offline');
      setStatus('error');
      return;
    }
    setStatus('searching');
    try {
      const response = await fetchApi(`/api/servicetitan/jobs/${encodeURIComponent(number)}`);
      const body = (await response.json()) as JobLookup | { error: string };
      if ('error' in body) {
        if (body.error === 'not-found') {
          setStatus('not-found');
        } else {
          setErrorKey(serviceTitanErrorKey(body.error));
          setStatus('error');
        }
        return;
      }
      setStatus('idle');
      onFound(body);
    } catch {
      setErrorKey('upstream');
      setStatus('error');
    }
  }

  if (job) {
    return (
      <div className={styles.jobCard}>
        <div className={styles.jobCardTop}>
          <span className={styles.fieldLabel}>
            {t('job', { number: job.job.number })}
            {mode === 'mock' ? <Badge tone="copper">{t('demo')}</Badge> : null}
          </span>
          <button
            type="button"
            className={styles.clear}
            onClick={() => {
              setQuery('');
              onClear();
            }}
            aria-label={t('changeJob')}
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <strong className={styles.jobName}>{job.customerName ?? job.location.name}</strong>
        {job.location.address ? (
          <span className={styles.jobAddress}>{job.location.address}</span>
        ) : null}
        <details className={styles.jobEquipment}>
          <summary>{t('existing', { count: job.equipment.length })}</summary>
          <ul>
            {job.equipment.map((unit) => (
              <li key={unit.id}>
                <span>{unit.name || t('unnamed')}</span>
                <span className={styles.muted}>{unit.serialNumber}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    );
  }

  return (
    <form className={styles.field} onSubmit={(event) => void search(event)}>
      <label className={styles.fieldLabel} htmlFor="job-number">
        {t('jobLabel')}
        {mode === 'mock' ? <Badge tone="copper">{t('demo')}</Badge> : null}
      </label>
      <div className={styles.searchRow}>
        <input
          id="job-number"
          className={[styles.input, styles.identifier].join(' ')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder={mode === 'mock' ? '75907463' : t('jobPlaceholder')}
        />
        <Button type="submit" disabled={status === 'searching' || query.trim() === ''}>
          <SearchIcon size={17} />
          {status === 'searching' ? t('searching') : t('search')}
        </Button>
      </div>
      {status === 'not-found' ? (
        <p className={[styles.scanStatus, styles.warn].join(' ')} role="status">
          {t('notFound')}
        </p>
      ) : status === 'error' ? (
        <p className={[styles.scanStatus, styles.warn].join(' ')} role="status">
          {t(`errors.${errorKey}`)}
        </p>
      ) : (
        <p className={styles.hintText}>{mode === 'mock' ? t('demoHint') : t('jobHint')}</p>
      )}
    </form>
  );
}
