'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ActionTile,
  Badge,
  Button,
  CheckIcon,
  CopyIcon,
  PartIcon,
  Panel,
  SegmentedControl,
  Select,
  Stepper,
  TrashIcon,
} from '@manifold/ui';
import { CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, CATALOG_BY_ID } from '@/lib/catalog';
import type { WorkAction } from '@/lib/catalog';
import { saveJob } from '@/lib/db';
import { composeInvoiceDescription, lineCount, type CallType } from '@/lib/invoice';
import type { MaintenanceScope } from '@/lib/procedures';
import type { Locale } from '@/i18n/routing';
import { useTicket } from './store';
import { useJobPersistence } from './useJobPersistence';
import styles from './InvoiceBuilder.module.css';

const CALL_TYPES: readonly CallType[] = ['no-cooling', 'no-heat', 'maintenance', 'install'];
const SCOPES: readonly MaintenanceScope[] = ['cooling', 'heating', 'full'];

export function InvoiceBuilder({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const {
    job,
    setCustomer,
    setUnit,
    setCallType,
    setMaintenanceScope,
    addPart,
    setQuantity,
    setAction,
    setCause,
    removePart,
    clearLines,
    complete,
  } = useTicket();

  useJobPersistence();
  const [copied, setCopied] = useState(false);

  const { callType, maintenanceScope, customer, unit, lines } = job;

  const description = useMemo(
    () =>
      composeInvoiceDescription({
        callType,
        lines,
        maintenanceScope,
        ...(unit ? { unit } : {}),
      }),
    [callType, lines, maintenanceScope, unit],
  );

  const quantities = useMemo(
    () => new Map(lines.map((line) => [line.itemId, line.quantity])),
    [lines],
  );

  async function copyDescription() {
    try {
      await navigator.clipboard.writeText(description);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard permission denied, or an insecure origin. The text is on
      // screen and selectable, so the technician can still copy it by hand.
    }
  }

  /** Files the job into history and opens a fresh one. */
  async function finishJob() {
    try {
      await saveJob({ ...job, status: 'completed' });
    } catch {
      // Storage unavailable. Starting the next job still beats being stuck.
    }
    complete();
  }

  const emptyHint =
    callType === 'maintenance'
      ? t('builder.emptyMaintenance')
      : callType === 'install'
        ? t('builder.empty')
        : t('builder.emptyDiagnostic');

  const hasWork = lines.length > 0 || customer.trim() !== '' || unit.trim() !== '';

  return (
    <>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>{t('builder.eyebrow')}</p>
        <h1 className={styles.heading}>{t('builder.heading')}</h1>
        <p className={styles.subheading}>{t('builder.subheading')}</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('builder.callType')}</span>
          <SegmentedControl
            options={CALL_TYPES.map((value) => ({ value, label: t(`callTypes.${value}`) }))}
            value={callType}
            onChange={setCallType}
            label={t('builder.callType')}
          />
        </div>

        {callType === 'maintenance' ? (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t('builder.scope')}</span>
            <SegmentedControl
              options={SCOPES.map((value) => ({ value, label: t(`scopes.${value}`) }))}
              value={maintenanceScope}
              onChange={setMaintenanceScope}
              label={t('builder.scope')}
            />
          </div>
        ) : null}

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="customer">
            {t('builder.customerLabel')}
          </label>
          <input
            id="customer"
            className={styles.input}
            value={customer}
            onChange={(event) => setCustomer(event.target.value)}
            placeholder={t('builder.customerPlaceholder')}
            autoComplete="off"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="unit">
            {t('builder.unitLabel')}
          </label>
          <input
            id="unit"
            className={styles.input}
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder={t('builder.unitPlaceholder')}
            autoComplete="off"
          />
        </div>
      </div>

      <div className={styles.layout}>
        <div>
          {CATEGORY_ORDER.map((category) => {
            const items = CATALOG.filter((item) => item.category === category);
            if (items.length === 0) return null;

            return (
              <section key={category} className={styles.category}>
                <h2 className={styles.categoryName}>{CATEGORY_LABELS[category][locale]}</h2>
                <div className={styles.grid}>
                  {items.map((item) => {
                    const count = quantities.get(item.id) ?? 0;
                    return (
                      <ActionTile
                        key={item.id}
                        icon={item.icon}
                        label={item.label[locale]}
                        {...(item.spec ? { meta: item.spec } : {})}
                        count={count}
                        selected={count > 0}
                        onSelect={() => addPart(item.id)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className={styles.ticket}>
          <Panel
            title={t('builder.ticket')}
            aside={t('builder.itemsOnTicket', { count: lineCount(lines) })}
            flush
          >
            {lines.length > 0 ? (
              <ul className={styles.lines}>
                {lines.map((line) => {
                  const item = CATALOG_BY_ID.get(line.itemId);
                  if (!item) return null;
                  const name = item.label[locale];

                  return (
                    <li key={line.itemId} className={styles.line}>
                      <div className={styles.lineTop}>
                        <PartIcon id={item.icon} size={22} className={styles.lineIcon} />
                        <span className={styles.lineName}>{name}</span>
                        <Stepper
                          value={line.quantity}
                          onChange={(next) => setQuantity(line.itemId, next)}
                          min={0}
                          label={t('builder.quantity', { part: name })}
                          decrementLabel={t('builder.decrease')}
                          incrementLabel={t('builder.increase')}
                        />
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => removePart(line.itemId)}
                          aria-label={t('builder.remove', { part: name })}
                        >
                          <TrashIcon size={17} />
                        </button>
                      </div>

                      <div className={styles.lineControls}>
                        <Select
                          value={line.action}
                          onValueChange={(next) => setAction(line.itemId, next as WorkAction)}
                          options={item.actions.map((action) => ({
                            value: action,
                            label: t(`actions.${action}`),
                          }))}
                          label={t('builder.actionFor', { part: name })}
                          className={styles.actionSelect}
                        />
                        <Select
                          value={line.causeId ?? ''}
                          onValueChange={(next) => setCause(line.itemId, next)}
                          options={item.causes.map((cause) => ({
                            value: cause.id,
                            label: cause.label[locale],
                          }))}
                          placeholder={t('builder.causePlaceholder')}
                          label={t('builder.causeFor', { part: name })}
                          className={styles.causeSelect}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className={styles.preview}>
                <p className={styles.empty}>{emptyHint}</p>
              </div>
            )}

            <div className={styles.preview}>
              <p className={styles.previewText}>{description}</p>
            </div>

            <div className={styles.previewActions}>
              <Button onClick={copyDescription} block>
                {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
                {copied ? t('builder.copied') : t('builder.copy')}
              </Button>
              {lines.length > 0 ? (
                <Button variant="ghost" onClick={clearLines}>
                  {t('builder.clear')}
                </Button>
              ) : null}
            </div>
          </Panel>

          {hasWork ? (
            <div className={styles.finish}>
              <Button variant="secondary" block onClick={finishJob}>
                {t('builder.finish')}
              </Button>
              <p className={styles.hint}>
                <Badge tone="low">
                  {locale === 'es' ? 'Factura en inglés' : 'Invoice in English'}
                </Badge>
                <span>{t('builder.finishHint')}</span>
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
