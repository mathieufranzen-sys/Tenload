/**
 * Douleur au fil des jours.
 *
 * Deux lectures de la même donnée : les trois moments séparés, ou leur somme.
 *
 * L'axe s'arrête juste au-dessus du pic réel au lieu d'aller au maximum
 * théorique. La douleur de Mathieu tourne autour de 1 ou 2 : sur un axe qui
 * montait jusqu'à 30 en cumulé, la courbe restait collée au sol, illisible, et
 * une hausse de 2 à 4 — celle qui déclenche l'adaptation du plan — ne se
 * voyait pas. Le seuil reste toujours dans le cadre : c'est la seule référence
 * du graphique, un axe qui le laisse sortir ne veut plus rien dire.
 */
import { formatDay } from '../../lib/dates'
import { indicesEtiquettes, POINTILLE } from './etiquettes'

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
  // Même épaisseur pour les trois depuis le 22 septembre : la fin de journée
  // se distingue déjà par sa couleur, et un trait plus gros la faisait lire
  // comme un total.
  { cle: 'evening', couleur: 'var(--chart-3)', epaisseur: 2 },
]

/**
 * Série continue : les jours sans mesure tiennent la valeur de la veille.
 *
 * Un jour de repos n'a pas de douleur à l'effort, mais ce n'est pas zéro — le
 * tendon reste où il en était. Couper le trait donnait à lire un trou dans le
 * carnet plutôt qu'une journée sans séance.
 *
 * La série ne démarre qu'à la première mesure : avant, il n'y a rien à
 * prolonger. Les points restent posés sur les seules valeurs mesurées, ce qui
 * distingue à l'œil ce qui est relevé de ce qui est tenu.
 */
export function continuer(valeurs: Array<number | null>): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = []
  let dernier: number | null = null
  valeurs.forEach((v, i) => {
    if (v != null) dernier = v
    if (dernier != null) out.push([i, dernier] as const)
  })
  return out
}

/**
 * Moyenne glissante centrée sur `fenetre` jours, sur les seules valeurs
 * mesurées. Demandé le 22 septembre 2026 : les points au jour le jour
 * sautaient d'un demi-point à l'autre et cachaient la tendance, qui est ce
 * qu'on vient lire ici. C'est un lissage d'affichage : l'indice, lui, lit
 * toujours les valeurs brutes.
 *
 * Un jour sans mesure dans toute sa fenêtre tient la valeur lissée de la
 * veille, pour la même raison que `continuer`. Rien avant la première mesure.
 */
export function lisser(valeurs: Array<number | null>, fenetre = 5): Array<readonly [number, number]> {
  const demi = Math.floor(fenetre / 2)
  const out: Array<readonly [number, number]> = []
  let dernier: number | null = null
  const premier = valeurs.findIndex((v) => v != null)
  if (premier < 0) return out
  for (let i = premier; i < valeurs.length; i++) {
    const autour = valeurs
      .slice(Math.max(0, i - demi), i + demi + 1)
      .filter((v): v is number => v != null)
    if (autour.length) dernier = autour.reduce((a, b) => a + b, 0) / autour.length
    if (dernier != null) out.push([i, dernier] as const)
  }
  return out
}

/**
 * Ordre d'empilement en cumulé, du bas vers le haut. Même couleur qu'en vue
 * séparée pour chaque mesure : basculer d'une vue à l'autre ne doit pas faire
 * changer la teinte de la douleur au réveil.
 */
const EMPILEMENT: Array<{ cle: keyof Omit<PainRow, 'day'>; couleur: string }> = [
  { cle: 'wake', couleur: 'var(--chart-1)' },
  { cle: 'effort', couleur: 'var(--chart-2)' },
  { cle: 'evening', couleur: 'var(--chart-3)' },
]

/**
 * Un maximum d'axe qui suit les données, avec des graduations rondes.
 *
 * `plafond` borne au maximum théorique de la vue (10 par mesure, 30 pour la
 * somme des trois) et `seuil` garantit que la ligne de référence reste dans le
 * cadre même quand la douleur est basse.
 */
export function echelle(
  valeurMax: number,
  seuil: number,
  plafond: number,
): { max: number; graduations: number[] } {
  const vise = Math.min(plafond, Math.max(valeurMax * 1.15, seuil * 1.25))
  for (const pas of [1, 2, 5, 10]) {
    const marches = Math.ceil(vise / pas)
    if (marches > 6) continue
    const max = Math.min(plafond, pas * marches)
    const graduations: number[] = []
    for (let v = 0; v < max - 1e-9; v += pas) graduations.push(v)
    graduations.push(max)
    return { max, graduations }
  }
  return { max: plafond, graduations: [0, plafond / 2, plafond] }
}

export function PainChart({ rows, vue }: { rows: PainRow[]; vue: VuePain }) {
  const n = rows.length
  if (!n) return null

  const cumulee = vue === 'cumulee'
  const seuil = cumulee ? 12 : 4

  const valeurMax = rows.reduce(
    (m, r) =>
      Math.max(
        m,
        cumulee
          ? (r.wake ?? 0) + (r.effort ?? 0) + (r.evening ?? 0)
          : Math.max(r.wake ?? 0, r.effort ?? 0, r.evening ?? 0),
      ),
    0,
  )
  const { max, graduations } = echelle(valeurMax, seuil, cumulee ? 30 : 10)

  const x = (i: number) => P.l + (n === 1 ? IW / 2 : (i * IW) / (n - 1))
  const y = (v: number) => P.t + IH - (Math.max(0, Math.min(max, v)) / max) * IH
  const etiquettes = indicesEtiquettes(n, x)

  /**
   * Une courbe et non une ligne brisée : Catmull-Rom converti en Bézier
   * cubiques. Les angles d'une ligne brisée se lisaient comme des événements
   * alors que la série est déjà lissée.
   */
  const trace = (points: Array<readonly [number, number]>) => {
    const p = points.map(([i, v]) => [x(i), y(v)] as const)
    if (!p.length) return ''
    let d = `M${p[0][0]} ${p[0][1]}`
    for (let k = 0; k < p.length - 1; k++) {
      const [x0, y0] = p[k - 1] ?? p[k]
      const [x1, y1] = p[k]
      const [x2, y2] = p[k + 1]
      const [x3, y3] = p[k + 2] ?? p[k + 1]
      const c1 = [x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6]
      const c2 = [x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6]
      // Les points de contrôle restent dans le cadre : une courbe qui
      // plonge sous zéro dirait une douleur négative.
      const borne = (v: number) => Math.min(P.t + IH, Math.max(P.t, v))
      d += ` C${c1[0]} ${borne(c1[1])} ${c2[0]} ${borne(c2[1])} ${x2} ${y2}`
    }
    return d
  }

  /**
   * Surface empilée, du bas `basValeurs[i]` au haut `hautValeurs[i]`. Un
   * polygone fermé plutôt que trois lignes : c'est ce qui donne l'empilement
   * plein, comme la référence, plutôt qu'un simple faisceau de courbes.
   */
  const surface = (basValeurs: number[], hautValeurs: number[]): string => {
    let d = `M${x(0)} ${y(hautValeurs[0])} `
    for (let i = 1; i < n; i++) d += `L${x(i)} ${y(hautValeurs[i])} `
    for (let i = n - 1; i >= 0; i--) d += `L${x(i)} ${y(basValeurs[i])} `
    return d + 'Z'
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Douleur par jour">
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
        // Un trait neutre : en cumulé, chart-3 sert déjà de couleur de remplissage
        // à une des trois couches, un seuil de la même teinte s'y serait fondu.
        stroke={cumulee ? 'color-mix(in srgb, var(--ink) 55%, transparent)' : 'var(--chart-3)'}
        strokeWidth={1}
        strokeDasharray={POINTILLE}
        opacity={cumulee ? 1 : 0.5}
      />
      <text
        x={W - P.r}
        y={y(seuil) - 6}
        textAnchor="end"
        fontSize={10}
        fill={cumulee ? 'var(--chart-texte)' : 'var(--chart-3)'}
        opacity={0.85}
      >
        seuil {seuil}
      </text>

      {cumulee ? (
        (() => {
          // Chaque jour sans aucune saisie ne contribue à aucune couche : un
          // zéro forcé aurait affiché un creux au sol, comme si le tendon
          // n'avait rien senti ce jour-là plutôt que rien mesuré.
          let cumul = new Array(n).fill(0)
          return (
            <g>
              {EMPILEMENT.map(({ cle, couleur }) => {
                const precedent = [...cumul]
                cumul = rows.map((r, i) => precedent[i] + (r[cle] ?? 0))
                const d = surface(precedent, cumul)
                // Le contour reprend la couleur de sa propre couche : un liseré
                // blanc débordait visiblement des pics, y compris hors du
                // cadre du graphique sur les points d'extrémité.
                return <path key={cle} d={d} fill={couleur} stroke={couleur} strokeWidth={1} opacity={0.82} />
              })}
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
              {/* La courbe porte la tendance lissée ; les points, discrets, ne
                  se posent que sur du mesuré, pour qu'on voie encore ce qui a
                  été relevé sous ce qui est moyenné. */}
              <path
                d={trace(lisser(rows.map((r) => r[cle]), 7))}
                fill="none"
                stroke={couleur}
                strokeWidth={epaisseur}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {pts.map(([i, v]) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={1.8} fill={couleur} opacity={0.35} />
              ))}
            </g>
          )
        })
      )}

      {rows.map((r, i) =>
        etiquettes.has(i) ? (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--chart-texte)">
            {formatDay(r.day)}
          </text>
        ) : null,
      )}
    </svg>
  )
}
