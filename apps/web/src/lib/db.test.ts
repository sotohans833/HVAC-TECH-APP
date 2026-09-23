import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createJob,
  db,
  deleteEquipment,
  deleteJob,
  findOpenDraft,
  getEquipment,
  getJob,
  jobPartCount,
  listEquipment,
  listJobs,
  saveEquipment,
  saveJob,
  type Job,
} from './db';
import { createEquipment } from './equipment';

async function seed(overrides: Partial<Job> = {}): Promise<Job> {
  const job = { ...createJob(), ...overrides };
  await saveJob(job);
  return job;
}

beforeEach(async () => {
  await db().jobs.clear();
});

describe('job storage', () => {
  it('round-trips a job through IndexedDB', async () => {
    const job = await seed({
      customer: '414 Willow Bend',
      unit: 'Goodman GSX140361',
      lines: [
        { itemId: 'contactor', quantity: 1, action: 'replaced', causeId: 'burned-contacts' },
      ],
    });

    const stored = await getJob(job.id);
    expect(stored?.customer).toBe('414 Willow Bend');
    expect(stored?.lines).toHaveLength(1);
    expect(stored?.lines[0]?.causeId).toBe('burned-contacts');
  });

  it('stamps updatedAt on every save so ordering reflects real activity', async () => {
    const job = await seed();
    const first = await getJob(job.id);

    await new Promise((resolve) => setTimeout(resolve, 2));
    await saveJob({ ...job, customer: 'Edited' });
    const second = await getJob(job.id);

    expect(second?.updatedAt).toBeGreaterThan(first?.updatedAt ?? 0);
  });

  it('lists jobs newest first', async () => {
    const older = await seed({ customer: 'Older', updatedAt: 1_000 });
    const newer = await seed({ customer: 'Newer', updatedAt: 2_000 });

    // saveJob restamps updatedAt, so write the intended order directly.
    await db().jobs.update(older.id, { updatedAt: 1_000 });
    await db().jobs.update(newer.id, { updatedAt: 2_000 });

    const jobs = await listJobs();
    expect(jobs.map((job) => job.customer)).toEqual(['Newer', 'Older']);
  });

  it('respects the list limit', async () => {
    await Promise.all([seed(), seed(), seed()]);
    expect(await listJobs(2)).toHaveLength(2);
  });

  it('deletes a job', async () => {
    const job = await seed();
    await deleteJob(job.id);
    expect(await getJob(job.id)).toBeUndefined();
  });
});

describe('finding the open draft', () => {
  it('returns nothing when the technician has no work in progress', async () => {
    expect(await findOpenDraft()).toBeUndefined();
  });

  it('ignores completed jobs', async () => {
    await seed({ status: 'completed', customer: 'Finished' });
    expect(await findOpenDraft()).toBeUndefined();
  });

  it('returns the most recently touched draft when more than one exists', async () => {
    const stale = await seed({ customer: 'Stale' });
    const live = await seed({ customer: 'Live' });
    await db().jobs.update(stale.id, { updatedAt: 1_000 });
    await db().jobs.update(live.id, { updatedAt: 2_000 });

    expect((await findOpenDraft())?.customer).toBe('Live');
  });
});

describe('jobPartCount', () => {
  it('sums quantities rather than counting rows', () => {
    const job: Job = {
      ...createJob(),
      lines: [
        { itemId: 'air-filter', quantity: 3, action: 'replaced' },
        { itemId: 'contactor', quantity: 1, action: 'replaced' },
      ],
    };
    expect(jobPartCount(job)).toBe(4);
  });
});

describe('equipment storage', () => {
  beforeEach(async () => {
    await db().equipment.clear();
  });

  it('round-trips a piece of equipment', async () => {
    const unit = {
      ...createEquipment('414 Willow Bend'),
      floor: '2nd-floor' as const,
      type: 'furnace' as const,
      manufacturer: 'Lennox',
      model: 'EL296UH070XV36B-02',
      serial: '5912E21686',
      memo: '3rd floor attic walk in',
    };
    await saveEquipment(unit);

    const stored = await getEquipment(unit.id);
    expect(stored?.serial).toBe('5912E21686');
    expect(stored?.floor).toBe('2nd-floor');
  });

  it('lists equipment newest first and deletes it', async () => {
    const older = createEquipment('A');
    const newer = createEquipment('B');
    await saveEquipment(older);
    await saveEquipment(newer);
    await db().equipment.update(older.id, { updatedAt: 1_000 });
    await db().equipment.update(newer.id, { updatedAt: 2_000 });

    expect((await listEquipment()).map((unit) => unit.customer)).toEqual(['B', 'A']);

    await deleteEquipment(older.id);
    expect(await listEquipment()).toHaveLength(1);
  });
});
