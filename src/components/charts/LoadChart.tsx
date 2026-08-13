/**
 * Charge d'entraînement empilée, course et autres disciplines, par semaine.
 * Porté depuis reference/tendo-v3.html (`stackChart`), avec un correctif :
 * la série course est en bas, pas au-dessus — c'est celle qui compte le plus
 * pour Mathieu, elle doit garder une base à zéro constante pour rester lisible.
 */
const W = 320
const H = 176
const P = { t: 8, r: 6, b: 22, l: 28 }
const IW = W - P.l - P.r
const IH = H - P.t - P.b

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export interface StackRow {
  label: string
  course: number
  autres: number
}

export function LoadChart({ rows }: { rows: StackRow[] }) {
  const n = rows.length
  if (!n) return null

  const max = Math.max(...rows.map((r) => r.course + r.autres), 1) * 1.1
  const slot = IW / n
  const bw = clamp(slot - Math.min(4, slot * 0.32), 2.5, 34)
  const x = (i: number) => P.l + i * slot + (slot - bw) / 2
  const y = (v: number) => P.t + IH - (v / max) * IH
  const stepX = Math.max(1, Math.ceil(n / 6))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Charge d'entraînement par semaine">
      {[0, 1, 2, 3, 4].map((k) => {
        const v = (max / 4) * k
        return (
          <g key={k}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={1} />
            <text x={P.l - 7} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--muted)">
              {Math.round(v)}
            </text>
          </g>
        )
      })}
      {rows.map((r, i) => {
        const hCourse = Math.max(0, IH - (y(r.course) - P.t))
        const hAutres = Math.max(0, IH - (y(r.autres) - P.t))
        return (
          <g key={i}>
            {r.course > 0 && <rect x={x(i)} y={y(r.course)} width={bw} height={hCourse} rx={2} fill="var(--series-1)" />}
            {r.autres > 0 && (
              <rect x={x(i)} y={y(r.course + r.autres)} width={bw} height={Math.max(1, hAutres - 2)} rx={2} fill="var(--series-3)" />
            )}
          </g>
        )
      })}
      {rows.map((r, i) =>
        i % stepX === 0 || i === n - 1 ? (
          <text key={i} x={x(i) + bw / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--muted)">
            {r.label}
          </text>
        ) : null,
      )}
    </svg>
  )
}
