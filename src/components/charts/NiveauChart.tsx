/**
 * Le niveau en course à pied, semaine après semaine. Demandé le 22 septembre
 * 2026 : Suivi montrait le tendon et le volume, rien de ce qu'on gagne.
 *
 * Le marathon projeté qui vivait ici est devenu `ChronoChart` (18 octobre
 * 2026), sur six mois et à la bonne ancre. `EffortChart` montre ce qui le
 * fait bouger : l'effort perçu contre l'effort attendu, exactement ce que
 * lit `ajusterForme`.
 */
import { indicesEtiquettes } from './etiquettes'

const W = 320
const P = { t: 12, r: 8, b: 22, l: 44 }
const IW = W - P.l - P.r

export interface PointEffort {
  label: string
  /** Effort perçu moins effort attendu, en points. Null sans séance notée. */
  ecart: number | null
}

export function EffortChart({ points }: { points: PointEffort[] }) {
  const n = points.length
  if (!n) return null
  const H2 = 150
  const IH2 = H2 - P.t - P.b
  const amplitude = Math.max(1.5, ...points.map((p) => Math.abs(p.ecart ?? 0))) * 1.15
  const slot = IW / n
  const bw = Math.max(3, Math.min(22, slot * 0.62))
  const x = (i: number) => P.l + i * slot + (slot - bw) / 2
  const zero = P.t + IH2 / 2
  const h = (v: number) => (Math.abs(v) / amplitude) * (IH2 / 2)
  const etiquettes = indicesEtiquettes(n, (i) => x(i) + bw / 2)

  return (
    <svg viewBox={`0 0 ${W} ${H2}`} width="100%" role="img" aria-label="Effort perçu contre effort attendu">
      <line x1={P.l} x2={W - P.r} y1={zero} y2={zero} stroke="var(--chart-grille)" strokeWidth={1.2} />
      <text x={4} y={P.t + 8} fontSize={10} fill="var(--chart-texte)">
        Plus dur
      </text>
      <text x={4} y={H2 - P.b - 2} fontSize={10} fill="var(--chart-texte)">
        Plus facile
      </text>
      {points.map((p, i) =>
        p.ecart == null ? (
          <circle key={i} cx={x(i) + bw / 2} cy={zero} r={1.6} fill="var(--chart-texte)" />
        ) : (
          <rect
            key={i}
            x={x(i)}
            y={p.ecart > 0 ? zero - h(p.ecart) : zero}
            width={bw}
            height={Math.max(1.5, h(p.ecart))}
            rx={Math.min(4, bw / 2)}
            // Plus facile que prévu fait descendre le chrono : c'est la bonne
            // direction, elle prend la couleur du niveau.
            fill={p.ecart > 0 ? 'var(--chart-2)' : 'var(--chart-1)'}
          />
        ),
      )}
      {points.map((p, i) =>
        etiquettes.has(i) ? (
          <text key={`e${i}`} x={x(i) + bw / 2} y={H2 - 6} textAnchor="middle" fontSize={10} fill="var(--chart-texte)">
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  )
}
