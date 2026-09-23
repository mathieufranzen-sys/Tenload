/**
 * Indice de charge du tendon : la tendance lissée sur 7 jours, les valeurs
 * brutes en points derrière, et la projection en pointillés.
 *
 * Lissée comme la douleur juste en dessous (arbitré le 23 septembre 2026) :
 * l'indice est un état du jour, il monte et descend de dix points d'une
 * journée à l'autre, et la dent de scie cachait la saison. Les pics restent
 * en points : chez un tendon, c'est le pic qui blesse, pas la moyenne.
 */
import { bandOf } from '../../lib/tendonIndex'
import { TEINTE_BANDE } from '../../lib/teintes'
import { indicesEtiquettes } from './etiquettes'
import { lisser } from './PainChart'
import { formatDay } from '../../lib/dates'

const W = 320
const H = 190
const P = { t: 8, r: 6, b: 22, l: 26 }
const IW = W - P.l - P.r
const IH = H - P.t - P.b

export function IndexChart({ series, now }: { series: Array<{ day: string; idx: number }>; now: string }) {
  const n = series.length
  if (!n) return null

  const x = (i: number) => P.l + (n === 1 ? IW / 2 : (i * IW) / (n - 1))
  const y = (v: number) => P.t + IH - (Math.max(0, Math.min(100, v)) / 100) * IH

  const iFut = series.findIndex((r) => r.day > now)
  const cut = iFut < 0 ? n - 1 : iFut - 1

  // La courbe suit la moyenne glissante ; les points, eux, restent bruts.
  const lisse = new Map(lisser(series.map((r) => r.idx), 7))
  const val = (i: number) => lisse.get(i) ?? series[i].idx

  const chemin = (from: number, to: number) => {
    if (to < from) return ''
    let d = ''
    for (let i = from; i <= to; i++) d += `${i === from ? 'M' : 'L'}${x(i)} ${y(val(i))} `
    return d
  }

  const etiquettes = indicesEtiquettes(n, x)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Indice de charge du tendon">
      {/* Le fond reste celui de la carte, comme sur « Douleur au fil des
          jours » : les bandes teintées derrière la courbe la rendaient plus
          dure à lire qu'à informer. La couleur des points suffit à situer
          chaque jour dans sa bande. */}
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grille)" strokeWidth={1} />
          <text x={P.l - 7} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--chart-texte)">
            {v}
          </text>
        </g>
      ))}

      <path d={chemin(0, cut)} fill="none" stroke="var(--chart-ligne)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={chemin(Math.max(0, cut), n - 1)}
        fill="none"
        stroke="var(--chart-ligne)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 4"
        opacity={0.6}
      />

      {/* Les valeurs brutes, sans contour : elles se lisent comme un nuage
          derrière la tendance, et chaque point garde la couleur de sa bande. */}
      {series.map((r, i) =>
        i > cut ? null : <circle key={i} cx={x(i)} cy={y(r.idx)} r={2.2} fill={TEINTE_BANDE[bandOf(r.idx).key]} opacity={0.85} />,
      )}
      {cut >= 0 && (
        <circle cx={x(cut)} cy={y(series[cut].idx)} r={5} fill={TEINTE_BANDE[bandOf(series[cut].idx).key]} stroke="var(--surface)" strokeWidth={2.5} />
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
