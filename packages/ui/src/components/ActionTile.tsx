import type { ButtonHTMLAttributes } from 'react';
import { PartIcon, type PartIconId } from '../icons';
import styles from './ActionTile.module.css';

export interface ActionTileProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'children'
> {
  icon: PartIconId;
  label: string;
  /** Secondary line — a price, a size, a part number. */
  meta?: string | undefined;
  /** How many are on the ticket. 0 renders no badge. */
  count?: number | undefined;
  selected?: boolean | undefined;
  onSelect?: (() => void) | undefined;
}

export function ActionTile({
  icon,
  label,
  meta,
  count = 0,
  selected = false,
  onSelect,
  ...rest
}: ActionTileProps) {
  return (
    <button
      type="button"
      className={styles.tile}
      aria-pressed={selected}
      onClick={onSelect}
      {...rest}
    >
      <PartIcon id={icon} size={40} strokeWidth={1.5} className={styles.icon} />
      <span className={styles.label}>{label}</span>
      {meta ? <span className={styles.meta}>{meta}</span> : null}
      {count > 0 ? (
        <span className={styles.count} aria-hidden="true">
          {count}
        </span>
      ) : null}
    </button>
  );
}
