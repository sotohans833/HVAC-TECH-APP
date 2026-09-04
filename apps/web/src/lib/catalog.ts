import type { PartIconId } from '@manifold/ui';

/**
 * The part catalog.
 *
 * Three things about the shape of this data are load-bearing for the product:
 *
 * 1. Names are bilingual *records*, not translation keys. The technician picks
 *    "Capacitor de marcha" and the customer reads "run capacitor" — input
 *    language and output language are deliberately different. That inversion is
 *    the product, not an i18n afterthought.
 *
 * 2. `invoicePhrase` is written once, by hand, in the register a customer
 *    expects on a bill. Nothing generates it at runtime, so no part number and
 *    no price can ever be invented. See docs/adr/0002.
 *
 * 3. Every part carries its common failure causes, and every cause carries a
 *    plain-language explanation of *why* it failed. This is the part customers
 *    actually ask about — "why did this break if my unit is almost new?" — and
 *    answering it on the invoice is the whole point. See docs/adr/0004.
 */

export type CatalogCategory =
  'electrical' | 'refrigerant' | 'airflow' | 'combustion' | 'controls';

export type WorkAction = 'replaced' | 'repaired' | 'cleaned' | 'added' | 'performed' | 'tested';

/**
 * How the part is expected to behave over the life of the equipment. This drives
 * the reassurance sentence on the invoice, because "this is a wear part" and
 * "this failed early and here is why" are very different conversations.
 */
export type ServiceClass =
  /** Designed to be replaced periodically. Failure is expected, not a defect. */
  | 'wear'
  /** Replaced as routine service, often whenever the system is opened. */
  | 'consumable'
  /** Expected to last the life of the system. Failure has a root cause. */
  | 'component';

export interface FailureCause {
  id: string;
  /** Shown to the technician, in their language. */
  label: { en: string; es: string };
  /**
   * What the technician found, customer-facing English, phrased to follow
   * "Found ". Omitted for causes that describe work rather than a discovery.
   */
  finding?: string;
  /**
   * Plain-language reason the part failed, written for a homeowner. Omitted
   * where the part's own `serviceNote` already says everything worth saying.
   */
  explanation?: string;
  /** True when routine maintenance would likely have prevented this. */
  preventable?: boolean;
}

export interface CatalogItem {
  id: string;
  icon: PartIconId;
  category: CatalogCategory;
  /** UI label, in the technician's language. */
  label: { en: string; es: string };
  /** Common size or rating, shown under the label. Not a price. */
  spec?: string;
  /** Customer-facing noun used to build the invoice line, English only. */
  invoicePhrase: string;
  /** Actions that make sense for this part, first one is the default. */
  actions: readonly WorkAction[];
  serviceClass: ServiceClass;
  /**
   * One sentence explaining what the part does and what its replacement says
   * about the equipment. Used to answer the "is my unit bad?" question before
   * the customer has to ask it.
   */
  serviceNote?: string;
  causes: readonly FailureCause[];
}

export const CATEGORY_LABELS: Record<CatalogCategory, { en: string; es: string }> = {
  electrical: { en: 'Electrical', es: 'Eléctrico' },
  refrigerant: { en: 'Refrigerant', es: 'Refrigerante' },
  airflow: { en: 'Airflow', es: 'Flujo de aire' },
  combustion: { en: 'Combustion', es: 'Combustión' },
  controls: { en: 'Controls', es: 'Controles' },
};

export const CATALOG: readonly CatalogItem[] = [
  // ---------------------------------------------------------------- electrical
  {
    id: 'run-capacitor',
    icon: 'capacitor',
    category: 'electrical',
    label: { en: 'Run capacitor', es: 'Capacitor de marcha' },
    spec: '45/5 MFD',
    invoicePhrase: 'dual run capacitor',
    actions: ['replaced', 'tested'],
    serviceClass: 'wear',
    serviceNote:
      'A run capacitor stores and releases the electrical charge that starts and steadies the compressor and fan motor. It is a consumable electrical component with a limited service life — commonly five to ten years, and less in high heat — so replacing one is routine maintenance and is not an indication of a problem with the equipment itself.',
    causes: [
      {
        id: 'weak',
        label: { en: 'Weak — below rated MFD', es: 'Débil — bajo el MFD nominal' },
        finding: 'the run capacitor testing below its rated microfarad capacity',
        explanation:
          'Capacitors lose capacity gradually as the electrolyte inside them dries out, and heat accelerates it. A weak capacitor makes the motor work harder and draw more current, which shortens the life of the motor it feeds, so it is replaced once it drifts out of tolerance rather than waiting for it to fail outright.',
      },
      {
        id: 'failed-open',
        label: { en: 'Failed open / no reading', es: 'Abierto / sin lectura' },
        finding: 'the run capacitor open, with no measurable capacity',
        explanation:
          'With the capacitor open the motor cannot start and will draw locked-rotor current until a safety opens. Replacing it promptly protects the motor windings from that condition.',
      },
      {
        id: 'bulged',
        label: { en: 'Bulged or leaking', es: 'Inflado o con fuga' },
        finding: 'the run capacitor swollen and venting at the top seal',
        explanation:
          'A bulged case means the capacitor has vented under internal pressure, which is the normal end-of-life failure mode for this component and is driven by heat and run hours, not by equipment quality.',
      },
      {
        id: 'shorted',
        label: { en: 'Shorted', es: 'En corto' },
        finding: 'the run capacitor shorted internally',
      },
    ],
  },
  {
    id: 'contactor',
    icon: 'contactor',
    category: 'electrical',
    label: { en: 'Contactor', es: 'Contactor' },
    spec: '2 pole 30A',
    invoicePhrase: 'condenser contactor',
    actions: ['replaced', 'cleaned', 'tested'],
    serviceClass: 'wear',
    serviceNote:
      'A contactor is the heavy-duty electrical switch that closes every time the system calls for cooling and carries the full current of the compressor and condenser fan. Its contacts erode a little with every cycle, so it is a scheduled-replacement wear part on every brand of equipment and its condition does not reflect the quality or age of the system.',
    causes: [
      {
        id: 'burned-contacts',
        label: { en: 'Burned / pitted contacts', es: 'Contactos quemados o picados' },
        finding: 'the contactor with severely pitted and burned contacts',
        explanation:
          'Every time the contactor closes it draws a small arc, and over thousands of cycles that arcing pits and burns the contact surfaces. Burned contacts add resistance, which generates heat and lowers the voltage reaching the compressor. Replacing the contactor at this stage protects the compressor from running on low voltage.',
      },
      {
        id: 'welded',
        label: { en: 'Contacts welded closed', es: 'Contactos pegados' },
        finding:
          'the contactor contacts welded closed, leaving the condensing unit energized continuously',
        explanation:
          'When the contacts weld shut the outdoor unit keeps running even after the thermostat is satisfied, which wastes energy and can freeze the indoor coil. This is a normal end-of-life failure for a contactor.',
      },
      {
        id: 'coil-failed',
        label: { en: 'Coil failed — will not pull in', es: 'Bobina dañada — no jala' },
        finding: 'an open holding coil that would not pull the contactor in',
      },
      {
        id: 'insects',
        label: { en: 'Insect / ant intrusion', es: 'Invasión de hormigas o insectos' },
        finding: 'insect intrusion holding the contacts apart',
        explanation:
          'Ants and other insects are drawn to the magnetic field of the contactor coil and nest inside the housing, which blocks the contacts from closing. This is common in outdoor equipment and is not a defect in the unit.',
      },
      {
        id: 'chattering',
        label: { en: 'Chattering / low voltage', es: 'Vibrando / bajo voltaje' },
        finding: 'the contactor chattering under load from a weak holding coil',
      },
    ],
  },
  {
    id: 'transformer',
    icon: 'transformer',
    category: 'electrical',
    label: { en: 'Transformer', es: 'Transformador' },
    spec: '24V 40VA',
    invoicePhrase: 'low-voltage transformer',
    actions: ['replaced', 'tested'],
    serviceClass: 'component',
    causes: [
      {
        id: 'shorted-secondary',
        label: { en: 'Shorted by control circuit', es: 'Dañado por corto en control' },
        finding: 'an open transformer that had failed from a short in the low-voltage circuit',
        explanation:
          'The transformer supplies the 24-volt control circuit. A pinched or shorted thermostat wire, or a shorted contactor coil, overloads it and opens its internal protection. The short itself was located and corrected so the replacement is not subjected to the same condition.',
      },
      {
        id: 'open-winding',
        label: { en: 'Open winding', es: 'Devanado abierto' },
        finding: 'an open secondary winding with no 24-volt output',
      },
      {
        id: 'surge',
        label: { en: 'Power surge', es: 'Pico de voltaje' },
        finding: 'transformer failure consistent with a line-voltage surge',
        explanation:
          'Utility surges and nearby lightning strikes travel into the equipment on the power line and take out the lowest-rated components first. This is an external electrical event rather than a fault in the equipment.',
      },
    ],
  },
  {
    id: 'control-board',
    icon: 'control-board',
    category: 'electrical',
    label: { en: 'Control board', es: 'Tarjeta de control' },
    invoicePhrase: 'integrated control board',
    actions: ['replaced', 'tested'],
    serviceClass: 'component',
    causes: [
      {
        id: 'failed-relay',
        label: { en: 'Failed onboard relay', es: 'Relé de la tarjeta dañado' },
        finding: 'a failed onboard relay that would not pass the blower signal',
      },
      {
        id: 'burned-terminal',
        label: { en: 'Burned terminal', es: 'Terminal quemada' },
        finding: 'a burned terminal and scorching on the board',
        explanation:
          'A loose connection at a board terminal builds resistance, and resistance builds heat until the terminal burns. Connections were checked and torqued throughout to keep the new board from seeing the same condition.',
      },
      {
        id: 'surge',
        label: { en: 'Power surge', es: 'Pico de voltaje' },
        finding: 'surge damage to the control board',
        explanation:
          'Electronic boards are the most surge-sensitive component in the system. Damage of this kind comes in from the utility line and is not caused by the equipment.',
      },
    ],
  },
  {
    id: 'condenser-fan-motor',
    icon: 'condenser-fan',
    category: 'electrical',
    label: { en: 'Condenser fan motor', es: 'Motor del condensador' },
    spec: '1/4 HP',
    invoicePhrase: 'condenser fan motor',
    actions: ['replaced', 'tested'],
    serviceClass: 'component',
    causes: [
      {
        id: 'seized-bearings',
        label: { en: 'Seized bearings', es: 'Baleros trabados' },
        finding: 'seized bearings that would not allow the fan to turn freely',
      },
      {
        id: 'open-winding',
        label: { en: 'Open winding', es: 'Devanado abierto' },
        finding: 'an open winding and no rotation on a call for cooling',
      },
      {
        id: 'overheated',
        label: { en: 'Overheated — weak capacitor', es: 'Sobrecalentado — capacitor débil' },
        finding: 'the condenser fan motor overheating and drawing above its rated amperage',
        explanation:
          'A motor fed by a weak capacitor runs hot and draws high current, which cooks the windings over time. The capacitor was tested as part of this repair so the new motor starts on a correct charge.',
      },
      {
        id: 'restricted-airflow',
        label: { en: 'Overheated — dirty coil', es: 'Sobrecalentado — coil sucio' },
        finding: 'heat damage from operating against a restricted condenser coil',
        preventable: true,
      },
    ],
  },
  {
    id: 'blower-motor',
    icon: 'blower-motor',
    category: 'electrical',
    label: { en: 'Blower motor', es: 'Motor del soplador' },
    spec: 'ECM',
    invoicePhrase: 'indoor blower motor',
    actions: ['replaced', 'cleaned', 'tested'],
    serviceClass: 'component',
    causes: [
      {
        id: 'seized-bearings',
        label: { en: 'Seized bearings', es: 'Baleros trabados' },
        finding: 'seized bearings and no rotation',
      },
      {
        id: 'restricted-airflow',
        label: { en: 'Overheated — plugged filter', es: 'Sobrecalentado — filtro tapado' },
        finding: 'heat damage from running against a heavily restricted filter',
        explanation:
          'A plugged filter starves the blower of air. Without that airflow moving across it the motor has no way to shed its own heat, and the windings break down. Changing the filter on schedule is the single most effective way to prevent this failure.',
        preventable: true,
      },
      {
        id: 'module-failed',
        label: { en: 'ECM module failed', es: 'Módulo ECM dañado' },
        finding: 'a failed ECM control module',
      },
      {
        id: 'out-of-balance',
        label: { en: 'Wheel out of balance', es: 'Turbina desbalanceada' },
        finding: 'a blower wheel loaded with debris and running out of balance',
        preventable: true,
      },
    ],
  },
  {
    id: 'wiring',
    icon: 'electrical',
    category: 'electrical',
    label: { en: 'Wiring / connections', es: 'Cableado / conexiones' },
    invoicePhrase: 'wiring connection',
    actions: ['repaired', 'tested'],
    serviceClass: 'component',
    causes: [
      {
        id: 'burned-connection',
        label: { en: 'Burned connection', es: 'Conexión quemada' },
        finding: 'a burned and discolored connection',
        explanation:
          'Connections loosen over years of heating and cooling cycles. A loose connection adds resistance, resistance makes heat, and the heat burns the terminal. Tightening connections during routine maintenance is what prevents this.',
        preventable: true,
      },
      {
        id: 'rodent-damage',
        label: { en: 'Rodent damage', es: 'Daño por roedores' },
        finding: 'wiring chewed through by rodents',
      },
      {
        id: 'loose-connection',
        label: { en: 'Loose connection', es: 'Conexión floja' },
        finding: 'loose connections at the equipment terminals',
        preventable: true,
      },
      {
        id: 'chafed',
        label: { en: 'Chafed / shorted to cabinet', es: 'Pelado / en corto al gabinete' },
        finding: 'wiring chafed against the cabinet and shorting to ground',
      },
    ],
  },

  // -------------------------------------------------------------- refrigerant
  {
    id: 'compressor',
    icon: 'compressor',
    category: 'refrigerant',
    label: { en: 'Compressor', es: 'Compresor' },
    invoicePhrase: 'compressor',
    actions: ['replaced', 'tested'],
    serviceClass: 'component',
    serviceNote:
      'The compressor is the heart of the system and is expected to last the life of the equipment. When one fails early it is almost always the result of an operating condition placed on it rather than a defect, so the underlying cause is identified and corrected as part of the replacement.',
    causes: [
      {
        id: 'overheated-restriction',
        label: {
          en: 'Overheated — restricted condenser',
          es: 'Sobrecalentado — condensador tapado',
        },
        finding:
          'a failed compressor operating against a severely restricted condenser coil, with head pressure and discharge temperature well above design',
        explanation:
          'A compressor is expected to last the life of the equipment, so a failure this early points to an operating condition placed on it rather than a defect in the unit. The condenser coil is how the system rejects heat outdoors. When it is packed with dirt, grass or cottonwood that heat has nowhere to go, so head pressure and discharge temperature climb far above design and the compressor runs hot on every cycle. Sustained operation in that condition breaks down the internal lubricant and the motor windings. This is the most common cause of early compressor failure, and routine coil cleaning is what prevents it.',
        preventable: true,
      },
      {
        id: 'shorted-windings',
        label: { en: 'Shorted / grounded windings', es: 'Devanados en corto o a tierra' },
        finding: 'the compressor windings shorted to ground',
      },
      {
        id: 'locked-rotor',
        label: { en: 'Locked rotor', es: 'Rotor trabado' },
        finding: 'a mechanically locked rotor drawing locked-rotor amperage',
      },
      {
        id: 'floodback',
        label: { en: 'Liquid floodback', es: 'Retorno de líquido' },
        finding:
          'mechanical damage consistent with liquid refrigerant returning to the compressor',
        explanation:
          'Compressors are built to compress vapor, not liquid. Low airflow or an overcharge lets liquid refrigerant reach the compressor, where it washes out the oil and damages the internal components. Airflow and charge were both corrected as part of this repair.',
      },
      {
        id: 'open-overload',
        label: { en: 'Open internal overload', es: 'Protector interno abierto' },
        finding: 'an internal overload that would not reset',
      },
      {
        id: 'low-charge',
        label: { en: 'Ran on low charge', es: 'Operó con carga baja' },
        finding: 'compressor damage from extended operation on an undercharged system',
        explanation:
          'Refrigerant also carries the oil that lubricates and cools the compressor. Running low on charge for an extended period starves it of both. The leak was addressed so the replacement is not put back into the same condition.',
      },
    ],
  },
  {
    id: 'txv',
    icon: 'expansion-valve',
    category: 'refrigerant',
    label: { en: 'Expansion valve (TXV)', es: 'Válvula de expansión (TXV)' },
    spec: 'R-410A',
    invoicePhrase: 'thermostatic expansion valve',
    actions: ['replaced', 'tested'],
    serviceClass: 'component',
    causes: [
      {
        id: 'restricted',
        label: { en: 'Restricted / stuck closed', es: 'Restringida / cerrada' },
        finding: 'a restricted valve holding superheat far above specification',
      },
      {
        id: 'lost-charge',
        label: { en: 'Sensing bulb lost charge', es: 'Bulbo perdió carga' },
        finding: 'a sensing bulb that had lost its charge and could not modulate the valve',
      },
      {
        id: 'contamination',
        label: { en: 'Moisture / contamination', es: 'Humedad o contaminación' },
        finding: 'contamination in the valve restricting refrigerant flow',
        explanation:
          'Moisture and debris in a sealed system collect at the smallest passage, which is the expansion valve. A new liquid line filter drier is installed with the valve to keep the system clean going forward.',
      },
    ],
  },
  {
    id: 'filter-drier',
    icon: 'filter-drier',
    category: 'refrigerant',
    label: { en: 'Filter drier', es: 'Filtro secador' },
    invoicePhrase: 'liquid line filter drier',
    actions: ['replaced'],
    serviceClass: 'consumable',
    serviceNote:
      'A filter drier removes moisture and debris from the refrigerant circuit. Industry practice — and most manufacturer warranties — require a new drier any time the sealed system is opened, so this line is standard procedure rather than a failed part.',
    causes: [
      {
        id: 'system-opened',
        label: { en: 'Standard — system was opened', es: 'Estándar — sistema abierto' },
        finding:
          'the sealed system opened for repair, which requires a new liquid line filter drier',
      },
      {
        id: 'restricted',
        label: { en: 'Restricted', es: 'Restringido' },
        finding: 'a restricted filter drier causing a temperature drop across the liquid line',
      },
      {
        id: 'moisture',
        label: { en: 'Moisture in system', es: 'Humedad en el sistema' },
        finding: 'moisture indicated in the refrigerant circuit',
      },
    ],
  },
  {
    id: 'refrigerant-charge',
    icon: 'refrigerant-tank',
    category: 'refrigerant',
    label: { en: 'Refrigerant charge', es: 'Carga de refrigerante' },
    spec: 'per lb',
    invoicePhrase: 'pound of refrigerant',
    actions: ['added', 'tested'],
    serviceClass: 'consumable',
    serviceNote:
      'Refrigerant circulates in a sealed system and is not consumed in normal operation. If a system is low, it is because refrigerant escaped somewhere, so the charge is adjusted only after the leak is located and addressed.',
    causes: [
      {
        id: 'leak-repaired',
        label: { en: 'Leak found and repaired', es: 'Fuga encontrada y reparada' },
        finding:
          'a refrigerant leak, which was located and repaired before the system was recharged',
      },
      {
        id: 'undercharged',
        label: { en: 'Undercharged', es: 'Carga baja' },
        finding:
          'the system operating undercharged, with superheat above and subcooling below specification',
      },
      {
        id: 'overcharged',
        label: { en: 'Overcharged', es: 'Sobrecargado' },
        finding: 'the system overcharged, raising head pressure and reducing capacity',
      },
    ],
  },
  {
    id: 'condenser-coil',
    icon: 'evaporator-coil',
    category: 'refrigerant',
    label: { en: 'Condenser coil', es: 'Serpentín del condensador' },
    invoicePhrase: 'condenser coil',
    actions: ['cleaned', 'replaced'],
    serviceClass: 'component',
    serviceNote:
      'The condenser coil is where the system releases the heat it removed from the house. Keeping it clean is the single highest-value piece of maintenance on the equipment: a restricted coil raises operating pressure, increases electricity use, and is the leading cause of early compressor failure.',
    causes: [
      {
        id: 'restricted-dirt',
        label: { en: 'Restricted with dirt / debris', es: 'Obstruido con tierra o basura' },
        finding: 'a condenser coil heavily restricted with dirt and debris',
        explanation:
          'A restricted coil makes the system run longer for less cooling, which shows up as higher electricity bills and a house that struggles to keep up on hot afternoons. Cleaning it restores design operating pressures.',
        preventable: true,
      },
      {
        id: 'cottonwood',
        label: { en: 'Cottonwood / grass clippings', es: 'Pelusa o zacate' },
        finding: 'a condenser coil matted with cottonwood and grass clippings',
        preventable: true,
      },
      {
        id: 'bent-fins',
        label: { en: 'Bent fins', es: 'Aletas dobladas' },
        finding: 'bent fins restricting airflow across the coil',
      },
      {
        id: 'leaking',
        label: { en: 'Leaking', es: 'Con fuga' },
        finding: 'a leaking condenser coil',
      },
    ],
  },

  // ------------------------------------------------------------------ airflow
  {
    id: 'air-filter',
    icon: 'air-filter',
    category: 'airflow',
    label: { en: 'Air filter', es: 'Filtro de aire' },
    spec: '20x25x1',
    invoicePhrase: 'return air filter',
    actions: ['replaced'],
    serviceClass: 'consumable',
    serviceNote:
      'The filter protects the blower and the indoor coil, and it is the one item that needs attention between visits. A restricted filter reduces capacity, raises operating cost, and is a common root cause of blower motor and frozen coil problems.',
    causes: [
      {
        id: 'routine',
        label: { en: 'Routine replacement', es: 'Cambio de rutina' },
        finding: 'the return air filter due for replacement as part of routine service',
      },
      {
        id: 'heavily-loaded',
        label: { en: 'Heavily loaded / restricted', es: 'Muy sucio / restringido' },
        finding: 'a heavily loaded filter restricting airflow to the system',
        preventable: true,
      },
    ],
  },
  {
    id: 'evaporator-coil',
    icon: 'evaporator-coil',
    category: 'airflow',
    label: { en: 'Evaporator coil', es: 'Serpentín evaporador' },
    invoicePhrase: 'evaporator coil',
    actions: ['cleaned', 'replaced'],
    serviceClass: 'component',
    causes: [
      {
        id: 'dirty',
        label: { en: 'Dirty / restricted', es: 'Sucio / restringido' },
        finding: 'an evaporator coil restricted with dust and debris',
        explanation:
          'Dust that bypasses the filter collects on the wet surface of the indoor coil and blocks airflow, which lowers capacity and can drive the coil into a freeze condition.',
        preventable: true,
      },
      {
        id: 'biological-growth',
        label: { en: 'Biological growth', es: 'Crecimiento biológico' },
        finding: 'biological growth on the evaporator coil and drain pan',
        preventable: true,
      },
      {
        id: 'frozen',
        label: { en: 'Frozen / iced over', es: 'Congelado' },
        finding: 'the evaporator coil iced over',
        explanation:
          'A coil freezes when it cannot absorb enough heat, which comes from either low airflow or low refrigerant charge. The underlying cause was identified and corrected rather than only thawing the coil.',
      },
      {
        id: 'leaking',
        label: { en: 'Leaking', es: 'Con fuga' },
        finding: 'a leaking evaporator coil',
      },
    ],
  },
  {
    id: 'condensate-drain',
    icon: 'condensate-drain',
    category: 'airflow',
    label: { en: 'Condensate drain', es: 'Drenaje de condensado' },
    invoicePhrase: 'condensate drain line',
    actions: ['cleaned', 'repaired'],
    serviceClass: 'consumable',
    causes: [
      {
        id: 'plugged',
        label: { en: 'Plugged with algae / sludge', es: 'Tapado con algas o lodo' },
        finding: 'a condensate drain line plugged with biological growth',
        explanation:
          'An air conditioner removes water from the air, and that standing water grows algae inside the drain line. Once the line plugs, water backs up into the pan and can overflow into the house. Clearing and treating the line at each maintenance visit is what prevents water damage.',
        preventable: true,
      },
      {
        id: 'float-switch',
        label: { en: 'Float switch tripped', es: 'Interruptor de flotador activado' },
        finding:
          'a tripped safety float switch that had shut the system down on a full drain pan',
      },
      {
        id: 'improper-slope',
        label: { en: 'Improper slope / trap', es: 'Pendiente o trampa incorrecta' },
        finding: 'a drain line without adequate slope to drain properly',
      },
    ],
  },
  {
    id: 'ductwork',
    icon: 'ductwork',
    category: 'airflow',
    label: { en: 'Ductwork', es: 'Ductos' },
    invoicePhrase: 'duct run',
    actions: ['repaired', 'cleaned'],
    serviceClass: 'component',
    causes: [
      {
        id: 'disconnected',
        label: { en: 'Disconnected duct', es: 'Ducto desconectado' },
        finding: 'a disconnected duct run delivering conditioned air outside the living space',
      },
      {
        id: 'leaking',
        label: { en: 'Leaking joints', es: 'Uniones con fuga' },
        finding: 'leaking duct joints losing conditioned air',
      },
      {
        id: 'crushed',
        label: { en: 'Crushed / kinked', es: 'Aplastado o doblado' },
        finding: 'a crushed duct run restricting airflow to the system',
      },
    ],
  },

  // --------------------------------------------------------------- combustion
  {
    id: 'igniter',
    icon: 'igniter',
    category: 'combustion',
    label: { en: 'Hot surface igniter', es: 'Ignitor de superficie' },
    invoicePhrase: 'hot surface igniter',
    actions: ['replaced', 'tested'],
    serviceClass: 'wear',
    serviceNote:
      'A hot surface igniter is a brittle ceramic element that is heated to over 2,000 degrees on every call for heat. It is a wear part with a typical service life of a few heating seasons, and replacing one is expected maintenance rather than a sign of a problem with the furnace.',
    causes: [
      {
        id: 'cracked',
        label: { en: 'Cracked element', es: 'Elemento quebrado' },
        finding: 'a cracked igniter element',
        explanation:
          'The element expands and contracts sharply every cycle, and that thermal cycling eventually cracks the ceramic. It is the normal end of life for this part.',
      },
      {
        id: 'open',
        label: { en: 'Tested open', es: 'Abierto en prueba' },
        finding: 'an igniter that tested open and would not heat',
      },
      {
        id: 'weak',
        label: { en: 'Weak / slow to glow', es: 'Débil / tarda en encender' },
        finding:
          'an igniter with a resistance reading out of specification and a slow glow time',
      },
    ],
  },
  {
    id: 'flame-sensor',
    icon: 'flame-sensor',
    category: 'combustion',
    label: { en: 'Flame sensor', es: 'Sensor de flama' },
    invoicePhrase: 'flame sensor',
    actions: ['cleaned', 'replaced'],
    serviceClass: 'consumable',
    serviceNote:
      'The flame sensor is a safety device that confirms a flame is present before the furnace continues to send gas. A light oxide film builds on it during normal operation, so cleaning it is a routine part of heating maintenance.',
    causes: [
      {
        id: 'oxidized',
        label: { en: 'Oxidized — low microamps', es: 'Oxidado — microamperaje bajo' },
        finding:
          'a flame sensor with an oxide coating and a flame signal below the minimum specification',
        explanation:
          'As the coating builds, the electrical signal the sensor sends back drops until the control board can no longer confirm a flame and shuts the furnace down on a safety lockout. Cleaning it restores the signal — the furnace was not broken, its safety system was doing exactly what it should.',
        preventable: true,
      },
      {
        id: 'cracked-porcelain',
        label: { en: 'Cracked porcelain', es: 'Porcelana quebrada' },
        finding: 'cracked porcelain on the sensor allowing the signal to short to ground',
      },
    ],
  },
  {
    id: 'gas-valve',
    icon: 'gas-valve',
    category: 'combustion',
    label: { en: 'Gas valve', es: 'Válvula de gas' },
    invoicePhrase: 'gas valve',
    actions: ['replaced', 'tested'],
    serviceClass: 'component',
    causes: [
      {
        id: 'no-open',
        label: { en: 'Will not open', es: 'No abre' },
        finding:
          'a gas valve that would not open on a call for heat with 24 volts present at the valve',
      },
      {
        id: 'stuck',
        label: { en: 'Stuck / erratic', es: 'Pegada / errática' },
        finding: 'a gas valve operating erratically',
      },
      {
        id: 'regulator-drift',
        label: {
          en: 'Manifold pressure out of spec',
          es: 'Presión de manifold fuera de rango',
        },
        finding: 'manifold pressure out of specification and not adjustable at the valve',
      },
    ],
  },
  {
    id: 'pressure-switch',
    icon: 'pressure-switch',
    category: 'combustion',
    label: { en: 'Pressure switch', es: 'Interruptor de presión' },
    invoicePhrase: 'pressure switch',
    actions: ['replaced', 'cleaned', 'tested'],
    serviceClass: 'component',
    serviceNote:
      'The pressure switch is a safety device that proves the furnace is venting properly before it will allow ignition. When it opens, it is usually reporting a real venting problem rather than failing on its own, so the venting path is checked first.',
    causes: [
      {
        id: 'blocked-hose',
        label: { en: 'Blocked hose / port', es: 'Manguera o puerto tapado' },
        finding: 'a blocked pressure switch hose preventing the switch from proving draft',
        preventable: true,
      },
      {
        id: 'condensate-in-port',
        label: { en: 'Condensate in port', es: 'Condensado en el puerto' },
        finding: 'condensate trapped in the pressure switch port',
        preventable: true,
      },
      {
        id: 'flue-restriction',
        label: { en: 'Flue / vent restriction', es: 'Restricción en la chimenea' },
        finding: 'a restricted flue preventing the furnace from establishing draft',
      },
      {
        id: 'failed-switch',
        label: { en: 'Switch failed', es: 'Interruptor dañado' },
        finding: 'a pressure switch that would not close with proper draft proven at the port',
      },
    ],
  },

  // ----------------------------------------------------------------- controls
  {
    id: 'thermostat',
    icon: 'thermostat',
    category: 'controls',
    label: { en: 'Thermostat', es: 'Termostato' },
    invoicePhrase: 'thermostat',
    actions: ['replaced', 'tested'],
    serviceClass: 'component',
    causes: [
      {
        id: 'failed',
        label: { en: 'Failed / no output', es: 'Dañado / sin señal' },
        finding: 'a thermostat that would not send a call to the equipment',
      },
      {
        id: 'miscalibrated',
        label: { en: 'Out of calibration', es: 'Descalibrado' },
        finding: 'a thermostat reading well off the actual space temperature',
      },
      {
        id: 'wiring',
        label: { en: 'Wiring / connection issue', es: 'Problema de cableado' },
        finding: 'a loose thermostat connection interrupting the control signal',
      },
    ],
  },
  {
    id: 'labor',
    icon: 'labor',
    category: 'controls',
    label: { en: 'Diagnostic labor', es: 'Mano de obra' },
    spec: 'per hour',
    invoicePhrase: 'hour of diagnostic labor',
    actions: ['performed'],
    serviceClass: 'consumable',
    causes: [
      {
        id: 'diagnostic',
        label: { en: 'System diagnostic', es: 'Diagnóstico del sistema' },
      },
      {
        id: 'no-fault-found',
        label: { en: 'No fault found', es: 'Sin falla encontrada' },
      },
    ],
  },
];

export const CATALOG_BY_ID = new Map(CATALOG.map((item) => [item.id, item]));

export const CATEGORY_ORDER: readonly CatalogCategory[] = [
  'electrical',
  'refrigerant',
  'airflow',
  'combustion',
  'controls',
];

export function findCause(
  itemId: string,
  causeId: string | undefined,
): FailureCause | undefined {
  if (!causeId) return undefined;
  return CATALOG_BY_ID.get(itemId)?.causes.find((cause) => cause.id === causeId);
}
