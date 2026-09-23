/**
 * Le rapport aigu sur chronique, avec ses plages de lecture.
 *
 * Il compare ce que tu viens de faire (demi-vie 3,5 jours) à ce que tu fais
 * d'habitude (14 jours). Ce n'est pas une mesure de fatigue mais de
 * CHANGEMENT : autour de 1 la semaine ressemble aux précédentes, au-dessus de
 * 1,3 elle ajoute d'un coup ce que le tendon n'a pas appris à encaisser.
 *
 * Les plages sont dessinées derrière la courbe, pas expliquées en légende :
 * un seuil qu'il faut aller lire ailleurs n'est pas un seuil.
 */
import { formatDay } from '../../lib/dates'
import { POINTILLE, TRAIT_REPERE } from './etiquettes'

export interface PointRatio {
  day: string
  /** Le rapport lui-même, 1 = comme d'habitude. */
  acr: number
}

// Mêmes dimensions et mêmes marges que les autres graphiques de Suivi :
// deux tracés qui ne commencent pas à la même abscisse ne se comparent pas.
const W = 320
const H = 190
const P = { t: 8, r: 6, b: 22, l: 26 }
/** Les trois plages : sous-charge, zone sûre, emballement. */
const PLAGES: Array<{ de: number; a: number; fond: string; libelle: string }> = [
  // Palette choisie par Mathieu le 23 septembre 2026 : la zone sûre est
  // BLANCHE. Tant que rien ne cloche, rien ne s'allume ; l'ambre du haut ne
  // sort que quand on en sort, et le gris du bas dit la décharge. C'est la
  // règle de l'app, la couleur seulement quand elle dit quelque chose.
  { de: 0, a: 0.8, fond: 'var(--surface-3)', libelle: 'Sous 0,8' },
  { de: 0.8, a: 1.3, fond: 'var(--surface-2)', libelle: 'Zone sûre' },
  { de: 1.3, a: 2, fond: 'var(--orange-300)', libelle: 'Au-dessus de 1,3' },
]

export function RatioChart({ points, now }: { points: PointRatio[]; now: string }) {
  if (points.length < 2) return null
  const haut = 2
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / (points.length - 1)
  const y = (v: number) => P.t + (1 - Math.min(haut, Math.max(0, v)) / haut) * (H - P.t - P.b)

  const trace = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.acr)}`).join(' ')
  const iAuj = points.findIndex((p) => p.day === now)
  const etiquettes = [0, Math.floor(points.length / 2), points.length - 1]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Rapport aigu sur chronique">
        {PLAGES.map((z) => (
          <rect key={z.de} x={P.l} y={y(z.a)} width={W - P.l - P.r} height={y(z.de) - y(z.a)} fill={z.fond} />
        ))}
        {[0.8, 1, 1.3].map((v) => (
          <g key={v}>
            <line
              x1={P.l}
              x2={W - P.r}
              y1={y(v)}
              y2={y(v)}
              stroke={v === 1 ? 'var(--chart-grille)' : TRAIT_REPERE}
              strokeWidth={1}
              strokeDasharray={v === 1 ? undefined : POINTILLE}
              opacity={v === 1 ? 1 : 0.5}
            />
            <text x={P.l - 7} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--chart-texte)">
              {v.toFixed(1).replace('.', ',')}
            </text>
          </g>
        ))}
        {/* La courbe prend l'encre de l'app : sur des plages franches, un
            bleu nuit se confondait avec les traits de seuil. */}
        <path d={trace} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" />
        {iAuj >= 0 && <circle cx={x(iAuj)} cy={y(points[iAuj].acr)} r={4} fill="var(--ink)" />}
        {etiquettes.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize={10} fill="var(--chart-texte)">
            {formatDay(points[i].day)}
          </text>
        ))}
      </svg>

      {/* La légende tient sur une ligne : trois plages, trois bornes. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'nowrap', overflow: 'hidden' }}>
        {PLAGES.map((z) => (
          <span
            key={z.de}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 'var(--fs-detail)',
              color: 'var(--sur-ink-2)',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: 12,
                height: 10,
                borderRadius: 3,
                background: z.fond,
                boxShadow: 'inset 0 0 0 1px var(--border)',
                flex: 'none',
              }}
            />
            {z.libelle}
          </span>
        ))}
      </div>
    </div>
  )
}
