'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Select } from '@manifold/ui';
import type { Equipment } from '@/lib/equipment';
import { diffEquipment, suggestMatch, toServiceTitanFields } from '@/lib/servicetitan/diff';
import type { JobLookup, WritableField } from '@/lib/servicetitan/types';
import { fetchApi } from '@/features/auth/fetchApi';
import { serviceTitanErrorKey } from './JobLookupPanel';
import styles from './EquipmentCapture.module.css';

const NEW = 'new';

type Status = 'loading' | 'ready' | 'sending' | 'sent' | 'marked' | 'error';

/**
 * The review step before anything is written to ServiceTitan: which record it
 * goes to, and exactly what changes, field by field, from the current value to
 * the new one. Every change can be unticked. Nothing is sent until the
 * technician confirms.
 */
export function SendToServiceTitan({
  unit: openedWith,
  onSent,
  onClose,
}: {
  unit: Equipment;
  onSent: (result: { equipmentId: number; locationId: number }) => void;
  onClose: () => void;
}) {
  const t = useTranslations('servicetitan');
  // Reviewed as it was when the panel opened: saving the result updates the
  // record, and that must not restart the review under the technician.
  const [unit] = useState(openedWith);
  const [job, setJob] = useState<JobLookup | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [errorKey, setErrorKey] = useState('upstream');
  const [target, setTarget] = useState<string>(NEW);
  const [skipped, setSkipped] = useState<WritableField[]>([]);

  const fields = useMemo(() => toServiceTitanFields(unit), [unit]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const response = await fetchApi(
          `/api/servicetitan/jobs/${encodeURIComponent(unit.jobNumber ?? '')}`,
        );
        const body = (await response.json()) as JobLookup | { error: string };
        if (!live) return;
        if ('error' in body) {
          setErrorKey(serviceTitanErrorKey(body.error));
          setStatus('error');
          return;
        }
        setJob(body);
        // Prefer the record this unit was sent to before, then the likeliest match.
        const previous = body.equipment.find((e) => e.id === unit.serviceTitanEquipmentId);
        const match = previous ?? suggestMatch(fields, body.equipment);
        setTarget(match ? String(match.id) : NEW);
        setStatus('ready');
      } catch {
        if (!live) return;
        setErrorKey('upstream');
        setStatus('error');
      }
    })();
    return () => {
      live = false;
    };
  }, [unit.jobNumber, unit.serviceTitanEquipmentId, fields]);

  const current = job?.equipment.find((e) => String(e.id) === target) ?? null;
  const changes = diffEquipment(current, fields);
  const chosen = changes.filter((change) => !skipped.includes(change.field));

  async function send() {
    if (!job || chosen.length === 0) return;
    setStatus('sending');
    try {
      const response = await fetchApi('/api/servicetitan/equipment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          locationId: job.location.id,
          equipmentId: current ? current.id : null,
          fields: Object.fromEntries(chosen.map((change) => [change.field, change.to])),
        }),
      });
      const body = (await response.json()) as { id: number } | { error: string };
      if ('error' in body) {
        setErrorKey(serviceTitanErrorKey(body.error));
        setStatus('error');
        return;
      }
      setStatus('sent');
      onSent({ equipmentId: body.id, locationId: job.location.id });
    } catch {
      setErrorKey('upstream');
      setStatus('error');
    }
  }

  const targetOptions = [
    ...(job?.equipment ?? []).map((e) => ({
      value: String(e.id),
      label: t('updateOption', { name: e.name || t('unnamed'), serial: e.serialNumber || '—' }),
    })),
    { value: NEW, label: t('createOption') },
  ];

  return (
    <div className={styles.sendPanel}>
      <div className={styles.sendHeader}>
        <strong>{t('sendHeading')}</strong>
        {job ? (
          <span className={styles.muted}>
            {t('job', { number: job.job.number })} · {job.customerName ?? job.location.name}
          </span>
        ) : null}
      </div>

      {status === 'loading' ? (
        <p className={[styles.scanStatus, styles.reading].join(' ')} role="status">
          {t('loading')}
        </p>
      ) : null}

      {status === 'error' ? (
        <p className={[styles.scanStatus, styles.warn].join(' ')} role="alert">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}

      {status === 'sent' || status === 'marked' ? (
        <p className={[styles.scanStatus, styles.ok].join(' ')} role="status">
          {status === 'marked' ? t('marked') : current ? t('sentUpdated') : t('sentCreated')}
        </p>
      ) : null}

      {job && (status === 'ready' || status === 'sending') ? (
        <>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t('target')}</span>
            <Select
              label={t('target')}
              value={target}
              onValueChange={(value) => {
                setTarget(value);
                setSkipped([]);
              }}
              options={targetOptions}
            />
          </div>

          {changes.length === 0 ? (
            <p className={[styles.scanStatus, styles.ok].join(' ')}>{t('noChanges')}</p>
          ) : (
            <ul className={styles.changes}>
              {changes.map((change) => {
                const on = !skipped.includes(change.field);
                return (
                  <li key={change.field}>
                    <label className={styles.change}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setSkipped((list) =>
                            on
                              ? [...list, change.field]
                              : list.filter((f) => f !== change.field),
                          )
                        }
                      />
                      <span className={styles.changeBody}>
                        <span className={styles.fieldLabel}>{t(`fields.${change.field}`)}</span>
                        {change.from ? (
                          <s className={styles.changeFrom}>{change.from}</s>
                        ) : (
                          <span className={styles.changeFrom}>{t('empty')}</span>
                        )}
                        <span className={styles.changeTo}>{change.to}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}

      <div className={styles.formActions}>
        {status === 'ready' || status === 'sending' ? (
          changes.length === 0 && current ? (
            <Button
              onClick={() => {
                setStatus('marked');
                onSent({ equipmentId: current.id, locationId: job?.location.id ?? 0 });
              }}
            >
              {t('markDone')}
            </Button>
          ) : (
            <Button
              onClick={() => void send()}
              disabled={status === 'sending' || chosen.length === 0}
            >
              {status === 'sending'
                ? t('sending')
                : current
                  ? t('confirmUpdate', { count: chosen.length })
                  : t('confirmCreate')}
            </Button>
          )
        ) : null}
        <Button variant="ghost" onClick={onClose}>
          {status === 'sent' || status === 'marked' ? t('close') : t('cancel')}
        </Button>
      </div>
    </div>
  );
}
