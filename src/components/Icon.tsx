import type { CSSProperties } from 'react'

/** Traits SVG minimalistes, portés depuis reference/tendo-v3.html (fonction `I`). */
const PATHS: Record<string, string> = {
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>',
  clip: '<rect x="5" y="4" width="14" height="17" rx="2.4"/><path d="M9 4V2.8h6V4M8.5 9.5h7M8.5 13h7M8.5 16.5h4"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-6M22 20H2"/>',
  gauge:
    '<path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z"/><path d="M12 12l4.2-4.2"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H10a3 3 0 0 1 2 5.2V21a3 3 0 0 0-2-.8H5.5A1.5 1.5 0 0 1 4 18.7Z"/><path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H14a3 3 0 0 0-2 5.2V21a3 3 0 0 1 2-.8h4.5A1.5 1.5 0 0 0 20 18.7Z"/>',
  alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 9v5M12 17.2v.1"/>',
  up: '<path d="M4 15l4-4 4 4M12 15l4-6 4 6"/>',
  rest: '<path d="M20 14a8 8 0 1 1-9.9-9.9A6.5 6.5 0 0 0 20 14Z"/>',
  check: '<path d="M4 12.5 9 17.5 20 6.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  run: '<circle cx="14.5" cy="4" r="2"/><path d="M12.7 8.2 9.5 10l1.6 3.6L8 21M11.1 13.6l4.4 1.4 1.6 5M12.7 8.2c1.6-.8 3.4-.4 4.4 1l1 1.4 2.6.6"/>',
  down: '<path d="M4 9l4 4 4-4M12 9l4 6 4-6"/>',
  dumb: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
  heart: '<path d="M12 20s-7-4.4-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7 2.6c0 5-7 9.4-7 9.4Z"/>',
  climb: '<circle cx="15" cy="4.5" r="2"/><path d="M13 8l-3.5 2.5L11 15l-2 6M11 15l4 1 1.5 5M9.5 10.5 5 9"/>',
  chevronLeft: '<path d="M14.5 5 8 12l6.5 7"/>',
  chevronRight: '<path d="M9.5 5 16 12l-6.5 7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1.6-3.6 4.8-5.5 8-5.5s6.4 1.9 8 5.5"/>',
}

export function Icon({
  name,
  size = 20,
  style,
}: {
  name: keyof typeof PATHS
  size?: number
  style?: CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.9}
      style={{ flex: 'none', ...style }}
      dangerouslySetInnerHTML={{ __html: PATHS[name] ?? '' }}
    />
  )
}
