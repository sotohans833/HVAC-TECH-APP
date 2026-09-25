/**
 * Manages who can sign in. Run from the repo root:
 *
 *   pnpm tech add Juan Perez     → creates a login and prints its PIN once
 *   pnpm tech list
 *   pnpm tech reset-pin juan-perez
 *   pnpm tech remove juan-perez
 *
 * Writes MANIFOLD_TECHNICIANS (and MANIFOLD_SESSION_SECRET the first time)
 * into apps/web/.env.local. The dev server picks the change up on its own.
 * For a hosted deployment, copy those two values into the host's settings.
 */

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePin, hashPin } from '../src/lib/auth/pin.server';
import {
  cleanTechnicianName,
  findTechnician,
  parseTechnicians,
  serializeTechnicians,
  technicianIdFor,
  type Technician,
} from '../src/lib/auth/technicians';

const ENV_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local');

function readEnv(): string[] {
  return existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, 'utf8')
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
    : [];
}

function getVar(lines: string[], name: string): string | undefined {
  const line = lines.find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).replace(/^"|"$/g, '');
}

function setVar(lines: string[], name: string, value: string): string[] {
  const entry = `${name}="${value}"`;
  const index = lines.findIndex((l) => l.startsWith(`${name}=`));
  if (index === -1) {
    const trimmed = [...lines];
    while (trimmed.length > 0 && trimmed.at(-1) === '') trimmed.pop();
    return [...trimmed, entry, ''];
  }
  return lines.map((l, i) => (i === index ? entry : l));
}

function save(lines: string[], technicians: Technician[]): void {
  let next = setVar(lines, 'MANIFOLD_TECHNICIANS', serializeTechnicians(technicians));
  if ((getVar(next, 'MANIFOLD_SESSION_SECRET') ?? '').length < 32) {
    next = setVar(next, 'MANIFOLD_SESSION_SECRET', randomBytes(32).toString('base64url'));
  }
  writeFileSync(ENV_FILE, next.join('\n'));
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const lines = readEnv();
  const technicians = parseTechnicians(getVar(lines, 'MANIFOLD_TECHNICIANS'));

  switch (command) {
    case 'add': {
      const name = cleanTechnicianName(args.join(' '));
      if (!name) fail('Escribe el nombre: pnpm tech add Juan Perez');
      const id = technicianIdFor(
        name,
        technicians.map((t) => t.id),
      );
      const pin = generatePin();
      save(lines, [...technicians, { id, name, ...(await hashPin(pin)) }]);
      console.log(`\nTécnico agregado: ${name}`);
      console.log(`  Usuario: ${id}`);
      console.log(`  PIN:     ${pin}`);
      console.log('\nEl PIN solo se muestra esta vez. Dáselo al técnico en persona.\n');
      return;
    }

    case 'reset-pin': {
      const technician = findTechnician(technicians, args[0] ?? '');
      if (!technician)
        fail(`No existe el usuario "${args[0] ?? ''}". Mira la lista: pnpm tech list`);
      const pin = generatePin();
      const hashed = await hashPin(pin);
      save(
        lines,
        technicians.map((t) => (t.id === technician.id ? { ...t, ...hashed } : t)),
      );
      console.log(`\nPIN nuevo para ${technician.name} (${technician.id}): ${pin}\n`);
      return;
    }

    case 'remove': {
      const technician = findTechnician(technicians, args[0] ?? '');
      if (!technician)
        fail(`No existe el usuario "${args[0] ?? ''}". Mira la lista: pnpm tech list`);
      save(
        lines,
        technicians.filter((t) => t.id !== technician.id),
      );
      console.log(`\n${technician.name} ya no puede entrar. Su sesión se cierra sola.\n`);
      return;
    }

    case 'list': {
      if (technicians.length === 0) {
        console.log('\nNo hay técnicos. Agrega uno: pnpm tech add Juan Perez\n');
        return;
      }
      console.log('');
      for (const t of technicians) console.log(`  ${t.id.padEnd(24)} ${t.name}`);
      console.log('');
      return;
    }

    default:
      console.log(
        '\nUso:\n  pnpm tech add Juan Perez\n  pnpm tech list\n  pnpm tech reset-pin juan-perez\n  pnpm tech remove juan-perez\n',
      );
  }
}

void main();
