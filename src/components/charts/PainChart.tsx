/**
 * Douleur au fil des jours.
 *
 * Deux lectures de la même donnée : les trois moments séparés, ou leur somme.
 * En cumulé l'échelle passe à 30 — additionner trois mesures sur 10 sans
 * changer l'axe écraserait la courbe contre le bas et donnerait l'illusion
 * que tout va bien.
 */
import { formatDay } from '../../lib/dates'

const W = 320
const H = 182
const P = { t: 8, r: 6, b: 22, l: 26 }
const IW = W - P.l - P.r
const IH = H - P.t - P.b

export type VuePain = 'separee' | 'cumulee'

export interface PainRow {
  day: string
  wake: number | null
  effort: number | null
  evening: number | null
}

const SERIES: Array<{ cle: keyof Omit<PainRow, 'day'>; couleur: string; epaisseur: number }> = [
  { cle: 'wake', couleur: 'var(--chart-1)', epaisseur: 2 },
  { cle: 'effort', couleur: 'var(--chart-2)', epaisseur: 2 },
  // La fin de journée est le signal le plus fiable : on l'épaissit pour
  // qu'elle se lise en premier quand les trois courbes se croisent.
  { cle: 'evening', couleur: 'var(--chart-3)', epaisseur: 2.8 },
]

export function PainChart({ rows, vue }: { rows: PainRow[]; vue: VuePain }) {
  const n = rows.length
  if (!n) return null

  const cumulee = vue === 'cumulee'
  const max = cumulee ? 30 : 10
  const seuil = cumulee ? 12 : 4

  const x = (i: number) => P.l + (n === 1 ? IW / 2 : (i * IW) / (n - 1))
  const y = (v: number) => P.t + IH - (Math.max(0, Math.min(max, v)) / max) * IH
  const stepX = Math.max(1, Math.ceil(n / 5))
  const graduations = cumulee ? [0, 6, 12, 18, 24, 30] : [0, 2, 4, 6, 8, 10]

  /** Somme des trois mesures du jour, null si aucune n'est saisie. */
  const somme = (r: PainRow): number | null => {
    const vs = [r.wake, r.effort, r.evening].filter((v): v is number => v != null)
    return vs.length ? vs.reduce((a, b) => a + b, 0) : null
  }

  const trace = (points: Array<readonly [number, number]>) => {
    let d = ''
    let prec: number | null = null
    for (const [i, v] of points) {
      d += `${prec !== null && i === prec + 1 ? 'L' : d ? ' M' : 'M'}${x(i)} ${y(v)} `
      prec = i
    }
    return d
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Douleur au fil des jours">
      {graduations.map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grille)" strokeWidth={1} />
          <text x={P.l - 7} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--chart-texte)">
            {v}
          </text>
        </g>
      ))}

      <line
        x1={P.l}
        x2={W - P.r}
        y1={y(seuil)}
        y2={y(seuil)}
        stroke="var(--chart-3)"
        strokeWidth={1}
        strokeDasharray="3 4"
        opacity={0.5}
      />
      <text x={W - P.r} y={y(seuil) - 6} textAnchor="end" fontSize={10} fill="var(--chart-3)" opacity={0.85}>
        seuil {seuil}
      </text>

      {cumulee ? (
        (() => {
          const pts = rows
            .map((r, i) => [i, somme(r)] as const)
            .filter((p): p is readonly [number, number] => p[1] != null)
          if (!pts.length) return null
          return (
            <g>
              <path
                d={trace(pts)}
                fill="none"
                stroke="var(--chart-2)"
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {pts.map(([i, v]) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={3} fill="var(--chart-2)" stroke="var(--bg)" strokeWidth={2} />
              ))}
            </g>
          )
        })()
      ) : (
        SERIES.map(({ cle, couleur, epaisseur }) => {
          const pts = rows
            .map((r, i) => [i, r[cle]] as const)
            .filter((p): p is readonly [number, number] => p[1] != null)
          if (!pts.length) return null
          return (
            <g key={cle}>
              <path
                d={trace(pts)}
                fill="none"
                stroke={couleur}
                strokeWidth={epaisseur}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {pts.map(([i, v]) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={2.8} fill={couleur} stroke="var(--bg)" strokeWidth={1.8} />
              ))}
            </g>
          )
        })
      )}

      {rows.map((r, i) =>
        i % stepX === 0 || i === n - 1 ? (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--chart-texte)">
            {formatDay(r.day)}
          </text>
        ) : null,
      )}
    </svg>
  )
}
