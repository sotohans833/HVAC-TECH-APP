import { IconBase, type IconBaseProps } from './IconBase';

type UiIconProps = Omit<IconBaseProps, 'children'>;

export const CheckIcon = (p: UiIconProps) => (
  <IconBase {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </IconBase>
);

export const PlusIcon = (p: UiIconProps) => (
  <IconBase {...p}>
    <path d="M12 5v14M5 12h14" />
  </IconBase>
);

export const MinusIcon = (p: UiIconProps) => (
  <IconBase {...p}>
    <path d="M5 12h14" />
  </IconBase>
);

export const CloseIcon = (p: UiIconProps) => (
  <IconBase {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </IconBase>
);

export const TrashIcon = (p: UiIconProps) => (
  <IconBase {...p}>
    <path d="M4 6.5h16M9.5 6.5V4.6h5v1.9" />
    <path d="M6.2 6.5 7 19.4A1.6 1.6 0 0 0 8.6 21h6.8a1.6 1.6 0 0 0 1.6-1.6l.8-12.9" />
    <path d="M10.4 10.2v6.6M13.6 10.2v6.6" />
  </IconBase>
);

export const CopyIcon = (p: UiIconProps) => (
  <IconBase {...p}>
    <rect x="8.6" y="8.6" width="12" height="12" rx="2" />
    <path d="M15.4 5.4a2 2 0 0 0-2-2H5.4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2" />
  </IconBase>
);

export const GlobeIcon = (p: UiIconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M3.4 12h17.2" />
    <path d="M12 3.4a13 13 0 0 1 0 17.2 13 13 0 0 1 0-17.2z" />
  </IconBase>
);

export const SunIcon = (p: UiIconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
  </IconBase>
);

export const MoonIcon = (p: UiIconProps) => (
  <IconBase {...p}>
    <path d="M20.4 14.6A8.8 8.8 0 0 1 9.4 3.6a8.8 8.8 0 1 0 11 11z" />
  </IconBase>
);

export const ChevronRightIcon = (p: UiIconProps) => (
  <IconBase {...p}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </IconBase>
);

export const SearchIcon = (p: UiIconProps) => (
  <IconBase {...p}>
    <circle cx="10.8" cy="10.8" r="6.8" />
    <path d="m15.8 15.8 4.4 4.4" />
  </IconBase>
);

export const OfflineIcon = (p: UiIconProps) => (
  <IconBase {...p}>
    <path d="M3 3.4 21 21" />
    <path d="M8.2 16.4a5.4 5.4 0 0 1 5.6-1.3" />
    <path d="M5 12.8a10 10 0 0 1 3.4-2.3M15.6 10.5a10 10 0 0 1 3.4 2.3" />
    <path d="M2.2 9.2A15 15 0 0 1 7 6.2M12 5.4a15 15 0 0 1 9.8 3.8" />
    <path d="M12 19.6h.01" />
  </IconBase>
);
