import { z } from 'zod';
import { EQUIPMENT_TYPES } from './equipment';

/**
 * What a nameplate reading returns.
 *
 * Every field is nullable because a plate in an attic is often faded, bent or
 * half behind a pipe, and a blank the technician fills in is far better than a
 * confident wrong serial going into the customer's record. `uncertain` names
 * the fields the model could read but is not sure of, so the form can ask the
 * technician to double-check exactly those.
 */
export const NameplateReadingSchema = z.object({
  manufacturer: z.string().nullable(),
  model: z.string().nullable(),
  serial: z.string().nullable(),
  type: z.enum(EQUIPMENT_TYPES).nullable(),
  /** `YYYY-MM` or `YYYY`, only when printed on the plate. */
  manufactured: z.string().nullable(),
  uncertain: z.array(z.enum(['manufacturer', 'model', 'serial', 'type', 'manufactured'])),
  /** Set when the photo is not a readable nameplate at all. */
  problem: z.string().nullable(),
});

export type NameplateReading = z.infer<typeof NameplateReadingSchema>;
export type NameplateField = NameplateReading['uncertain'][number];

export const NAMEPLATE_PROMPT = `This is a photo an HVAC technician took of an equipment nameplate (data plate / rating plate) at a customer's home. Read it and fill in the fields.

- manufacturer: the brand as it appears on the plate (e.g. "Lennox", "Carrier", "Rinnai"). If the plate belongs to a brand owned by another company, give the brand shown, not the parent.
- model: the model number, usually labeled M/N, MODEL or MOD. NO. Copy it exactly, including dashes.
- serial: the serial number, usually labeled S/N, SERIAL or SER. NO. Copy it exactly.
- type: what kind of equipment this is, judged from the plate wording and the model number. "evap-coil" covers indoor cased or uncased coils; "heat-pump" is an outdoor unit that heats and cools; "condenser" is a cooling-only outdoor unit.
- manufactured: only if a manufacture date is printed on the plate, as YYYY-MM or YYYY. Do not work it out from the serial number; that is done separately.

Model and serial numbers go into a customer's service record and warranty claims, so a wrong character is worse than a blank. Watch for 0/O, 1/I, 5/S, 8/B and 2/Z. If you can read a value but are not sure of every character, give your best reading and list the field in "uncertain". If you cannot read a value at all, return null for it. If the photo is not a nameplate or is too blurry to read, say so briefly in "problem".`;
