const PATHS = {
  dashboard: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z',
  people:
    'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.500V20M10 11a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7M20 20v-1.500a3.500 3.500 0 0 0-2.500-3.350M15.500 4.150a3.500 3.500 0 0 1 0 6.700',
  add: 'M12 5v14M5 12h14',
  signOut: 'M10 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4M16 16l4-4-4-4M20 12H9',
  person: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 21a7 7 0 0 1 14 0',
  mail: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1M3.500 7.500l8.500 6 8.500-6',
  calendar: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1M4 10h16M8 3v4M16 3v4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.500 6.500l4 4',
  remove: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
  alert: 'M12 4l9 16H3zM12 10v4M12 17v.500',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1',
  key: 'M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 11h9M18 11v3M21 11v2',
  eye: 'M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  check: 'M5 12.500l4.500 4.500L19 7.500',
  close: 'M6 6l12 12M18 6L6 18',
  shield: 'M12 3l8 3v6c0 4.500-3.200 8-8 9-4.800-1-8-4.500-8-9V6zM9 12l2 2 4-4',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronUp: 'M5 15l7-7 7 7',
  chevronDown: 'M5 9l7 7 7-7',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  comment:
    'M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-7l-4 3.500V17H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1M8 9.500h8M8 13h5',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  tasks: 'M10 6h10M10 12h10M10 18h10M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5',
  tag: 'M4 4h7l9 9-7 7-9-9zM8 8h.010',
  folder: 'M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  board: 'M4 4h4v16H4zM10 4h4v11h-4zM16 4h4v7h-4z',
  archive: 'M4 5h16v4H4zM5 9v10h14V9M10 13h4',
  layers: 'M12 4l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
  cake: 'M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M5 16.500c1.500 1 3 1 4.500 0s3-1 4.500 0 3 1 4.500 0M12 12V9M12 9a1.500 1.500 0 0 1-1.500-1.500C10.500 6 12 4 12 4s1.500 2 1.500 3.500A1.500 1.500 0 0 1 12 9',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 16.500a4.500 4.500 0 1 0 0-9 4.500 4.500 0 0 0 0 9M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2M13 11l7-7M17 4h3v3',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12M9.500 9l1.700 1.700L14.500 7.500M8.500 14L7 21l5-2.500 5 2.500-1.500-7',
  clipboardCheck: 'M9 4h6v3H9zM9 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-3M9 14l2 2 4-4',
  building: 'M4 21V8l8-5 8 5v13M4 21h16M9 21v-5h6v5M8 11h.010M12 11h.010M16 11h.010',
  gift: 'M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM3 7h18v4H3zM12 7v14M12 7S10.500 3 8 3a2 2 0 0 0 0 4M12 7s1.500-4 4-4a2 2 0 0 1 0 4',
  camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
} as const

export type IconName = keyof typeof PATHS

export default function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
