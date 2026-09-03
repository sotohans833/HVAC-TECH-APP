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
  Stepper,
  TrashIcon,
} from '@manifold/ui';
import { CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, CATALOG_BY_ID } from '@/lib/catalog';
import { composeInvoiceDescription, lineCount, type CallType } from '@/lib/invoice';
import type { Locale } from '@/i18n/routing';
import { useTicket } from './store';
import styles from './InvoiceBuilder.module.css';

const CALL_TYPES: readonly CallType[] = ['no-cooling', 'no-heat', 'maintenance', 'install'];

export function InvoiceBuilder({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const {
    callType,
    unit,
    lines,
    setCallType,
    setUnit,
    addPart,
    setQuantity,
    removePart,
    clear,
  } = useTicket();
  const [copied, setCopied] = useState(false);

  const description = useMemo(
    () => composeInvoiceDescription({ callType, lines, ...(unit ? { unit } : {}) }),
    [callType, lines, unit],
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

  const callTypeOptions = CALL_TYPES.map((value) => ({
    value,
    label: t(`callTypes.${value}`),
  }));

  return (
    <>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>{t('builder.eyebrow')}</p>
        <h1 className={styles.heading}>{t('builder.heading')}</h1>
        <p className={styles.subheading}>{t('builder.subheading')}</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.field}>
          <span className={styles.fieldLabel} id="call-type-label">
            {t('builder.callType')}
          </span>
          <SegmentedControl
            options={callTypeOptions}
            value={callType}
            onChange={setCallType}
            label={t('builder.callType')}
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
            {lines.length === 0 ? (
              <div className={styles.preview}>
                <p className={styles.empty}>{t('builder.empty')}</p>
              </div>
            ) : (
              <>
                <ul className={styles.lines}>
                  {lines.map((line) => {
                    const item = CATALOG_BY_ID.get(line.itemId);
                    if (!item) return null;
                    const name = item.label[locale];

                    return (
                      <li key={line.itemId} className={styles.line}>
                        <PartIcon id={item.icon} size={22} className={styles.lineIcon} />
                        <span className={styles.lineText}>
                          <span className={styles.lineName}>{name}</span>
                          <span className={styles.lineAction}>
                            {t(`actions.${line.action}`)}
                          </span>
                        </span>
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
                      </li>
                    );
                  })}
                </ul>

                <div className={styles.preview}>
                  <p className={styles.previewText}>{description}</p>
                </div>

                <div className={styles.previewActions}>
                  <Button onClick={copyDescription} block>
                    {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
                    {copied ? t('builder.copied') : t('builder.copy')}
                  </Button>
                  <Button variant="ghost" onClick={clear}>
                    {t('builder.clear')}
                  </Button>
                </div>
              </>
            )}
          </Panel>

          {lines.length > 0 ? (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <Badge tone="low">
                {locale === 'es' ? 'Factura en inglés' : 'Invoice in English'}
              </Badge>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
