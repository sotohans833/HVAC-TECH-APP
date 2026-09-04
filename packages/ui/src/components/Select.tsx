import type { SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'onChange' | 'value' | 'children'
> {
  value: string;
  onValueChange: (next: string) => void;
  options: readonly SelectOption[];
  /** Shown as a dashed, muted first option while nothing is chosen. */
  placeholder?: string | undefined;
  label: string;
}

/**
 * A native select, styled.
 *
 * Deliberately not a custom listbox: on a phone the native control opens the
 * platform picker, which is faster with one thumb and works with gloves, and it
 * comes with keyboard and screen reader behavior already correct.
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  label,
  className,
  ...rest
}: SelectProps) {
  const isUnset = value === '';

  return (
    <span className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <select
        className={[styles.select, isUnset ? styles.unset : null].filter(Boolean).join(' ')}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-label={label}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className={styles.chevron}
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m5 9 7 7 7-7" />
      </svg>
    </span>
  );
}
