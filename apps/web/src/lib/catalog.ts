import type { PartIconId } from '@manifold/ui';

/**
 * The part catalog.
 *
 * Two things about the shape of this data are load-bearing for the product:
 *
 * 1. Names are bilingual *records*, not translation keys. The technician picks
 *    "Capacitor de marcha" and the customer reads "run capacitor" — input
 *    language and output language are deliberately different. That inversion is
 *    the product, not an i18n afterthought.
 *
 * 2. `invoicePhrase` is written once, by hand, in the register a customer
 *    expects on a bill. Nothing generates it at runtime, so no part number and
 *    no price can ever be invented. See docs/adr/0002.
 */

export type CatalogCategory =
  'electrical' | 'refrigerant' | 'airflow' | 'combustion' | 'controls';

export type WorkAction = 'replaced' | 'repaired' | 'cleaned' | 'tested';

export interface CatalogItem {
  id: string;
  icon: PartIconId;
  category: CatalogCategory;
  /** UI label, in the technician's language. */
  label: { en: string; es: string };
  /** Common size or rating, shown under the label. Not a price. */
  spec?: string;
  /** Customer-facing noun used to build the invoice line, English only. */
  invoicePhrase: string;
  /** Actions that make sense for this part, first one is the default. */
  actions: readonly WorkAction[];
}

export const CATEGORY_LABELS: Record<CatalogCategory, { en: string; es: string }> = {
  electrical: { en: 'Electrical', es: 'Eléctrico' },
  refrigerant: { en: 'Refrigerant', es: 'Refrigerante' },
  airflow: { en: 'Airflow', es: 'Flujo de aire' },
  combustion: { en: 'Combustion', es: 'Combustión' },
  controls: { en: 'Controls', es: 'Controles' },
};

export const CATALOG: readonly CatalogItem[] = [
  // ---- electrical ----
  {
    id: 'run-capacitor',
    icon: 'capacitor',
    category: 'electrical',
    label: { en: 'Run capacitor', es: 'Capacitor de marcha' },
    spec: '45/5 MFD',
    invoicePhrase: 'dual run capacitor',
    actions: ['replaced', 'tested'],
  },
  {
    id: 'contactor',
    icon: 'contactor',
    category: 'electrical',
    label: { en: 'Contactor', es: 'Contactor' },
    spec: '2 pole 30A',
    invoicePhrase: 'condenser contactor',
    actions: ['replaced', 'cleaned', 'tested'],
  },
  {
    id: 'transformer',
    icon: 'transformer',
    category: 'electrical',
    label: { en: 'Transformer', es: 'Transformador' },
    spec: '24V 40VA',
    invoicePhrase: 'low-voltage transformer',
    actions: ['replaced', 'tested'],
  },
  {
    id: 'control-board',
    icon: 'control-board',
    category: 'electrical',
    label: { en: 'Control board', es: 'Tarjeta de control' },
    invoicePhrase: 'integrated furnace control board',
    actions: ['replaced', 'tested'],
  },
  {
    id: 'condenser-fan-motor',
    icon: 'condenser-fan',
    category: 'electrical',
    label: { en: 'Condenser fan motor', es: 'Motor del condensador' },
    spec: '1/4 HP',
    invoicePhrase: 'condenser fan motor',
    actions: ['replaced', 'tested'],
  },
  {
    id: 'blower-motor',
    icon: 'blower-motor',
    category: 'electrical',
    label: { en: 'Blower motor', es: 'Motor del soplador' },
    spec: 'ECM',
    invoicePhrase: 'indoor blower motor',
    actions: ['replaced', 'cleaned', 'tested'],
  },
  {
    id: 'wiring',
    icon: 'electrical',
    category: 'electrical',
    label: { en: 'Wiring / connections', es: 'Cableado / conexiones' },
    invoicePhrase: 'damaged wiring and connections',
    actions: ['repaired', 'tested'],
  },

  // ---- refrigerant ----
  {
    id: 'compressor',
    icon: 'compressor',
    category: 'refrigerant',
    label: { en: 'Compressor', es: 'Compresor' },
    invoicePhrase: 'compressor',
    actions: ['replaced', 'tested'],
  },
  {
    id: 'txv',
    icon: 'expansion-valve',
    category: 'refrigerant',
    label: { en: 'Expansion valve (TXV)', es: 'Válvula de expansión (TXV)' },
    spec: 'R-410A',
    invoicePhrase: 'thermostatic expansion valve',
    actions: ['replaced', 'tested'],
  },
  {
    id: 'filter-drier',
    icon: 'filter-drier',
    category: 'refrigerant',
    label: { en: 'Filter drier', es: 'Filtro secador' },
    invoicePhrase: 'liquid line filter drier',
    actions: ['replaced'],
  },
  {
    id: 'refrigerant-charge',
    icon: 'refrigerant-tank',
    category: 'refrigerant',
    label: { en: 'Refrigerant charge', es: 'Carga de refrigerante' },
    spec: 'per lb',
    invoicePhrase: 'refrigerant charge',
    actions: ['repaired', 'tested'],
  },
  {
    id: 'condenser-coil',
    icon: 'evaporator-coil',
    category: 'refrigerant',
    label: { en: 'Condenser coil', es: 'Serpentín del condensador' },
    invoicePhrase: 'condenser coil',
    actions: ['cleaned', 'replaced'],
  },

  // ---- airflow ----
  {
    id: 'air-filter',
    icon: 'air-filter',
    category: 'airflow',
    label: { en: 'Air filter', es: 'Filtro de aire' },
    spec: '20x25x1',
    invoicePhrase: 'return air filter',
    actions: ['replaced'],
  },
  {
    id: 'evaporator-coil',
    icon: 'evaporator-coil',
    category: 'airflow',
    label: { en: 'Evaporator coil', es: 'Serpentín evaporador' },
    invoicePhrase: 'evaporator coil',
    actions: ['cleaned', 'replaced'],
  },
  {
    id: 'condensate-drain',
    icon: 'condensate-drain',
    category: 'airflow',
    label: { en: 'Condensate drain', es: 'Drenaje de condensado' },
    invoicePhrase: 'condensate drain line',
    actions: ['cleaned', 'repaired'],
  },
  {
    id: 'ductwork',
    icon: 'ductwork',
    category: 'airflow',
    label: { en: 'Ductwork', es: 'Ductos' },
    invoicePhrase: 'supply ductwork',
    actions: ['repaired', 'cleaned'],
  },

  // ---- combustion ----
  {
    id: 'igniter',
    icon: 'igniter',
    category: 'combustion',
    label: { en: 'Hot surface igniter', es: 'Ignitor de superficie' },
    invoicePhrase: 'hot surface igniter',
    actions: ['replaced', 'tested'],
  },
  {
    id: 'flame-sensor',
    icon: 'flame-sensor',
    category: 'combustion',
    label: { en: 'Flame sensor', es: 'Sensor de flama' },
    invoicePhrase: 'flame sensor',
    actions: ['cleaned', 'replaced'],
  },
  {
    id: 'gas-valve',
    icon: 'gas-valve',
    category: 'combustion',
    label: { en: 'Gas valve', es: 'Válvula de gas' },
    invoicePhrase: 'gas valve',
    actions: ['replaced', 'tested'],
  },
  {
    id: 'pressure-switch',
    icon: 'pressure-switch',
    category: 'combustion',
    label: { en: 'Pressure switch', es: 'Interruptor de presión' },
    invoicePhrase: 'pressure switch',
    actions: ['replaced', 'tested'],
  },

  // ---- controls ----
  {
    id: 'thermostat',
    icon: 'thermostat',
    category: 'controls',
    label: { en: 'Thermostat', es: 'Termostato' },
    invoicePhrase: 'thermostat',
    actions: ['replaced', 'tested'],
  },
  {
    id: 'labor',
    icon: 'labor',
    category: 'controls',
    label: { en: 'Diagnostic labor', es: 'Mano de obra' },
    spec: 'per hour',
    invoicePhrase: 'diagnostic labor',
    actions: ['tested'],
  },
];

export const CATALOG_BY_ID = new Map(CATALOG.map((item) => [item.id, item]));

export const CATEGORY_ORDER: readonly CatalogCategory[] = [
  'electrical',
  'refrigerant',
  'airflow',
  'combustion',
  'controls',
];
