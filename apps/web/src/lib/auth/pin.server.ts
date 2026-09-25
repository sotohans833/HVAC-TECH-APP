import { randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 32;

/** Six digits: quick to type with gloves, and guessing is capped by lockout. */
export function generatePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function hashPin(pin: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(pin, salt, KEY_LENGTH);
  return { salt: salt.toString('base64url'), hash: hash.toString('base64url') };
}

export async function verifyPin(pin: string, salt: string, hash: string): Promise<boolean> {
  const expected = Buffer.from(hash, 'base64url');
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await scryptAsync(pin, Buffer.from(salt, 'base64url'), KEY_LENGTH);
  return timingSafeEqual(actual, expected);
}
