import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createInstalledEquipment,
  lookupJob,
  serviceTitanMode,
  updateInstalledEquipment,
} from './client.server';
import { ServiceTitanError } from './errors';

const ENV = {
  ST_TENANT_ID: '123456',
  ST_APP_KEY: 'app-key',
  ST_CLIENT_ID: 'cid.abc',
  ST_CLIENT_SECRET: 'secret',
};

type Handler = (url: URL, init: RequestInit) => Response | undefined;

let calls: { url: URL; init: RequestInit }[] = [];

function stubFetch(handler: Handler) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(input);
      calls.push({ url, init });
      if (url.pathname === '/connect/token') {
        return Response.json({ access_token: 'tok', expires_in: 900 });
      }
      return handler(url, init) ?? new Response('not found', { status: 404 });
    }),
  );
}

beforeEach(() => {
  calls = [];
  for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value);
  // A distinct client id per test keeps the cached token from leaking across.
  vi.stubEnv('ST_CLIENT_ID', `cid.${Math.random()}`);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('serviceTitanMode', () => {
  it('is off until all four credentials are set', () => {
    vi.stubEnv('ST_APP_KEY', '');
    expect(serviceTitanMode()).toBe('off');
  });

  it('defaults to production and honours integration and mock', () => {
    expect(serviceTitanMode()).toBe('production');
    vi.stubEnv('ST_MODE', 'integration');
    expect(serviceTitanMode()).toBe('integration');
    vi.stubEnv('ST_MODE', 'mock');
    expect(serviceTitanMode()).toBe('mock');
  });
});

describe('lookupJob', () => {
  it('finds a job by number and gathers its location and equipment', async () => {
    stubFetch((url) => {
      if (
        url.pathname === '/jpm/v2/tenant/123456/jobs' &&
        url.searchParams.get('number') === '4521'
      ) {
        return Response.json({
          data: [{ id: 77, jobNumber: '4521', locationId: 9, customerId: 5 }],
        });
      }
      if (url.pathname === '/crm/v2/tenant/123456/locations/9') {
        return Response.json({
          id: 9,
          name: 'Smith Residence',
          address: { street: '414 Willow Bend', city: 'Houston', state: 'TX', zip: '77001' },
        });
      }
      if (url.pathname === '/crm/v2/tenant/123456/customers/5') {
        return Response.json({ name: 'John Smith' });
      }
      if (url.pathname === '/equipmentsystems/v2/tenant/123456/installed-equipment') {
        expect(url.searchParams.get('locationIds')).toBe('9');
        return Response.json({
          data: [
            {
              id: 1,
              name: '2nd floor furnace',
              serialNumber: '5912E21686',
              model: null,
              active: true,
            },
            { id: 2, name: 'Old unit', active: false },
          ],
        });
      }
      return undefined;
    });

    const job = await lookupJob('4521');
    expect(job).toEqual({
      job: { id: 77, number: '4521' },
      location: {
        id: 9,
        name: 'Smith Residence',
        address: '414 Willow Bend, Houston, TX 77001',
      },
      customerName: 'John Smith',
      equipment: [
        {
          id: 1,
          name: '2nd floor furnace',
          serialNumber: '5912E21686',
          model: '',
          manufacturer: '',
          memo: '',
          installedOn: null,
        },
      ],
    });

    const apiCall = calls.find((call) => call.url.pathname.startsWith('/jpm'));
    const headers = apiCall?.init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer tok');
    expect(headers['st-app-key']).toBe('app-key');
    expect(apiCall?.url.origin).toBe('https://api.servicetitan.io');
  });

  it('falls back to an appointment id copied from a link', async () => {
    stubFetch((url) => {
      if (url.pathname === '/jpm/v2/tenant/123456/jobs') return Response.json({ data: [] });
      if (url.pathname === '/jpm/v2/tenant/123456/appointments/75907463') {
        return Response.json({ id: 75907463, jobId: 88 });
      }
      if (url.pathname === '/jpm/v2/tenant/123456/jobs/88') {
        return Response.json({ id: 88, jobNumber: '4600', locationId: 3 });
      }
      if (url.pathname === '/crm/v2/tenant/123456/locations/3') return Response.json({ id: 3 });
      if (url.pathname.endsWith('/installed-equipment')) return Response.json({ data: [] });
      return undefined;
    });

    const job = await lookupJob('75907463');
    expect(job?.job).toEqual({ id: 88, number: '4600' });
    expect(job?.customerName).toBeNull();
  });

  it('returns null when nothing matches', async () => {
    stubFetch((url) =>
      url.pathname === '/jpm/v2/tenant/123456/jobs' ? Response.json({ data: [] }) : undefined,
    );
    expect(await lookupJob('999')).toBeNull();
  });

  it('reports a missing scope as forbidden', async () => {
    stubFetch(() => new Response('nope', { status: 403 }));
    await expect(lookupJob('1')).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('reports bad credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('invalid_client', { status: 400 })),
    );
    await expect(lookupJob('1')).rejects.toBeInstanceOf(ServiceTitanError);
    await expect(lookupJob('1')).rejects.toMatchObject({ code: 'auth' });
  });
});

describe('writing equipment', () => {
  it('creates at the location with only the given fields', async () => {
    stubFetch((url, init) =>
      url.pathname.endsWith('/installed-equipment') && init.method === 'POST'
        ? Response.json({ id: 501 })
        : undefined,
    );
    expect(
      await createInstalledEquipment(9, { name: 'Attic air handler', serialNumber: 'X1' }),
    ).toBe(501);
    const post = calls.find(
      (call) => call.init.method === 'POST' && !call.url.pathname.includes('token'),
    );
    expect(JSON.parse(String(post?.init.body))).toEqual({
      locationId: 9,
      name: 'Attic air handler',
      serialNumber: 'X1',
    });
  });

  it('patches an existing record by id', async () => {
    stubFetch((url, init) =>
      url.pathname === '/equipmentsystems/v2/tenant/123456/installed-equipment/501' &&
      init.method === 'PATCH'
        ? new Response(null, { status: 204 })
        : undefined,
    );
    await updateInstalledEquipment(501, { memo: 'Attic · Mfd 05/2012' });
    const patch = calls.find((call) => call.init.method === 'PATCH');
    expect(JSON.parse(String(patch?.init.body))).toEqual({ memo: 'Attic · Mfd 05/2012' });
  });
});

describe('mock mode', () => {
  it('serves the demo job and keeps edits', async () => {
    vi.stubEnv('ST_MODE', 'mock');
    stubFetch(() => {
      throw new Error('mock mode must not call the network');
    });
    const job = await lookupJob('75907463');
    expect(job?.equipment).toHaveLength(7);

    const furnace = job?.equipment.find((unit) => unit.name === '2nd floor furnace');
    await updateInstalledEquipment(furnace?.id ?? 0, { memo: 'Attic · Mfd 05/2012' });
    const id = await createInstalledEquipment(job?.location.id ?? 0, {
      name: 'Attic air handler',
    });

    const again = await lookupJob('75907463');
    expect(again?.equipment.find((unit) => unit.id === furnace?.id)?.memo).toBe(
      'Attic · Mfd 05/2012',
    );
    expect(again?.equipment.find((unit) => unit.id === id)?.name).toBe('Attic air handler');
    expect(await lookupJob('1')).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
