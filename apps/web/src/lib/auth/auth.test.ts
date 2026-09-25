import { describe, expect, it } from 'vitest';
import { generatePin, hashPin, verifyPin } from './pin.server';
import { SESSION_MAX_AGE_SECONDS, signSession, verifySessionToken } from './session';
import {
  cleanTechnicianName,
  findTechnician,
  parseTechnicians,
  serializeTechnicians,
  technicianIdFor,
} from './technicians';

const SECRET = 'x'.repeat(43);

describe('technician list', () => {
  it('round-trips through the env format', () => {
    const list = [
      { id: 'hans-soto', name: 'Hans Soto', salt: 's1', hash: 'h1' },
      { id: 'maria', name: 'María Pérez', salt: 's2', hash: 'h2' },
    ];
    expect(parseTechnicians(serializeTechnicians(list))).toEqual(list);
  });

  it('skips malformed entries instead of failing the whole list', () => {
    expect(parseTechnicians('bad;hans|Hans|s|h;|No id|s|h')).toEqual([
      { id: 'hans', name: 'Hans', salt: 's', hash: 'h' },
    ]);
    expect(parseTechnicians(undefined)).toEqual([]);
  });

  it('makes typeable login names and avoids collisions', () => {
    expect(technicianIdFor('Hans Soto')).toBe('hans-soto');
    expect(technicianIdFor('José Ñúñez')).toBe('jose-nunez');
    expect(technicianIdFor('Hans Soto', ['hans-soto'])).toBe('hans-soto-2');
    expect(technicianIdFor('!!!')).toBe('tech');
  });

  it('finds a technician regardless of how the login name was typed', () => {
    const list = parseTechnicians('hans-soto|Hans Soto|s|h');
    expect(findTechnician(list, '  Hans-Soto ')?.name).toBe('Hans Soto');
    expect(findTechnician(list, 'someone')).toBeUndefined();
  });

  it('strips the separators out of names', () => {
    expect(cleanTechnicianName(' Hans | Soto;\n')).toBe('Hans Soto');
  });
});

describe('PINs', () => {
  it('generates six digits', () => {
    for (let i = 0; i < 20; i++) expect(generatePin()).toMatch(/^\d{6}$/);
  });

  it('verifies the right PIN and rejects a wrong one', async () => {
    const { salt, hash } = await hashPin('482913');
    expect(await verifyPin('482913', salt, hash)).toBe(true);
    expect(await verifyPin('482914', salt, hash)).toBe(false);
  });

  it('salts every hash', async () => {
    const a = await hashPin('000000');
    const b = await hashPin('000000');
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('session tokens', () => {
  it('carries the technician id', async () => {
    const token = await signSession('hans-soto', SECRET);
    expect(await verifySessionToken(token, SECRET)).toBe('hans-soto');
  });

  it('rejects a token signed with another secret', async () => {
    const token = await signSession('hans-soto', SECRET);
    expect(await verifySessionToken(token, 'y'.repeat(43))).toBeNull();
  });

  it('rejects a token whose body was edited', async () => {
    const token = await signSession('hans-soto', SECRET);
    const [, signature] = token.split('.');
    const forged = btoa(JSON.stringify({ sub: 'boss', exp: 9_999_999_999 }))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    expect(await verifySessionToken(`${forged}.${signature}`, SECRET)).toBeNull();
  });

  it('expires', async () => {
    const issued = Date.now();
    const token = await signSession('hans-soto', SECRET, issued);
    const later = issued + (SESSION_MAX_AGE_SECONDS + 1) * 1000;
    expect(await verifySessionToken(token, SECRET, later)).toBeNull();
  });

  it('rejects garbage and missing values', async () => {
    expect(await verifySessionToken(undefined, SECRET)).toBeNull();
    expect(await verifySessionToken('abc', SECRET)).toBeNull();
    expect(await verifySessionToken('a.b', SECRET)).toBeNull();
    expect(await verifySessionToken(await signSession('x', SECRET), '')).toBeNull();
  });
});
