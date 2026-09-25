'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslations } from 'next-intl';
import {
  Badge,
  Button,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  Panel,
  Select,
  TrashIcon,
} from '@manifold/ui';
import { deleteEquipment, findOpenDraft, listEquipment, saveEquipment } from '@/lib/db';
import {
  EQUIPMENT_FLOORS,
  EQUIPMENT_FLOOR_LABELS,
  EQUIPMENT_TYPES,
  EQUIPMENT_TYPE_LABELS,
  MEMO_SHORTCUTS,
  memoHasShortcut,
  toggleMemoShortcut,
  ageInYears,
  composeEquipmentName,
  createEquipment,
  decodeSerial,
  decodedToMonth,
  normalizeIdentifier,
  type Equipment,
  type EquipmentFloor,
  type EquipmentType,
} from '@/lib/equipment';
import type { NameplateField, NameplateReading } from '@/lib/nameplate';
import type { JobLookup } from '@/lib/servicetitan/types';
import { fetchApi } from '@/features/auth/fetchApi';
import { useTechnician } from '@/features/auth/useTechnician';
import { JobLookupPanel } from './JobLookupPanel';
import { SendToServiceTitan } from './SendToServiceTitan';
import { useServiceTitanMode } from './useServiceTitanMode';
import type { Locale } from '@/i18n/routing';
import { blobToBase64, downscalePhoto } from './photo';
import styles from './EquipmentCapture.module.css';

type ScanState =
  'idle' | 'reading' | 'done' | 'offline' | 'failed' | 'unreadable' | 'notConfigured' | 'busy';

const SCAN_ERRORS: Record<string, ScanState> = {
  'not-configured': 'notConfigured',
  unreadable: 'unreadable',
  busy: 'busy',
};

/** Fields the plate reading can fill, in the order they appear on the form. */
const TEXT_FIELDS = ['manufacturer', 'model', 'serial'] as const;

/**
 * Fills only the fields the technician has not already typed, so a second
 * reading of the same plate never overwrites a correction made by hand.
 */
function applyReading(unit: Equipment, reading: NameplateReading): Equipment {
  const next = { ...unit };
  for (const field of TEXT_FIELDS) {
    const value = reading[field];
    if (value && next[field].trim() === '') {
      next[field] = field === 'manufacturer' ? value.trim() : normalizeIdentifier(value);
    }
  }
  if (reading.type && next.type === '') next.type = reading.type;
  if (reading.manufactured && next.manufactured === '') {
    next.manufactured = reading.manufactured;
  }
  if (next.manufactured === '') {
    const decoded = decodeSerial(next.manufacturer, next.serial);
    if (decoded) next.manufactured = decodedToMonth(decoded);
  }
  return next;
}

export function EquipmentCapture({ locale }: { locale: Locale }) {
  const t = useTranslations('equipment');
  const [customer, setCustomer] = useState('');
  const [draft, setDraft] = useState<Equipment | null>(null);
  const [scan, setScan] = useState<ScanState>('idle');
  const [uncertain, setUncertain] = useState<NameplateField[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [job, setJob] = useState<JobLookup | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const technician = useTechnician();
  const serviceTitan = useServiceTitanMode();
  const connected = serviceTitan !== null && serviceTitan !== 'off';
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const scanRun = useRef(0);

  const units = useLiveQuery(() => listEquipment(), []);

  // Start from the customer on the open job; the technician is usually at the
  // same house they are writing the ticket for.
  useEffect(() => {
    findOpenDraft()
      .then((job) =>
        setCustomer((current) => (current === '' ? (job?.customer ?? '') : current)),
      )
      .catch(() => {
        // No stored job to borrow from; the field just starts empty.
      });
  }, []);

  const photoUrl = useMemo(
    () => (draft?.photo ? URL.createObjectURL(draft.photo) : null),
    [draft?.photo],
  );
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const monthFormat = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  function formatManufactured(value: string): string {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    return match ? monthFormat.format(new Date(Number(match[1]), Number(match[2]) - 1)) : value;
  }

  /** A new record, tied to the job looked up, if there is one. */
  function newDraft(): Equipment {
    return {
      ...createEquipment(customer),
      jobNumber: job?.job.number,
      serviceTitanLocationId: job?.location.id,
    };
  }

  function onJobFound(found: JobLookup) {
    setJob(found);
    const label = [found.customerName ?? found.location.name, found.location.address]
      .filter(Boolean)
      .join(' — ');
    setCustomer(label);
    if (draft) {
      update({
        customer: label,
        jobNumber: found.job.number,
        serviceTitanLocationId: found.location.id,
      });
    }
  }

  async function markSent(unit: Equipment, equipmentId: number, locationId: number) {
    await saveEquipment({
      ...unit,
      enteredInServiceTitanAt: Date.now(),
      serviceTitanEquipmentId: equipmentId,
      serviceTitanLocationId: locationId,
    });
  }

  function update(patch: Partial<Equipment>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    // A field the technician has touched is theirs now, not the model's guess.
    setUncertain((current) => current.filter((field) => !(field in patch)));
  }

  async function readPlate(photo: Blob) {
    const run = ++scanRun.current;
    if (!navigator.onLine) {
      setScan('offline');
      return;
    }
    setScan('reading');
    try {
      const response = await fetchApi('/api/equipment/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: await blobToBase64(photo), mediaType: photo.type }),
      });
      const body = (await response.json()) as NameplateReading | { error: string };
      if (run !== scanRun.current) return;

      if ('error' in body) {
        setScan(SCAN_ERRORS[body.error] ?? 'failed');
        return;
      }
      setDraft((current) => (current ? applyReading(current, body) : current));
      setUncertain(body.uncertain);
      setScan(body.problem && !body.serial && !body.model ? 'unreadable' : 'done');
    } catch {
      if (run === scanRun.current) setScan(navigator.onLine ? 'failed' : 'offline');
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    let photo: Blob = file;
    try {
      photo = await downscalePhoto(file);
    } catch {
      // An image the browser cannot decode (some HEIC files) still gets saved
      // and sent as is; the reading may fail but the photo is not lost.
    }
    setDraft((current) => ({ ...(current ?? newDraft()), photo }));
    setUncertain([]);
    void readPlate(photo);
  }

  function startWithoutPhoto() {
    setDraft(newDraft());
    setScan('idle');
    setUncertain([]);
  }

  function cancel() {
    scanRun.current++;
    setDraft(null);
    setScan('idle');
    setUncertain([]);
  }

  async function save() {
    if (!draft) return;
    try {
      await saveEquipment({
        ...draft,
        customer: draft.customer.trim(),
        capturedBy: draft.capturedBy ?? technician?.name,
        model: normalizeIdentifier(draft.model),
        serial: normalizeIdentifier(draft.serial),
      });
    } catch {
      // Blocked storage: keep the form open so nothing typed is lost.
      return;
    }
    cancel();
  }

  function edit(unit: Equipment) {
    scanRun.current++;
    setDraft(unit);
    setCustomer(unit.customer);
    setScan('idle');
    setUncertain([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
    } catch {
      // Clipboard blocked (non-secure origin): the value is on screen to type.
    }
  }

  const decodedSuggestion = useMemo(() => {
    if (!draft || draft.manufactured !== '') return null;
    const decoded = decodeSerial(draft.manufacturer, draft.serial);
    return decoded ? decodedToMonth(decoded) : null;
  }, [draft]);

  const groups = useMemo(() => {
    const byCustomer = new Map<string, Equipment[]>();
    for (const unit of units ?? []) {
      const key = unit.customer.trim();
      byCustomer.set(key, [...(byCustomer.get(key) ?? []), unit]);
    }
    return [...byCustomer.entries()];
  }, [units]);

  const floorOptions = EQUIPMENT_FLOORS.map((value) => ({
    value,
    label: EQUIPMENT_FLOOR_LABELS[value][locale],
  }));
  const typeOptions = EQUIPMENT_TYPES.map((value) => ({
    value,
    label: EQUIPMENT_TYPE_LABELS[value][locale],
  }));

  const scanMessage =
    scan === 'idle'
      ? null
      : scan === 'done' && uncertain.length > 0
        ? t('scan.doneUncertain')
        : t(`scan.${scan}`);

  function copyButton(id: string, label: string, value: string) {
    const done = copied === id;
    return (
      <button
        type="button"
        className={styles.copy}
        onClick={() => void copy(id, value)}
        aria-label={t('copy', { field: label })}
      >
        {done ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
        <span aria-live="polite">{done ? t('copied') : null}</span>
      </button>
    );
  }

  return (
    <>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h1 className={styles.heading}>{t('heading')}</h1>
        <p className={styles.subheading}>{t('subheading')}</p>
      </header>

      {connected ? (
        <div className={styles.jobSection}>
          <JobLookupPanel
            mode={serviceTitan}
            job={job}
            onFound={onJobFound}
            onClear={() => setJob(null)}
          />
        </div>
      ) : null}

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="equipment-customer">
          {t('customerLabel')}
        </label>
        <input
          id="equipment-customer"
          className={styles.input}
          value={draft ? draft.customer : customer}
          onChange={(event) => {
            // Kept outside the draft too, so the next unit at the same house
            // starts with the customer already filled in.
            setCustomer(event.target.value);
            if (draft) update({ customer: event.target.value });
          }}
          placeholder={t('customerPlaceholder')}
          autoComplete="off"
        />
      </div>

      {/* Two native pickers: with `capture` a phone opens the rear camera
          directly; without it, the photo library, for a plate photographed
          earlier or sent by a coworker. */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.hiddenInput}
        onChange={(event) => {
          void onPhoto(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={(event) => {
          void onPhoto(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {draft === null ? (
        <div className={styles.start}>
          <Button onClick={() => cameraInput.current?.click()} className={styles.camera}>
            {t('takePhoto')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => galleryInput.current?.click()}
            className={styles.camera}
          >
            {t('fromGallery')}
          </Button>
          <Button variant="ghost" onClick={startWithoutPhoto}>
            {t('withoutPhoto')}
          </Button>
        </div>
      ) : (
        <Panel className={styles.editor}>
          <div className={styles.editorLayout}>
            <div className={styles.photoColumn}>
              {photoUrl ? (
                // A local object URL; next/image has nothing to optimize here.
                <img src={photoUrl} alt={t('photoAlt')} className={styles.photo} />
              ) : null}
              <div className={styles.photoActions}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => cameraInput.current?.click()}
                >
                  {t('retake')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => galleryInput.current?.click()}
                >
                  {t('fromGalleryShort')}
                </Button>
                {draft.photo && scan !== 'reading' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => draft.photo && void readPlate(draft.photo)}
                  >
                    {t('readAgain')}
                  </Button>
                ) : null}
              </div>
              {scanMessage ? (
                <p
                  className={[
                    styles.scanStatus,
                    scan === 'reading' ? styles.reading : null,
                    scan === 'done' ? styles.ok : styles.warn,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="status"
                >
                  {scanMessage}
                </p>
              ) : null}
            </div>

            <div className={styles.form} aria-busy={scan === 'reading'}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>{t('fields.floor')}</span>
                  <Select
                    label={t('fields.floor')}
                    value={draft.floor}
                    onValueChange={(value) => update({ floor: value as EquipmentFloor | '' })}
                    options={floorOptions}
                    placeholder={t('fields.floorPlaceholder')}
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>
                    {t('fields.type')}
                    {uncertain.includes('type') ? (
                      <span className={styles.verify}>{t('verify')}</span>
                    ) : null}
                  </span>
                  <Select
                    label={t('fields.type')}
                    value={draft.type}
                    onValueChange={(value) => update({ type: value as EquipmentType | '' })}
                    options={typeOptions}
                    placeholder={t('fields.typePlaceholder')}
                  />
                </div>
              </div>

              <div className={styles.namePreview}>
                <span className={styles.fieldLabel}>{t('namePreview')}</span>
                <span className={styles.name}>
                  {composeEquipmentName(draft.floor, draft.type) || (
                    <span className={styles.muted}>{t('noName')}</span>
                  )}
                </span>
              </div>

              {TEXT_FIELDS.map((field) => (
                <div key={field} className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor={`equipment-${field}`}>
                    {t(`fields.${field}`)}
                    {uncertain.includes(field) ? (
                      <span className={styles.verify}>{t('verify')}</span>
                    ) : null}
                  </label>
                  <input
                    id={`equipment-${field}`}
                    className={[
                      styles.input,
                      field === 'manufacturer' ? null : styles.identifier,
                      uncertain.includes(field) ? styles.uncertain : null,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    value={draft[field]}
                    onChange={(event) => update({ [field]: event.target.value })}
                    autoCapitalize={field === 'manufacturer' ? 'words' : 'characters'}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              ))}

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="equipment-manufactured">
                  {t('fields.manufactured')}
                  {uncertain.includes('manufactured') ? (
                    <span className={styles.verify}>{t('verify')}</span>
                  ) : null}
                </label>
                <input
                  id="equipment-manufactured"
                  className={[styles.input, styles.identifier].join(' ')}
                  value={draft.manufactured}
                  onChange={(event) => update({ manufactured: event.target.value })}
                  inputMode="numeric"
                  placeholder="2012-05"
                  autoComplete="off"
                />
                {decodedSuggestion ? (
                  <button
                    type="button"
                    className={styles.suggestion}
                    onClick={() => update({ manufactured: decodedSuggestion })}
                  >
                    {t('useDecoded', { date: formatManufactured(decodedSuggestion) })}
                  </button>
                ) : null}
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="equipment-memo">
                  {t('fields.memo')}
                </label>
                <div className={styles.inputWithClear}>
                  <input
                    id="equipment-memo"
                    className={styles.input}
                    value={draft.memo}
                    onChange={(event) => update({ memo: event.target.value })}
                    placeholder={t('fields.memoPlaceholder')}
                    autoComplete="off"
                  />
                  {draft.memo !== '' ? (
                    <button
                      type="button"
                      className={styles.clear}
                      onClick={() => update({ memo: '' })}
                      aria-label={t('clearMemo')}
                    >
                      <CloseIcon size={16} />
                    </button>
                  ) : null}
                </div>
                <div className={styles.chips}>
                  {MEMO_SHORTCUTS.map((shortcut) => {
                    const on = memoHasShortcut(draft.memo, shortcut);
                    return (
                      <button
                        key={shortcut}
                        type="button"
                        className={[styles.chip, on ? styles.chipOn : null]
                          .filter(Boolean)
                          .join(' ')}
                        aria-pressed={on}
                        onClick={() =>
                          update({ memo: toggleMemoShortcut(draft.memo, shortcut) })
                        }
                      >
                        {on ? <CheckIcon size={14} /> : null}
                        {shortcut}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.formActions}>
                <Button onClick={() => void save()} disabled={scan === 'reading'}>
                  {t('save')}
                </Button>
                <Button variant="ghost" onClick={cancel}>
                  {t('cancel')}
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      )}

      <section className={styles.saved}>
        <h2 className={styles.sectionHeading}>{t('listHeading')}</h2>

        {units === undefined ? (
          <div className={styles.loading} aria-busy="true" />
        ) : units.length === 0 ? (
          <p className={styles.empty}>{t('empty')}</p>
        ) : (
          groups.map(([group, members]) => (
            <div key={group} className={styles.group}>
              <h3 className={styles.groupName}>
                {group === '' ? <span className={styles.muted}>{t('noCustomer')}</span> : group}
                <span className={styles.groupCount}>
                  {t('count', { count: members.length })}
                </span>
              </h3>
              <ul className={styles.list}>
                {members.map((unit) => {
                  const name =
                    composeEquipmentName(unit.floor, unit.type) ||
                    unit.manufacturer ||
                    t('noName');
                  const age = ageInYears(unit.manufactured);
                  const facts: [string, string, string][] = [
                    ['name', t('namePreview'), name],
                    ['serial', t('fields.serial'), unit.serial],
                    ['model', t('fields.model'), unit.model],
                    ['manufacturer', t('fields.manufacturer'), unit.manufacturer],
                    ['memo', t('fields.memo'), unit.memo],
                  ];
                  return (
                    <li key={unit.id} className={styles.card}>
                      <div className={styles.cardTop}>
                        <span className={styles.cardName}>{name}</span>
                        {unit.manufactured ? (
                          <span className={styles.cardAge}>
                            {formatManufactured(unit.manufactured)}
                            {age !== null ? ` · ${t('age', { years: age })}` : ''}
                          </span>
                        ) : null}
                      </div>
                      {unit.jobNumber || unit.capturedBy ? (
                        <p className={styles.cardMeta}>
                          {[
                            unit.jobNumber ? t('jobMeta', { number: unit.jobNumber }) : null,
                            unit.capturedBy ? t('capturedBy', { name: unit.capturedBy }) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      ) : null}
                      <dl className={styles.facts}>
                        {facts.map(([key, label, value]) =>
                          value === '' ? null : (
                            <div key={key} className={styles.fact}>
                              <dt>{label}</dt>
                              <dd>{value}</dd>
                              {copyButton(`${unit.id}:${key}`, label, value)}
                            </div>
                          ),
                        )}
                      </dl>
                      <div className={styles.cardActions}>
                        <label className={styles.entered}>
                          <input
                            type="checkbox"
                            checked={unit.enteredInServiceTitanAt !== undefined}
                            onChange={(event) =>
                              void saveEquipment({
                                ...unit,
                                enteredInServiceTitanAt: event.target.checked
                                  ? Date.now()
                                  : undefined,
                              })
                            }
                          />
                          {t('enteredInServiceTitan')}
                        </label>
                        {unit.enteredInServiceTitanAt === undefined ? (
                          <Badge tone="warn" dot>
                            {t('pending')}
                          </Badge>
                        ) : null}
                        <span className={styles.spacer} />
                        {connected && unit.jobNumber ? (
                          <Button
                            size="sm"
                            onClick={() => setSendingId(sendingId === unit.id ? null : unit.id)}
                          >
                            {t('sendToServiceTitan')}
                          </Button>
                        ) : null}
                        <Button size="sm" variant="secondary" onClick={() => edit(unit)}>
                          {t('edit')}
                        </Button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => void deleteEquipment(unit.id)}
                          aria-label={t('delete', { name })}
                        >
                          <TrashIcon size={17} />
                        </button>
                      </div>
                      {sendingId === unit.id ? (
                        <SendToServiceTitan
                          unit={unit}
                          onSent={({ equipmentId, locationId }) =>
                            void markSent(unit, equipmentId, locationId)
                          }
                          onClose={() => setSendingId(null)}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
    </>
  );
}
