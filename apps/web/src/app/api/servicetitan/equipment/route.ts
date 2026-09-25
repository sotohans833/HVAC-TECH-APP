import { z } from 'zod';
import { requireTechnician } from '@/lib/auth/request.server';
import {
  createInstalledEquipment,
  updateInstalledEquipment,
} from '@/lib/servicetitan/client.server';
import { ServiceTitanError, serviceTitanErrorResponse } from '@/lib/servicetitan/errors';

export const runtime = 'nodejs';

const text = z.string().trim().min(1).max(500);

/**
 * Only the fields the technician confirmed on the review screen, and only
 * these five. Unknown keys are rejected rather than passed through, so this
 * route can never be used to change anything else on the record.
 */
const RequestSchema = z.object({
  locationId: z.number().int().positive(),
  equipmentId: z.number().int().positive().nullable(),
  fields: z
    .object({
      name: text.optional(),
      serialNumber: text.optional(),
      model: text.optional(),
      manufacturer: text.optional(),
      memo: text.optional(),
    })
    .strict()
    .refine((fields) => Object.keys(fields).length > 0),
});

/** Creates or updates one installed-equipment record. There is no delete. */
export async function POST(request: Request) {
  const auth = await requireTechnician(request);
  if ('response' in auth) return auth.response;

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'bad-request' }, { status: 400 });
  const { locationId, equipmentId, fields } = parsed.data;

  try {
    let id = equipmentId;
    if (id === null) {
      id = await createInstalledEquipment(locationId, fields);
    } else {
      await updateInstalledEquipment(id, fields);
    }

    // ServiceTitan shows the integration as the author; this line is the
    // record of which technician it actually was.
    console.info(
      JSON.stringify({
        event: equipmentId === null ? 'equipment.created' : 'equipment.updated',
        technician: auth.technician.id,
        locationId,
        equipmentId: id,
        fields: Object.keys(fields),
        at: new Date().toISOString(),
      }),
    );
    return Response.json({ id });
  } catch (error) {
    if (error instanceof ServiceTitanError) return serviceTitanErrorResponse(error);
    throw error;
  }
}
