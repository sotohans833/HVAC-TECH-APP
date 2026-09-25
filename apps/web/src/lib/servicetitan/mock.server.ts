import { ServiceTitanError } from './errors';
import type { EquipmentFieldsPatch, InstalledEquipment, JobLookup } from './types';

/**
 * A stand-in ServiceTitan for trying the whole flow before the company's
 * credentials exist (ST_MODE=mock). One demo job, seeded with the equipment
 * list from a real location, kept in memory so edits show up on the next
 * lookup and vanish on restart. Nothing here touches the real ServiceTitan.
 */

interface MockState {
  nextId: number;
  equipment: InstalledEquipment[];
}

const DEMO_JOB = { id: 75907463, number: '75907463' };
const DEMO_LOCATION = {
  id: 900001,
  name: 'DEMO — Cliente de prueba',
  address: '100 Demo St, Houston, TX 77001',
};

function seed(): MockState {
  const rows: [string, string, string, string, string, string | null][] = [
    [
      '2nd floor condenser',
      '5812E09462',
      'XC17-036-230-04',
      'Lennox',
      'Right side',
      '2024-05-16',
    ],
    ['Tankless water heater', 'RK. UA-141053', 'RE199i', 'Rinnai', '', '2020-05-16'],
    [
      '2nd floor furnace',
      '5912E21686',
      'EL296UH070XV36B - 02',
      'Lennox',
      '3rd floor attic walk in',
      '2012-05-16',
    ],
    [
      '2nd floor evap coil',
      '6012008677',
      'CH33 - 368 - 2F-3',
      'Lennox',
      '3rd floor attic walk in',
      '2012-05-16',
    ],
    ['Downstairs condenser', '5822H05247', 'EL16XC1-024-230A01', 'Lennox', 'Right side', null],
    [
      'Downstairs furnace',
      '5922H32217',
      'EL296UH045XV36B-09',
      'Lennox',
      'Crawlspace back',
      null,
    ],
    [
      'Downstairs evaporator coil',
      '1522H52662',
      'CHX35-24A-6F-10',
      'Lennox',
      'Crawlspace back',
      null,
    ],
  ];
  return {
    nextId: 5_000_008,
    equipment: rows.map(([name, serialNumber, model, manufacturer, memo, installedOn], i) => ({
      id: 5_000_001 + i,
      name,
      serialNumber,
      model,
      manufacturer,
      memo,
      installedOn,
    })),
  };
}

// On globalThis so dev-server hot reloads keep the demo edits.
const store = globalThis as typeof globalThis & { __manifoldMockServiceTitan?: MockState };
function state(): MockState {
  store.__manifoldMockServiceTitan ??= seed();
  return store.__manifoldMockServiceTitan;
}

export async function mockLookupJob(query: string): Promise<JobLookup | null> {
  if (query.trim() !== DEMO_JOB.number) return null;
  return {
    job: DEMO_JOB,
    location: DEMO_LOCATION,
    customerName: 'DEMO',
    equipment: state().equipment.map((unit) => ({ ...unit })),
  };
}

export async function mockCreateEquipment(
  locationId: number,
  fields: EquipmentFieldsPatch,
): Promise<number> {
  if (locationId !== DEMO_LOCATION.id) throw new ServiceTitanError('not-found');
  const s = state();
  const unit: InstalledEquipment = {
    id: s.nextId++,
    name: fields.name ?? '',
    serialNumber: fields.serialNumber ?? '',
    model: fields.model ?? '',
    manufacturer: fields.manufacturer ?? '',
    memo: fields.memo ?? '',
    installedOn: null,
  };
  s.equipment.push(unit);
  return unit.id;
}

export async function mockUpdateEquipment(
  id: number,
  fields: EquipmentFieldsPatch,
): Promise<void> {
  const unit = state().equipment.find((candidate) => candidate.id === id);
  if (!unit) throw new ServiceTitanError('not-found');
  for (const [field, value] of Object.entries(fields)) {
    if (value !== undefined) unit[field as keyof EquipmentFieldsPatch] = value;
  }
}
