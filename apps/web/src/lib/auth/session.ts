/**
 * The login session: a signed cookie, checked on every page and API call.
 *
 * Signed with HMAC-SHA256 through Web Crypto, which exists both in the
 * middleware's edge runtime and in Node, so pages and API routes check the
 * cookie with the same code. There is no session store: the cookie carries the
 * technician's id and an expiry, and the signature proves the server issued it.
 * Removing a technician from the list ends their session on the next request.
 */

import { findTechnician, parseTechnicians, type Technician } from './technicians';

export const SESSION_COOKIE = 'mf-session';

/** A month: techs log in on a new phone, not every morning. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

interface SessionPayload {
  sub: string;
  exp: number;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signSession(
  technicianId: string,
  secret: string,
  now: number = Date.now(),
): Promise<string> {
  const payload: SessionPayload = {
    sub: technicianId,
    exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    encoder.encode(body),
  );
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/** The technician id in a valid, unexpired token, or null. */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): Promise<string | null> {
  if (!token || !secret) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const signatureBytes = fromBase64Url(signature);
  if (!signatureBytes) return null;
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    signatureBytes,
    encoder.encode(body),
  );
  if (!valid) return null;

  const bodyBytes = fromBase64Url(body);
  if (!bodyBytes) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(bodyBytes)) as Partial<SessionPayload>;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 <= now) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export interface AuthConfig {
  secret: string;
  technicians: Technician[];
}

export function authConfig(): AuthConfig {
  return {
    secret: process.env.MANIFOLD_SESSION_SECRET ?? '',
    technicians: parseTechnicians(process.env.MANIFOLD_TECHNICIANS),
  };
}

/** Login is only possible once at least one technician and a secret exist. */
export function isAuthConfigured(config: AuthConfig = authConfig()): boolean {
  return config.secret.length >= 32 && config.technicians.length > 0;
}

/** The signed-in technician for a cookie value, if they are still on the list. */
export async function technicianForToken(
  token: string | undefined,
  config: AuthConfig = authConfig(),
): Promise<Technician | null> {
  const id = await verifySessionToken(token, config.secret);
  return id ? (findTechnician(config.technicians, id) ?? null) : null;
}
