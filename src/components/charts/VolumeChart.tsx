/**
 * Volume par semaine.
 *
 * Deux lectures : la course seule — le seul impact au sol, donc la seule
 * charge qui use le tendon — ou le cumul avec le vélo, qui dit le volume
 * aérobie réel. Les deux comptent, mais pas pour la même chose.
 */
const W = 320
const H = 176
const P = { t: 8, r: 6, b: 22, l: 26 }
const IW = W - P.l - P.r
const IH = H - P.t - P.b

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export type VueVolume = 'course' | 'cumul'

export interface BarRow {
  label: string
  course: number
  velo: number
}

export function VolumeChart({ rows, vue }: { rows: BarRow[]; vue: VueVolume }) {
  const n = rows.length
  if (!n) return null

  const cumul = vue === 'cumul'
  const totalDe = (r: BarRow) => (cumul ? r.course + r.velo : r.course)

  const max = Math.max(...rows.map(totalDe), 1) * 1.1
  const slot = IW / n
  const bw = clamp(slot - Math.min(4, slot * 0.32), 2.5, 34)
  const x = (i: number) => P.l + i * slot + (slot - bw) / 2
  const y = (v: number) => P.t + IH - (v / max) * IH
  const stepX = Math.max(1, Math.ceil(n / 6))
  const rayon = Math.min(4, bw / 2)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Volume par semaine">
      {[0, 1, 2, 3, 4].map((t) => {
        const v = (max / 4) * t
        return (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grille)" strokeWidth={1} />
            <text x={P.l - 7} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--chart-texte)">
              {Math.round(v)}
            </text>
          </g>
        )
      })}

      {rows.map((r, i) => {
        const hCourse = Math.max(2, IH - (y(r.course) - P.t))
        const hVelo = Math.max(0, IH - (y(r.velo) - P.t))
        return (
          <g key={i}>
            {/* La course est toujours à la base : c'est la série de référence,
                elle doit garder un pied à zéro pour rester comparable. */}
            <rect x={x(i)} y={y(r.course)} width={bw} height={hCourse} rx={rayon} fill="var(--chart-1)" />
            {cumul && r.velo > 0 && (
              <rect
                x={x(i)}
                y={y(r.course + r.velo)}
                width={bw}
                height={Math.max(1, hVelo - 2)}
                rx={rayon}
                fill="var(--chart-2)"
                opacity={0.85}
              />
            )}
          </g>
        )
      })}

      {rows.map((r, i) =>
        i % stepX === 0 || i === n - 1 ? (
          <text key={i} x={x(i) + bw / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--chart-texte)">
            {r.label}
          </text>
        ) : null,
      )}
    </svg>
  )
}
