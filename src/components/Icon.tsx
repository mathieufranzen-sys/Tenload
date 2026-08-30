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
  bike: '<circle cx="5.5" cy="17" r="3.6"/><circle cx="18.5" cy="17" r="3.6"/><circle cx="14.5" cy="4.4" r="1.6"/><path d="M5.5 17l4-5.4h5l-3-3.6 3-2.2M14.5 11.6 18.5 17"/>',
  flag: '<path d="M5.5 21V3.5M5.5 4.6h11l-2 3.4 2 3.4h-11"/>',
  bolt: '<path d="M13.4 2.5 4.5 14h6.6l-1.5 7.5L19.5 10h-6.6l.5-7.5Z"/>',
  // Le même bonhomme que `run`, redressé et le pas plus court : c'est ce qui
  // distingue une marche d'une course, et rien d'autre.
  grip: '<path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01"/>',
  skip: '<path d="M5 5v14l9-7Z"/><path d="M18.5 5v14"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M3.5 9.5h17M8 3.2v3.4M16 3.2v3.4"/>',
  swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="M12.4 8.4 10 10.2l1.2 3.8L8.8 21M11.2 14l3.6 1.2 1.4 5.8M12.4 8.4c1.4-.6 3 0 3.6 1.4l.7 1.5 2.1.7"/>',
  /*
   * Trois coureurs pour les trois natures de course. Le même bonhomme à
   * chaque fois, ce qui garde la famille lisible ; ce qui l'entoure dit
   * laquelle.
   *
   * `runFast` : le coureur poussé vers la droite, trois traits de vitesse
   * derrière lui. `runPack` : le même avec un sac sur le dos, parce qu'une
   * sortie longue est la seule où l'on emporte de quoi tenir la distance.
   */
  runFast:
    '<circle cx="16" cy="4" r="2"/><path d="M14.2 8.2 11 10l1.6 3.6L9.5 21M12.6 13.6l4.4 1.4 1.6 5M14.2 8.2c1.6-.8 3.4-.4 4.4 1l.8 1.2 2.2.5"/><path d="M2 8.5h4M1.5 12.5h4.4M3 16.5h3.4"/>',
  runPack:
    '<g transform="translate(5.6 1.2) scale(.8)"><circle cx="14.5" cy="4" r="2"/><path d="M12.7 8.2 9.5 10l1.6 3.6L8 21M11.1 13.6l4.4 1.4 1.6 5M12.7 8.2c1.6-.8 3.4-.4 4.4 1l1 1.4 2.6.6"/></g><path d="M10.4 7.4v-.8a1.2 1.2 0 0 1 1.2-1.2h.4a1.2 1.2 0 0 1 1.2 1.2v.8"/><rect x="8.6" y="7.4" width="5" height="5.4" rx="1.6"/>',
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
