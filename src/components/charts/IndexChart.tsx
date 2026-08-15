/**
 * Indice de charge du tendon avec bandes de fond et projection en pointillés.
 * Porté depuis reference/tendo-v3.html (`idxChart`).
 */
import { bandOf } from '../../lib/tendonIndex'
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

  const chemin = (from: number, to: number) => {
    if (to < from) return ''
    let d = ''
    for (let i = from; i <= to; i++) d += `${i === from ? 'M' : 'L'}${x(i)} ${y(series[i].idx)} `
    return d
  }

  const stepX = Math.max(1, Math.ceil(n / 5))

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

      {series.map((r, i) =>
        i > cut ? null : (
          <circle key={i} cx={x(i)} cy={y(r.idx)} r={2.6} fill={bandOf(r.idx).color} stroke="var(--surface)" strokeWidth={1.6} />
        ),
      )}
      {cut >= 0 && (
        <circle cx={x(cut)} cy={y(series[cut].idx)} r={5} fill={bandOf(series[cut].idx).color} stroke="var(--surface)" strokeWidth={2.5} />
      )}

      {series.map((r, i) =>
        i % stepX === 0 || i === n - 1 ? (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--chart-texte)">
            {formatDay(r.day)}
          </text>
        ) : null,
      )}
    </svg>
  )
}
