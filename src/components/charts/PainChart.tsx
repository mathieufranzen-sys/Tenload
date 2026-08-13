/**
 * Douleur trois séries (réveil, effort, soir), avec le seuil d'adaptation à 4.
 * Porté depuis reference/tendo-v3.html (`lineChart`).
 */
import { formatDay } from '../../lib/dates'

const W = 320
const H = 182
const P = { t: 8, r: 6, b: 22, l: 26 }
const IW = W - P.l - P.r
const IH = H - P.t - P.b

export interface PainRow {
  day: string
  wake: number | null
  effort: number | null
  evening: number | null
}

const SERIES: Array<{ cle: keyof Omit<PainRow, 'day'>; couleur: string }> = [
  { cle: 'wake', couleur: 'var(--series-1)' },
  { cle: 'effort', couleur: 'var(--series-2)' },
  { cle: 'evening', couleur: 'var(--series-3)' },
]

export function PainChart({ rows }: { rows: PainRow[] }) {
  const n = rows.length
  if (!n) return null

  const x = (i: number) => P.l + (n === 1 ? IW / 2 : (i * IW) / (n - 1))
  const y = (v: number) => P.t + IH - (Math.max(0, Math.min(10, v)) / 10) * IH
  const stepX = Math.max(1, Math.ceil(n / 5))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Douleur au fil des jours">
      {[0, 2, 4, 6, 8, 10].map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={1} />
          <text x={P.l - 7} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--muted)">
            {v}
          </text>
        </g>
      ))}
      <line x1={P.l} x2={W - P.r} y1={y(4)} y2={y(4)} stroke="var(--warning)" strokeWidth={1} strokeDasharray="3 4" opacity={0.55} />
      <text x={W - P.r} y={y(4) - 6} textAnchor="end" fontSize={10} fill="var(--warning)" opacity={0.9}>
        seuil 4
      </text>

      {SERIES.map(({ cle, couleur }) => {
        const pts = rows.map((r, i) => [i, r[cle]] as const).filter((p): p is [number, number] => p[1] != null)
        if (!pts.length) return null
        let d = ''
        let prev: number | null = null
        for (const [i, v] of pts) {
          d += `${prev !== null && i === prev + 1 ? 'L' : d ? ' M' : 'M'}${x(i)} ${y(v)} `
          prev = i
        }
        return (
          <g key={cle}>
            <path d={d} fill="none" stroke={couleur} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {pts.map(([i, v]) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={3} fill={couleur} stroke="var(--surface)" strokeWidth={2} />
            ))}
          </g>
        )
      })}

      {rows.map((r, i) =>
        i % stepX === 0 || i === n - 1 ? (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--muted)">
            {formatDay(r.day)}
          </text>
        ) : null,
      )}
    </svg>
  )
}
