/**
 * Standing procedure lists.
 *
 * These exist so an invoice is substantial even when nothing was replaced. Two
 * of the most common tickets a technician writes are "full maintenance, system
 * checked out fine" and "diagnostic call, no fault found" — and both of them
 * used to produce two thin sentences that made a real visit look like nothing
 * happened. Listing the work actually performed is what justifies the call.
 *
 * The lists are written as customer-facing English, in the order a technician
 * works through the equipment.
 */

export type MaintenanceScope = 'cooling' | 'heating' | 'full';

/** Preventative maintenance, outdoor / condensing unit. */
const PM_OUTDOOR: readonly string[] = [
  'Washed and cleaned the condenser coil and removed debris from the cabinet',
  'Measured suction and liquid line pressures and verified superheat and subcooling against manufacturer specification',
  'Tested the run capacitor and compared measured capacity to the nameplate rating',
  'Inspected the contactor for pitted, burned or worn contacts',
  'Measured compressor and condenser fan motor amperage against rated load amps',
  'Inspected and tightened line-voltage and low-voltage electrical connections',
  'Verified supply voltage at the disconnect and inspected the fuses and breaker',
  'Checked the condenser fan motor and blade for bearing wear, noise and vibration',
  'Inspected refrigerant line insulation and verified service valve caps were in place',
];

/** Preventative maintenance, indoor / air handler. */
const PM_INDOOR: readonly string[] = [
  'Inspected the return air filter and replaced it as needed',
  'Inspected the evaporator coil for restriction and biological growth',
  'Flushed and treated the condensate drain line and verified the safety float switch',
  'Inspected the blower wheel and motor and measured blower amperage',
  'Measured supply and return air temperatures and verified temperature split across the coil',
  'Inspected the plenum and accessible ductwork for leaks and disconnected runs',
  'Verified thermostat operation, calibration and cycle',
  'Inspected electrical connections and safety controls at the air handler',
];

/** Preventative maintenance, heating section. */
const PM_HEATING: readonly string[] = [
  'Inspected the heat exchanger for cracks, corrosion and separation',
  'Inspected and cleaned the burners and verified a proper flame pattern',
  'Cleaned the flame sensor and measured the flame signal in microamps',
  'Tested hot surface igniter resistance against specification',
  'Verified inlet and manifold gas pressure',
  'Measured temperature rise across the furnace and compared it to the rating plate',
  'Verified the complete ignition sequence and the operation of all safety controls',
  'Inspected the inducer motor, pressure switch hoses and the flue for restriction',
  'Checked the condensate trap and drain on the furnace',
];

export function maintenanceTasks(scope: MaintenanceScope): readonly string[] {
  switch (scope) {
    case 'cooling':
      return [...PM_OUTDOOR, ...PM_INDOOR];
    case 'heating':
      return [...PM_HEATING, ...PM_INDOOR];
    case 'full':
      return [...PM_OUTDOOR, ...PM_INDOOR, ...PM_HEATING];
  }
}

/**
 * Checks performed on a diagnostic call. Used when a technician was called out,
 * went through the system, and found it operating correctly — the visit still
 * needs a record of everything that was ruled out.
 */
export const DIAGNOSTIC_CHECKS: Record<'no-cooling' | 'no-heat', readonly string[]> = {
  'no-cooling': [
    'Verified thermostat operation and confirmed a call for cooling reaching the equipment',
    'Verified line voltage and 24-volt control voltage at the condensing unit',
    'Measured suction and liquid pressures and calculated superheat and subcooling',
    'Tested the run capacitor against its nameplate rating',
    'Measured compressor and condenser fan amperage against rated load amps',
    'Inspected the contactor and all accessible electrical connections',
    'Inspected the condenser and evaporator coils for restriction',
    'Verified filter condition, airflow and temperature split across the indoor coil',
    'Verified condensate drain flow and float switch operation',
  ],
  'no-heat': [
    'Verified thermostat operation and confirmed a call for heat reaching the equipment',
    'Verified line voltage and 24-volt control voltage at the furnace',
    'Observed a complete ignition sequence from inducer start through burner operation',
    'Measured the flame signal in microamps against the minimum specification',
    'Tested hot surface igniter resistance',
    'Verified pressure switch operation and inspected the hoses and flue for restriction',
    'Measured temperature rise and compared it to the rating plate',
    'Inspected the heat exchanger and burners',
    'Verified filter condition and airflow',
  ],
};
