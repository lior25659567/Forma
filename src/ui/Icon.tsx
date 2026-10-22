const PATHS = {
  upload: 'M12 16V4m0 0L7 9m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'm15 14 5-5-5-5m5 5H10a6 6 0 0 0 0 12h3',
  save: 'M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4Zm3 0v5h7V4M8 20v-6h8v6',
  bag: 'M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2',
  close: 'M6 6l12 12M18 6 6 18',
  chevronDown: 'm6 9 6 6 6-6',
  chevronLeft: 'm15 6-6 6 6 6',
  chevronRight: 'm9 6 6 6-6 6',
  filter: 'M4 6h16M7 12h10M10 18h4',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  check: 'm5 12 5 5 9-10',
  external: 'M14 4h6v6m0-6-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  rooms: 'M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z',
  plus: 'M12 5v14M5 12h14',
  compare: 'M12 3v18M5 7h4v10H5zM15 7h4v10h-4z',
  history: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4m4-1v5l3 2',
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3l-7.8-13.6a2 2 0 0 0-3.4 0Z',
  sparkle: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M18 6l-2.5 2.5m-7 7L6 18',
  mark: 'M4 4h5M4 4v5M20 4h-5M20 4v5M4 20h5M4 20v-5M20 20h-5M20 20v-5',
  image: 'M4 5h16v14H4zM4 15l4-4 5 5 3-3 4 4M15 9h.01',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  ruler: 'M3 17 17 3l4 4L7 21l-4-4Zm4-4 2 2m2-6 2 2m2-6 2 2',
  trash: 'M5 7h14M10 7V5h4v2m-7 0 1 13h8l1-13',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--accent)" />
      <path d="M10 8h13v4h-8.5v3.5H21v4h-6.5V24H10z" fill="#fff" />
    </svg>
  );
}
