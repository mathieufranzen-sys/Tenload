/**
 * Le niveau en course à pied, semaine après semaine. Demandé le 22 septembre
 * 2026 : Suivi montrait le tendon et le volume, rien de ce qu'on gagne.
 *
 * `FormeChart` trace le marathon projeté, l'axe à l'envers pour que plus vite
 * se lise plus haut, avec l'objectif en pointillés. `EffortChart` montre ce
 * qui le fait bouger : l'effort perçu de la semaine contre l'effort attendu.
 * Les deux lisent exactement ce que lit `ajusterForme`, rien d'autre.
 */
import { formatDuration } from '../../lib/paces'
import { indicesEtiquettes, POINTILLE } from './etiquettes'

const W = 320
const H = 170
const P = { t: 12, r: 8, b: 22, l: 44 }
const IW = W - P.l - P.r
const IH = H - P.t - P.b

export interface PointForme {
  label: string
  /** Marathon projeté, en minutes. */
  minutes: number
  /** Assez de séances notées pour que le ressenti compte. */
  lu: boolean
}

export function FormeChart({ points, objectif }: { points: PointForme[]; objectif: number }) {
  const n = points.length
  if (!n) return null
  const valeurs = [...points.map((p) => p.minutes), objectif]
  const haut = Math.min(...valeurs) - 2
  const bas = Math.max(...valeurs) + 2
  const x = (i: number) => P.l + (n === 1 ? IW / 2 : (i * IW) / (n - 1))
  // Plus vite = plus haut : `haut` est le temps le plus court.
  const y = (m: number) => P.t + ((m - haut) / (bas - haut)) * IH
  const etiquettes = indicesEtiquettes(n, x)
  const graduations = [haut + 2, (haut + bas) / 2, bas - 2].map(Math.round)

  let d = ''
  points.forEach((p, i) => (d += `${i ? 'L' : 'M'}${x(i)} ${y(p.minutes)} `))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Marathon projeté par semaine">
      {graduations.map((m) => (
        <g key={m}>
          <line x1={P.l} x2={W - P.r} y1={y(m)} y2={y(m)} stroke="var(--chart-grille)" strokeWidth={1} />
          <text x={P.l - 6} y={y(m) + 3.5} textAnchor="end" fontSize={10} fill="var(--chart-texte)">
            {formatDuration(m).replace(' min', '')}
          </text>
        </g>
      ))}
      <line
        x1={P.l}
        x2={W - P.r}
        y1={y(objectif)}
        y2={y(objectif)}
        stroke="var(--chart-3)"
        strokeWidth={1.2}
        strokeDasharray={POINTILLE}
      />
      <text x={W - P.r} y={y(objectif) - 5} textAnchor="end" fontSize={10} fill="var(--chart-3)">
        Objectif {formatDuration(objectif).replace(' min', '')}
      </text>
      <path d={d} fill="none" stroke="var(--chart-1)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.minutes)}
          r={i === n - 1 ? 4.5 : 3}
          // Un seul remplissage : des points blancs puis verts sur la même
          // courbe se lisaient comme deux séries (retour du 23 septembre).
          fill="var(--chart-1)"
        />
      ))}
      {points.map((p, i) =>
        etiquettes.has(i) ? (
          <text key={`e${i}`} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--chart-texte)">
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  )
}

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
