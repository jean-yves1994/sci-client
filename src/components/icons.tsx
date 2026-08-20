import * as React from 'react';

/**
 * Inline SVG icons at a consistent 1.75 stroke weight.
 *
 * Local rather than an icon package: roughly twenty glyphs do not justify the
 * dependency, and keeping them here means the stroke weight is tuned to the
 * type rather than inherited from someone else's grid.
 */
type IconProps = { className?: string };

const base = (className?: string) => ({
  className: className ?? 'h-[18px] w-[18px]',
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconGrid = ({ className }: IconProps) => (
  <svg {...base(className)}><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>
);
export const IconClipboard = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1Z"/><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 12h6M9 16h4"/></svg>
);
export const IconCheckCircle = ({ className }: IconProps) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5L16 9.5"/></svg>
);
export const IconHome = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 21v-6h6v6"/></svg>
);
export const IconFile = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>
);
export const IconUsers = ({ className }: IconProps) => (
  <svg {...base(className)}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 14.5A5.5 5.5 0 0 1 20.5 20"/></svg>
);
export const IconBuilding = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M4 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15"/><path d="M12 21V10a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v11"/><path d="M7 9h2M7 13h2M7 17h2M15 13h2M15 17h2M3 21h18"/></svg>
);
export const IconLayers = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5"/></svg>
);
export const IconChart = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M3 21h18"/><rect x="5" y="12" width="3.5" height="6" rx="1"/><rect x="10.5" y="7" width="3.5" height="11" rx="1"/><rect x="16" y="4" width="3.5" height="14" rx="1"/></svg>
);
export const IconShield = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6Z"/><path d="m9.5 12 1.8 1.8L15 10"/></svg>
);
export const IconBell = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/></svg>
);
export const IconMapPin = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.8"/></svg>
);
export const IconClock = ({ className }: IconProps) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
);
export const IconAlert = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M10.3 4.3 2.6 18a1.7 1.7 0 0 0 1.5 2.5h15.8a1.7 1.7 0 0 0 1.5-2.5L13.7 4.3a1.7 1.7 0 0 0-3 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
);
export const IconArrowLeft = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
);
export const IconPlus = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M12 5v14M5 12h14"/></svg>
);
export const IconDownload = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
);
export const IconInbox = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M4 13h4l1.5 3h5L16 13h4"/><path d="M5.5 5h13l1.5 8v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4Z"/></svg>
);
export const IconCamera = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.2"/></svg>
);
export const IconSun = ({ className }: IconProps) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
);
export const IconMoon = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>
);
export const IconMonitor = ({ className }: IconProps) => (
  <svg {...base(className)}><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/></svg>
);
export const IconChevronLeft = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="m14 6-6 6 6 6"/></svg>
);
export const IconLogout = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>
);
export const IconUser = ({ className }: IconProps) => (
  <svg {...base(className)}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>
);
export const IconSearch = ({ className }: IconProps) => (
  <svg {...base(className)}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
);
export const IconFilter = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="M3 5h18l-7 8v6l-4 2v-8Z"/></svg>
);
export const IconTrend = ({ className }: IconProps) => (
  <svg {...base(className)}><path d="m3 16 5.5-5.5 3.5 3.5L21 5"/><path d="M15 5h6v6"/></svg>
);
