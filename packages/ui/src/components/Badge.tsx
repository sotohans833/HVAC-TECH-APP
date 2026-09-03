import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'low' | 'high' | 'copper' | 'ok' | 'warn';

export interface BadgeProps {
  tone?: BadgeTone | undefined;
  /** Adds a leading dot so the badge reads without relying on color. */
  dot?: boolean | undefined;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', dot = false, children }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[tone]].join(' ')}>
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
