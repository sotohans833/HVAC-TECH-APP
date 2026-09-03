import type { ReactNode, SVGProps } from 'react';

export interface IconBaseProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Rendered pixel size. Defaults to 24, the grid the paths are drawn on. */
  size?: number | undefined;
  /**
   * Accessible label. Omit it for icons that sit next to their own text label —
   * the icon is then hidden from screen readers instead of being read twice.
   */
  title?: string | undefined;
  children: ReactNode;
}

/**
 * Shared frame for every Manifold icon.
 *
 * All icons are drawn on a 24x24 grid with a 1.6 stroke and no fill, so they
 * keep the same optical weight next to text at any size and inherit color from
 * whatever they sit inside.
 */
export function IconBase({ size = 24, title, children, ...rest }: IconBaseProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}
