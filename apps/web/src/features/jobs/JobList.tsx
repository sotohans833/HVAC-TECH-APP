'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslations } from 'next-intl';
import { Badge, Button, TrashIcon } from '@manifold/ui';
import { deleteJob, jobPartCount, listJobs, type Job } from '@/lib/db';
import { useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { useTicket } from '@/features/invoice/store';
import styles from './JobList.module.css';

export function JobList({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const router = useRouter();
  const load = useTicket((state) => state.load);

  // Live: finishing a job on the builder updates this list without a refresh.
  const jobs = useLiveQuery(() => listJobs(), []);

  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  function openJob(job: Job) {
    load(job);
    router.push('/');
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t('jobs.eyebrow')}</p>
          <h1 className={styles.heading}>{t('jobs.heading')}</h1>
        </div>
      </header>

      {jobs === undefined ? (
        <div className={styles.loading} aria-busy="true" />
      ) : jobs.length === 0 ? (
        <p className={styles.empty}>{t('jobs.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {jobs.map((job) => (
            <li key={job.id} className={styles.row}>
              <div className={styles.main}>
                <span className={styles.name}>
                  {job.customer.trim() === '' ? (
                    <span className={styles.unnamed}>{t('jobs.unnamed')}</span>
                  ) : (
                    job.customer
                  )}
                </span>
                <span className={styles.meta}>
                  <span>{dateFormat.format(job.updatedAt)}</span>
                  <span>·</span>
                  <span>{t(`callTypes.${job.callType}`)}</span>
                  {job.unit ? (
                    <>
                      <span>·</span>
                      <span>{job.unit}</span>
                    </>
                  ) : null}
                  <span>·</span>
                  <span>{t('builder.itemsOnTicket', { count: jobPartCount(job) })}</span>
                </span>
              </div>

              <div className={styles.actions}>
                <Badge tone={job.status === 'draft' ? 'warn' : 'ok'} dot>
                  {t(`jobs.status.${job.status}`)}
                </Badge>
                <Button size="sm" variant="secondary" onClick={() => openJob(job)}>
                  {t('jobs.open')}
                </Button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => void deleteJob(job.id)}
                  aria-label={t('jobs.delete', {
                    name: job.customer.trim() === '' ? t('jobs.unnamed') : job.customer,
                  })}
                >
                  <TrashIcon size={17} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
