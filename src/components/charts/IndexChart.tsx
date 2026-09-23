/**
 * Indice de charge du tendon, en colonnes : une par journée, à la couleur de
 * sa bande.
 *
 * Dessin choisi par Mathieu le 23 septembre 2026 parmi quatre. C'est la forme
 * la plus concrète : chaque jour est un objet, et la couleur situe la journée
 * dans sa bande sans passer par l'axe. Les colonnes de plus de deux mois
 * s'effacent progressivement — au-delà elles deviennent des cheveux, et la
 * place va au présent. L'avenir projeté garde sa colonne, en creux.
 */
import { bandOf } from '../../lib/tendonIndex'
import { TEINTE_BANDE } from '../../lib/teintes'
import { indicesEtiquettes, POINTILLE, TRAIT_REPERE } from './etiquettes'
import { daysBetween, formatDay } from '../../lib/dates'

const W = 320
const H = 190
const P = { t: 8, r: 6, b: 22, l: 26 }
const IW = W - P.l - P.r
const IH = H - P.t - P.b
/** Au-delà de deux mois, la colonne s'efface. */
const MEMOIRE_JOURS = 60

export function IndexChart({ series, now }: { series: Array<{ day: string; idx: number }>; now: string }) {
  const n = series.length
  if (!n) return null

  const x = (i: number) => P.l + (n === 1 ? IW / 2 : (i * IW) / (n - 1))
  const y = (v: number) => P.t + IH - (Math.max(0, Math.min(100, v)) / 100) * IH
  // Une colonne par jour, moins un filet de fond entre deux.
  const largeur = Math.max(2, IW / n - 1.4)

  const etiquettes = indicesEtiquettes(n, x)
  const iAuj = series.findIndex((r) => r.day === now)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Indice de charge du tendon">
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grille)" strokeWidth={1} />
          <text x={P.l - 7} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--chart-texte)">
            {v}
          </text>
        </g>
      ))}

      {series.map((r, i) => {
        const futur = r.day > now
        const age = daysBetween(r.day, now)
        // Le fondu ne commence qu'après deux mois et ne descend pas sous 0,2 :
        // une colonne tout à fait effacée ferait croire à un trou de données.
        const fondu = age > MEMOIRE_JOURS ? Math.max(0.2, 1 - (age - MEMOIRE_JOURS) / 60) : 1
        return (
          <rect
            key={r.day}
            x={x(i) - largeur / 2}
            y={y(r.idx)}
            width={largeur}
            height={Math.max(1.5, y(0) - y(r.idx))}
            rx={Math.min(2.5, largeur / 2)}
            fill={TEINTE_BANDE[bandOf(r.idx).key]}
            opacity={futur ? 0.38 : fondu}
          >
            <title>{`${formatDay(r.day)} : ${r.idx} sur 100`}</title>
          </rect>
        )
      })}

      {/* Aujourd'hui garde un repère : sans lui, la frontière entre ce qui est
          mesuré et ce qui est projeté ne tient qu'à l'opacité. */}
      {iAuj >= 0 && (
        <line
          x1={x(iAuj)}
          x2={x(iAuj)}
          y1={P.t}
          y2={y(0)}
          stroke={TRAIT_REPERE}
          strokeWidth={1}
          strokeDasharray={POINTILLE}
          opacity={0.5}
        />
      )}

      {series.map((r, i) =>
        etiquettes.has(i) ? (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--chart-texte)">
            {formatDay(r.day)}
          </text>
        ) : null,
      )}
    </svg>
  )
}
