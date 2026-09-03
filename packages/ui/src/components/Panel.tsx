import type { ReactNode } from 'react';
import styles from './Panel.module.css';

export interface PanelProps {
  title?: string | undefined;
  /** Right-aligned text in the header — a count, a total, a status. */
  aside?: ReactNode | undefined;
  /** Drop the body padding when the panel holds a full-bleed list or table. */
  flush?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
}

export function Panel({ title, aside, flush = false, className, children }: PanelProps) {
  return (
    <section className={[styles.panel, className].filter(Boolean).join(' ')}>
      {title ? (
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {aside ? <span className={styles.eyebrow}>{aside}</span> : null}
        </header>
      ) : null}
      <div className={[styles.body, flush ? styles.flush : null].filter(Boolean).join(' ')}>
        {children}
      </div>
    </section>
  );
}
