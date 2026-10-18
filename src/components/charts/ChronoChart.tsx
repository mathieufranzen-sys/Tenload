/**
 * Le chrono équivalent d'une distance sur six mois, l'objectif en pointillés
 * (18 octobre 2026). L'axe est à l'envers, plus vite se lit plus haut, comme
 * le marathon projeté. Les ancres (test, courses) sont des points pleins
 * étiquetés : ce sont elles qui font les marches, le ressenti ne fait que
 * les nuancer entre deux.
 */
import { addDays } from '../../lib/dates'
import { formatChrono } from '../../lib/dossards'
import { POINTILLE } from './etiquettes'

const W = 320
const H = 180
const P = { t: 16, r: 10, b: 22, l: 50 }
const IW = W - P.l - P.r
const IH = H - P.t - P.b
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export interface PointChrono {
  day: string
  secondes: number | null
  /** Le nom de l'ancre posée ce jour-là. */
  ancre?: string
}

const jours = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000)

export function ChronoChart({ points, objectif, debut, fin }: { points: PointChrono[]; objectif: number; debut: string; fin: string }) {
  const connus = points.filter((p): p is PointChrono & { secondes: number } => p.secondes != null)
  if (!connus.length) return null
  const valeurs = [...connus.map((p) => p.secondes), objectif]
  const marge = Math.max(30, (Math.max(...valeurs) - Math.min(...valeurs)) * 0.12)
  const haut = Math.min(...valeurs) - marge
  const bas = Math.max(...valeurs) + marge
  const total = Math.max(1, jours(debut, fin))
  const x = (day: string) => P.l + (jours(debut, day) / total) * IW
  const y = (s: number) => P.t + ((s - haut) / (bas - haut)) * IH

  const d = connus.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)} ${y(p.secondes).toFixed(1)}`).join(' ')
  // Des graduations rondes : 30 s, 1, 2, 5 ou 10 min selon l'échelle.
  const pas = [30, 60, 120, 300, 600, 900].find((p) => (bas - haut) / p <= 4) ?? 1800
  const graduations: number[] = []
  for (let s = Math.ceil(haut / pas) * pas; s <= bas; s += pas) graduations.push(s)

  // Une étiquette par début de mois, sauf si elle colle au bord gauche.
  const mois: Array<{ day: string; libelle: string }> = []
  for (let day = debut; day <= fin; day = addDays(day, 1))
    if (day.endsWith('-01') && x(day) - P.l > 14) mois.push({ day, libelle: MOIS[Number(day.slice(5, 7)) - 1] })

  const dernier = connus[connus.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Chrono équivalent sur six mois">
      {graduations.map((s) => (
        <g key={s}>
          <line x1={P.l} x2={W - P.r} y1={y(s)} y2={y(s)} stroke="var(--chart-grille)" strokeWidth={1} />
          <text x={P.l - 6} y={y(s) + 3.5} textAnchor="end" fontSize={10} fill="var(--chart-texte)">
            {formatChrono(s)}
          </text>
        </g>
      ))}
      <line x1={P.l} x2={W - P.r} y1={y(objectif)} y2={y(objectif)} stroke="var(--chart-2)" strokeWidth={1.2} strokeDasharray={POINTILLE} />
      <text x={P.l + 4} y={y(objectif) - 5} fontSize={10} fill="var(--chart-2)">
        Visé {formatChrono(objectif)}
      </text>
      <path d={d} fill="none" stroke="var(--chart-1)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {connus
        .filter((p) => p.ancre)
        .map((p) => (
          <g key={p.day}>
            <circle cx={x(p.day)} cy={y(p.secondes)} r={4} fill="var(--chart-1)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        ))}
      <circle cx={x(dernier.day)} cy={y(dernier.secondes)} r={4.5} fill="var(--chart-1)" />
      <text x={x(dernier.day)} y={y(dernier.secondes) - 9} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--ink)">
        {formatChrono(dernier.secondes)}
      </text>
      {mois.map((m) => (
        <text key={m.day} x={x(m.day)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--chart-texte)">
          {m.libelle}
        </text>
      ))}
    </svg>
  )
}
