import { MinusIcon, PlusIcon } from '../icons';
import styles from './Stepper.module.css';

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number | undefined;
  max?: number | undefined;
  /** Announced to screen readers, e.g. "Capacitor quantity". */
  label: string;
  decrementLabel?: string | undefined;
  incrementLabel?: string | undefined;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  decrementLabel = 'Decrease',
  incrementLabel = 'Increase',
}: StepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`${decrementLabel}: ${label}`}
      >
        <MinusIcon size={20} />
      </button>
      <output className={styles.value} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`${incrementLabel}: ${label}`}
      >
        <PlusIcon size={20} />
      </button>
    </div>
  );
}
