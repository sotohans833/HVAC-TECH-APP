import type { ReactElement } from 'react';
import { IconBase, type IconBaseProps } from './IconBase';

/*
 * The part icon set.
 *
 * These are drawn as schematic symbols rather than illustrations — a contactor
 * reads as a coil under a set of contacts, a TXV reads as the two opposed
 * triangles of a valve. That is deliberate: it is the same visual language the
 * technician already reads on the wiring diagram taped inside the unit door, so
 * the grid is recognizable at a glance without anyone having to learn it.
 *
 * Icons are addressed by id because the part catalog is data. A catalog record
 * carries `icon: PartIconId`, which keeps the taxonomy in one place and makes an
 * unknown id a compile error instead of a blank tile in the field.
 */

const paths = {
  // ---- electrical ----
  capacitor: (
    <>
      <rect x="6.5" y="6" width="11" height="15" rx="1.6" />
      <path d="M9.6 6V3.4M14.4 6V3.4" />
      <path d="M6.5 10h11" />
      <path d="M10.2 15.4h3.6M12 13.6v3.6" />
    </>
  ),
  contactor: (
    <>
      <rect x="3.4" y="4.4" width="17.2" height="15.2" rx="2" />
      <path d="M8 7.4v2.6M16 7.4v2.6" />
      <path d="M6.9 11.6h10.2" />
      <rect x="9" y="14.2" width="6" height="3.4" rx="0.6" />
    </>
  ),
  transformer: (
    <>
      <path d="M10.7 4.6v14.8M13.3 4.6v14.8" />
      <path d="M8.6 6.4q-4 2.5 0 5 -4 2.5 0 5" />
      <path d="M15.4 6.4q4 2.5 0 5 4 2.5 0 5" />
    </>
  ),
  'control-board': (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <rect x="6.8" y="8.4" width="6.4" height="5.2" rx="0.8" />
      <path d="M16 8.8h2.6M16 11.4h2.6M16 14h2.6" />
      <path d="M6.8 17.2h8.6" />
      <circle cx="6.2" cy="6.2" r="0.85" />
    </>
  ),
  electrical: <path d="M13.4 2.6 5.2 13.6h5.9l-1.5 7.8 8.2-11h-5.9z" />,
  'pressure-switch': (
    <>
      <circle cx="8" cy="12" r="5.6" />
      <path d="M8 12l2.7-2.7" />
      <path d="M14.4 14.6h1.9M20.1 14.6h1.5" />
      <path d="M16.3 14.6 20.1 11.4" />
    </>
  ),
  motor: (
    <>
      <circle cx="10.4" cy="12" r="6.6" />
      <path d="M17 12h4.2" />
      <path d="M7.8 14.6V9.4l2.6 3.1 2.6-3.1v5.2" />
    </>
  ),

  // ---- refrigerant side ----
  compressor: (
    <>
      <path d="M5.2 19.8v-5.6a6.8 6.8 0 0 1 13.6 0v5.6z" />
      <path d="M3.4 19.8h17.2" />
      <path d="M8.2 11.6h7.6" />
      <path d="M6.6 9 4.2 6.4M17.4 9l2.4-2.6" />
    </>
  ),
  'expansion-valve': (
    <>
      <path d="M4.4 10.6v6.8L11.6 14z" />
      <path d="M19.6 10.6v6.8L12.4 14z" />
      <path d="M12 14V9.6" />
      <circle cx="12" cy="6.9" r="2.5" />
    </>
  ),
  'filter-drier': (
    <>
      <rect x="6" y="9" width="12" height="6" rx="3" />
      <path d="M2.4 12H6M18 12h3.6" />
      <path d="M9.6 10.2v3.6M12 10.2v3.6M14.4 10.2v3.6" />
    </>
  ),
  'evaporator-coil': (
    <>
      <g opacity="0.45">
        <path d="M5 5.6v12.8M8.5 5.6v12.8M12 5.6v12.8M15.5 5.6v12.8M19 5.6v12.8" />
      </g>
      <path d="M3 8.6h16.4a2.1 2.1 0 0 1 0 4.2H4.6a2.1 2.1 0 0 0 0 4.2H21" />
    </>
  ),
  'condenser-fan': (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="1.7" />
      <path d="M12 10.3c0-3.4 1.5-4.9 3.6-4.3 1.8.5 2.2 2.6 1 3.9-1.1 1.2-2.8 1.3-4.6.4" />
      <path
        d="M12 10.3c0-3.4 1.5-4.9 3.6-4.3 1.8.5 2.2 2.6 1 3.9-1.1 1.2-2.8 1.3-4.6.4"
        transform="rotate(120 12 12)"
      />
      <path
        d="M12 10.3c0-3.4 1.5-4.9 3.6-4.3 1.8.5 2.2 2.6 1 3.9-1.1 1.2-2.8 1.3-4.6.4"
        transform="rotate(240 12 12)"
      />
    </>
  ),
  'refrigerant-tank': (
    <>
      <rect x="6.6" y="6.6" width="10.8" height="14.4" rx="2.6" />
      <path d="M9.9 6.6V4.4h4.2v2.2" />
      <path d="M12 4.4V2.4M10.2 2.4h3.6" />
      <path d="M6.6 11h10.8" />
    </>
  ),
  gauge: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 12l4.1-3.6" />
      <circle cx="12" cy="12" r="1.1" />
      <path d="M12 3.4v1.9M20.6 12h-1.9M12 20.6v-1.9M3.4 12h1.9" />
    </>
  ),

  // ---- air side ----
  'blower-motor': (
    <>
      <circle cx="10.6" cy="11.6" r="6.4" />
      <path d="M10.6 5.2v12.8M4.2 11.6h12.8" />
      <path d="M10.6 7.4 13.8 11.6M10.6 15.8 7.4 11.6" />
      <path d="M17 8.6h3.8v6h-3.8" />
    </>
  ),
  'air-filter': (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="1.6" />
      <path d="M3 9.6 8.1 4.5M3 15.2 13.7 4.5M6.6 19.5 18.3 7.6M13.3 19.5 21 11.6M19.4 19.5 21 17.8" />
    </>
  ),
  ductwork: (
    <>
      <rect x="2.4" y="7" width="19.2" height="10" rx="1.2" />
      <path d="M6.2 7v10M17.8 7v10" />
    </>
  ),
  'condensate-drain': (
    <>
      <path d="M12 2.6s-3.3 3.6-3.3 5.8a3.3 3.3 0 0 0 6.6 0c0-2.2-3.3-5.8-3.3-5.8z" />
      <path d="M4.6 14.4v2.6a4 4 0 0 0 8 0v-1a3 3 0 0 1 6 0v3.4" />
    </>
  ),

  // ---- combustion ----
  igniter: (
    <>
      <rect x="7" y="17.8" width="10" height="3.2" rx="1" />
      <path d="M10 17.8v-4.2a2 2 0 1 1 4 0v4.2" />
      <path d="M12 8.6V5.4M8.8 9.6 6.6 7.4M15.2 9.6l2.2-2.2" />
    </>
  ),
  'flame-sensor': (
    <>
      <path d="M6.4 20.6V8.8M4.6 20.6h3.6" />
      <path d="M15 20.6c-2.1 0-3.9-1.6-3.9-3.7 0-2.9 2.9-3.7 3.3-7.2 1.6 1.3 2.5 2.7 2.9 4 .7-.5.9-1.3.9-2.1 1.2 1.5 1.8 3 1.8 5.3 0 2.1-1.8 3.7-3.9 3.7z" />
    </>
  ),
  'gas-valve': (
    <>
      <path d="M2.4 12.6h6.1M15.5 12.6h6.1" />
      <rect x="8.5" y="9.1" width="7" height="7" rx="1" />
      <path d="M12 9.1V5.4M10 5.4h4" />
    </>
  ),

  // ---- controls & measurement ----
  thermostat: (
    <>
      <rect x="4" y="3.4" width="16" height="17.2" rx="2.6" />
      <path d="M7.4 8.2h9.2" />
      <path d="M7.4 11.4h5.2" />
      <circle cx="16" cy="16.2" r="1.9" />
    </>
  ),
  thermometer: (
    <>
      <path d="M14 14.9V5.2a2 2 0 1 0-4 0v9.7a4 4 0 1 0 4 0z" />
      <path d="M12 8.4v6.9" />
    </>
  ),
  labor: (
    <>
      <path d="M14.9 6.4a3.6 3.6 0 0 0 4.7 4.7l-8.4 8.4a2.5 2.5 0 0 1-3.5-3.5z" />
      <path d="M14.9 6.4 17.4 3.9" />
      <path d="M4.2 19.8h.01" />
    </>
  ),
} satisfies Record<string, ReactElement>;

/** Every part icon available to the catalog. */
export type PartIconId = keyof typeof paths;

export const partIconIds = Object.keys(paths) as PartIconId[];

export interface PartIconProps extends Omit<IconBaseProps, 'children'> {
  id: PartIconId;
}

export function PartIcon({ id, ...rest }: PartIconProps) {
  return <IconBase {...rest}>{paths[id]}</IconBase>;
}
