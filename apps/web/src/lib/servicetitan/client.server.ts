import { ServiceTitanError } from './errors';
import { mockCreateEquipment, mockLookupJob, mockUpdateEquipment } from './mock.server';
import type {
  EquipmentFieldsPatch,
  InstalledEquipment,
  JobLookup,
  ServiceTitanMode,
} from './types';

/**
 * The ServiceTitan API, as far as this app uses it: find a job, read the
 * equipment at its location, create or update installed equipment. Nothing
 * here deletes.
 *
 * Credentials come from the environment and never leave the server. The
 * endpoint paths and field names follow ServiceTitan's v2 API; they are the
 * one part of this file to check against the API reference when the company's
 * credentials first connect (docs/adr/0008).
 */

interface Config {
  tenant: string;
  appKey: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  apiUrl: string;
}

const HOSTS = {
  production: { auth: 'https://auth.servicetitan.io', api: 'https://api.servicetitan.io' },
  integration: {
    auth: 'https://auth-integration.servicetitan.io',
    api: 'https://api-integration.servicetitan.io',
  },
} as const;

function credentials() {
  const { ST_TENANT_ID, ST_APP_KEY, ST_CLIENT_ID, ST_CLIENT_SECRET } = process.env;
  return ST_TENANT_ID && ST_APP_KEY && ST_CLIENT_ID && ST_CLIENT_SECRET
    ? {
        tenant: ST_TENANT_ID,
        appKey: ST_APP_KEY,
        clientId: ST_CLIENT_ID,
        clientSecret: ST_CLIENT_SECRET,
      }
    : null;
}

/**
 * `ST_MODE=mock` uses the demo; `integration` points at ServiceTitan's test
 * environment; otherwise the real one, but only once all four credentials are
 * set. Without them the feature is simply off.
 */
export function serviceTitanMode(): ServiceTitanMode {
  const mode = process.env.ST_MODE;
  if (mode === 'mock') return 'mock';
  if (!credentials()) return 'off';
  return mode === 'integration' ? 'integration' : 'production';
}

function config(): Config {
  const mode = serviceTitanMode();
  const creds = credentials();
  if ((mode !== 'production' && mode !== 'integration') || !creds) {
    throw new ServiceTitanError('off');
  }
  return { ...creds, authUrl: HOSTS[mode].auth, apiUrl: HOSTS[mode].api };
}

let token: { value: string; expiresAt: number; key: string } | null = null;

async function accessToken(cfg: Config): Promise<string> {
  const key = `${cfg.authUrl}|${cfg.clientId}`;
  if (token && token.key === key && token.expiresAt > Date.now()) return token.value;

  const response = await fetch(`${cfg.authUrl}/connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
  });
  if (!response.ok) {
    console.error('ServiceTitan token request failed', response.status);
    throw new ServiceTitanError(
      response.status === 400 || response.status === 401 ? 'auth' : 'upstream',
    );
  }
  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new ServiceTitanError('auth');
  token = {
    value: body.access_token,
    // Refresh a minute early rather than race the expiry mid-request.
    expiresAt: Date.now() + Math.max(60, (body.expires_in ?? 900) - 60) * 1000,
    key,
  };
  return token.value;
}

async function api<T>(
  path: string,
  init: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown } = {},
): Promise<T> {
  const cfg = config();
  const url = `${cfg.apiUrl}${path.replace('{tenant}', encodeURIComponent(cfg.tenant))}`;
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    headers: {
      authorization: `Bearer ${await accessToken(cfg)}`,
      'st-app-key': cfg.appKey,
      ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: init.body === undefined ? null : JSON.stringify(init.body),
  });

  if (response.ok) {
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }
  const detail = await response.text().catch(() => '');
  console.error(
    'ServiceTitan request failed',
    init.method ?? 'GET',
    path,
    response.status,
    detail.slice(0, 500),
  );
  if (response.status === 401) {
    token = null;
    throw new ServiceTitanError('auth');
  }
  if (response.status === 403) throw new ServiceTitanError('forbidden');
  if (response.status === 404) throw new ServiceTitanError('not-found');
  if (response.status === 400 || response.status === 422)
    throw new ServiceTitanError('invalid');
  throw new ServiceTitanError('upstream');
}

interface Page<T> {
  data?: T[];
}

interface RawJob {
  id: number;
  jobNumber?: string;
  number?: string;
  locationId: number;
  customerId?: number;
}

interface RawAddress {
  street?: string;
  unit?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface RawEquipment {
  id: number;
  name?: string | null;
  serialNumber?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  memo?: string | null;
  installedOn?: string | null;
  active?: boolean;
}

function formatAddress(address: RawAddress | undefined): string {
  if (!address) return '';
  const street = [address.street, address.unit].filter(Boolean).join(' ');
  const cityLine = [address.city, [address.state, address.zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return [street, cityLine].filter(Boolean).join(', ');
}

function toInstalledEquipment(raw: RawEquipment): InstalledEquipment {
  return {
    id: raw.id,
    name: raw.name ?? '',
    serialNumber: raw.serialNumber ?? '',
    model: raw.model ?? '',
    manufacturer: raw.manufacturer ?? '',
    memo: raw.memo ?? '',
    installedOn: raw.installedOn ?? null,
  };
}

async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ServiceTitanError && error.code === 'not-found') return null;
    throw error;
  }
}

/**
 * Finds a job by what the technician typed: the job number shown in the
 * ServiceTitan app first, then, for a number copied out of a link, a job id or
 * an appointment id.
 */
async function findJob(query: string): Promise<RawJob | null> {
  const byNumber = await api<Page<RawJob>>(
    `/jpm/v2/tenant/{tenant}/jobs?number=${encodeURIComponent(query)}&pageSize=1`,
  );
  const job = byNumber.data?.[0];
  if (job) return job;
  if (!/^\d+$/.test(query)) return null;

  const byId = await orNull(api<RawJob>(`/jpm/v2/tenant/{tenant}/jobs/${query}`));
  if (byId) return byId;

  const appointment = await orNull(
    api<{ jobId?: number }>(`/jpm/v2/tenant/{tenant}/appointments/${query}`),
  );
  return appointment?.jobId
    ? orNull(api<RawJob>(`/jpm/v2/tenant/{tenant}/jobs/${appointment.jobId}`))
    : null;
}

export async function lookupJob(query: string): Promise<JobLookup | null> {
  if (serviceTitanMode() === 'mock') return mockLookupJob(query);

  const job = await findJob(query.trim());
  if (!job) return null;

  const [location, customer, equipment] = await Promise.all([
    api<{ id: number; name?: string; address?: RawAddress }>(
      `/crm/v2/tenant/{tenant}/locations/${job.locationId}`,
    ),
    job.customerId
      ? orNull(api<{ name?: string }>(`/crm/v2/tenant/{tenant}/customers/${job.customerId}`))
      : Promise.resolve(null),
    api<Page<RawEquipment>>(
      `/equipmentsystems/v2/tenant/{tenant}/installed-equipment?locationIds=${job.locationId}&pageSize=200`,
    ),
  ]);

  return {
    job: { id: job.id, number: job.jobNumber ?? job.number ?? String(job.id) },
    location: {
      id: location.id,
      name: location.name ?? '',
      address: formatAddress(location.address),
    },
    customerName: customer?.name ?? null,
    equipment: (equipment.data ?? [])
      .filter((unit) => unit.active !== false)
      .map(toInstalledEquipment),
  };
}

export async function createInstalledEquipment(
  locationId: number,
  fields: EquipmentFieldsPatch,
): Promise<number> {
  if (serviceTitanMode() === 'mock') return mockCreateEquipment(locationId, fields);
  const created = await api<{ id: number }>(
    '/equipmentsystems/v2/tenant/{tenant}/installed-equipment',
    {
      method: 'POST',
      body: { locationId, ...fields },
    },
  );
  return created.id;
}

export async function updateInstalledEquipment(
  id: number,
  fields: EquipmentFieldsPatch,
): Promise<void> {
  if (serviceTitanMode() === 'mock') return mockUpdateEquipment(id, fields);
  await api(`/equipmentsystems/v2/tenant/{tenant}/installed-equipment/${id}`, {
    method: 'PATCH',
    body: fields,
  });
}
