/**
 * Charge d'entraînement empilée, trois disciplines, par semaine.
 * Porté depuis reference/tendo-v3.html (`stackChart`), avec un correctif :
 * la série course est en bas, pas au-dessus — c'est celle qui compte le plus
 * pour Mathieu, elle doit garder une base à zéro constante pour rester lisible.
 * Vélo et autres (muscu, escalade, rando) empilés au-dessus, dans cet ordre.
 */
import { indicesEtiquettes } from './etiquettes'

const W = 320
const H = 176
const P = { t: 8, r: 6, b: 22, l: 28 }
const IW = W - P.l - P.r
const IH = H - P.t - P.b

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export interface StackRow {
  label: string
  course: number
  velo: number
  autre: number
  /**
   * Part de la barre qui vient du plan et non du réalisé. Une semaine passée
   * vaut 0, une semaine à venir vaut son total. La semaine en cours est
   * partagée : le début est déjà couru, la fin ne l'est pas.
   */
  projete?: { course: number; velo: number; autre: number }
}

const DISCIPLINES = [
  { cle: 'course', couleur: 'var(--chart-1)' },
  { cle: 'velo', couleur: 'var(--chart-2)' },
  { cle: 'autre', couleur: 'var(--chart-3)' },
] as const

export function LoadChart({ rows }: { rows: StackRow[] }) {
  const n = rows.length
  if (!n) return null

  const max = Math.max(...rows.map((r) => r.course + r.velo + r.autre), 1) * 1.1
  const slot = IW / n
  const bw = clamp(slot - Math.min(4, slot * 0.32), 2.5, 34)
  const x = (i: number) => P.l + i * slot + (slot - bw) / 2
  const y = (v: number) => P.t + IH - (v / max) * IH
  const etiquettes = indicesEtiquettes(n, x)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Charge d'entraînement par semaine">
      <defs>
        {/* Hachures : ce qui n'a pas encore été fait ne doit pas se lire comme
            un relevé. La couleur reste celle de la discipline, la texture dit
            que c'est le plan qui parle. */}
        <pattern id="projete" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="color-mix(in srgb, var(--bg) 55%, transparent)" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="color-mix(in srgb, var(--ink) 50%, transparent)" strokeWidth="2" />
        </pattern>
      </defs>
      {[0, 1, 2, 3, 4].map((k) => {
        const v = (max / 4) * k
        return (
          <g key={k}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grille)" strokeWidth={1} />
            <text x={P.l - 7} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--chart-texte)">
              {Math.round(v)}
            </text>
          </g>
        )
      })}
      {rows.map((r, i) => {
        // Chaque discipline s'empile en deux morceaux : le réalisé plein, la
        // projection hachurée par-dessus. Base commune à zéro, donc la course
        // reste comparable d'une semaine à l'autre.
        let base = 0
        const morceaux: Array<{ y: number; h: number; fill: string; op: number; cle: string }> = []
        for (const d of DISCIPLINES) {
          const total = r[d.cle]
          if (total <= 0) continue
          const proj = Math.min(total, r.projete?.[d.cle] ?? 0)
          const reel = total - proj
          for (const [part, projete] of [
            [reel, false],
            [proj, true],
          ] as const) {
            if (part <= 0) continue
            const haut = base + part
            morceaux.push({
              y: y(haut),
              h: Math.max(1, y(base) - y(haut)),
              fill: d.couleur,
              op: projete ? 0.42 : 1,
              cle: `${d.cle}-${projete ? 'p' : 'r'}`,
            })
            if (projete) {
              morceaux.push({ y: y(haut), h: Math.max(1, y(base) - y(haut)), fill: 'url(#projete)', op: 0.5, cle: `${d.cle}-h` })
            }
            base = haut
          }
        }
        return (
          <g key={i}>
            {morceaux.map((m) => (
              <rect key={m.cle} x={x(i)} y={m.y} width={bw} height={m.h} rx={2} fill={m.fill} opacity={m.op} />
            ))}
          </g>
        )
      })}
      {rows.map((r, i) =>
        etiquettes.has(i) ? (
          <text key={i} x={x(i) + bw / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--chart-texte)">
            {r.label}
          </text>
        ) : null,
      )}
    </svg>
  )
}
