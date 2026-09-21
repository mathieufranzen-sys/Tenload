/**
 * Le plan entier en une grille de pastilles, une ligne par semaine.
 *
 * Refonte du 21 septembre 2026, d'après la maquette. Deux lectures dans la
 * même grille, séparées par aujourd'hui : DERRIÈRE, chaque jour prend la
 * teinte de sa bande de charge, c'est l'histoire du tendon ; DEVANT, il prend
 * la forme de ce qui est écrit, c'est le programme. La couleur ne dit donc
 * jamais deux choses au même endroit.
 *
 * La grille est un sommaire, pas un éditeur : un appui sur un jour descend à
 * sa ligne dans le détail jour par jour, là où les séances se déplacent.
 */
import type { Plan, SessionType, Week } from '../data/types'
import type { SeancePlanifiee } from '../lib/adapt'
import { addDays, daysBetween } from '../lib/dates'
import { bandOf, type IndexBreakdown } from '../lib/tendonIndex'
import { ENCRE_BANDE, TEINTE_BANDE } from '../lib/teintes'

const MOIS_COURT = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc']
const JOURS = ['l', 'm', 'm', 'j', 'v', 's', 'd']

type Forme = 'longue' | 'qualite' | 'endurance' | 'velo' | 'renfo' | 'repos' | 'dossard'

/** Ce qui domine une journée : la séance la plus exigeante l'emporte. */
function formeDuJour(seances: SeancePlanifiee[]): Forme {
  const types = seances.filter((x) => !x.s.saute).map((x) => x.s.type)
  const a = (t: SessionType[]) => types.some((x) => t.includes(x))
  if (a(['race', 'course'])) return 'dossard'
  if (a(['long'])) return 'longue'
  if (a(['tempo', 'inter', 'test'])) return 'qualite'
  if (a(['ef', 'marche'])) return 'endurance'
  if (a(['velo'])) return 'velo'
  if (a(['muscu-haut', 'muscu-bas', 'escalade'])) return 'renfo'
  return 'repos'
}

const STYLE_FORME: Record<Forme, { fond: string; encre: string; bord: string }> = {
  longue: { fond: 'transparent', encre: 'var(--ink)', bord: '1.5px solid var(--ink)' },
  qualite: { fond: '#2e731a', encre: '#ffffff', bord: '1.5px solid transparent' },
  endurance: { fond: '#dbdad2', encre: 'var(--ink)', bord: '1.5px solid transparent' },
  velo: { fond: '#efefec', encre: 'var(--ink-3)', bord: '1.5px solid transparent' },
  renfo: { fond: '#e4e3dc', encre: 'var(--ink-2)', bord: '1.5px solid transparent' },
  repos: { fond: 'transparent', encre: 'var(--ink-3)', bord: '1.5px dashed var(--border-2)' },
  dossard: { fond: 'var(--pale)', encre: 'var(--pale-ink)', bord: '1.5px solid transparent' },
}

const LEGENDE_FORME: Array<[Forme, string]> = [
  ['longue', 'sortie longue'],
  ['qualite', 'qualité'],
  ['endurance', 'endurance'],
  ['velo', 'vélo'],
  ['renfo', 'renfo'],
  ['repos', 'repos'],
  ['dossard', 'dossard'],
]

/** La couleur du liseré de semaine, par nature. */
export const TEINTE_NATURE: Record<string, string> = {
  charge: '#2e731a',
  'longue qualitative': '#2e731a',
  decharge: '#a7a99f',
  pause: '#49de61',
  course: '#274312',
  // Le Blue de Trailblazer : le vert d'eau appartient à la bande verte.
  reprise: '#4f63f2',
  affutage: '#f2cf6b',
}

const LEGENDE_NATURE: Array<[string, string]> = [
  ['charge', 'charge'],
  ['decharge', 'décharge'],
  ['pause', 'pause de longue'],
  ['course', 'dossard'],
  ['reprise', 'reprise'],
  ['affutage', 'affûtage'],
]

/** Le nom de la ligne : le mois quand la semaine en porte le premier jour, sinon le numéro. */
function libelleLigne(w: Week): string {
  for (let k = 0; k < 7; k++) {
    const d = addDays(w.monday, k)
    if (d.endsWith('-01')) return MOIS_COURT[Number(d.slice(5, 7)) - 1]
  }
  return String(w.n)
}

export function GrilleCalendrier({
  plan,
  seances,
  indices,
  now,
  onChoisirJour,
}: {
  plan: Plan
  seances: SeancePlanifiee[]
  /** L'indice calculé par jour, pour colorer le passé. */
  indices: Record<string, IndexBreakdown>
  now: string
  onChoisirJour: (day: string) => void
}) {
  const parJour = new Map<string, SeancePlanifiee[]>()
  for (const x of seances) parJour.set(x.day, [...(parJour.get(x.day) ?? []), x])

  const debut = plan.weeks[0].monday
  const nbJours = plan.weeks.length * 7
  const rang = daysBetween(debut, now) + 1
  const nbSeances = plan.weeks.reduce((n, w) => n + w.sessions.length, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontSize: 14, color: 'var(--accent)' }}>
          {nbJours} jours · {nbSeances} séances
        </span>
        {rang >= 1 && rang <= nbJours && <span style={{ fontSize: 14, color: 'var(--accent)' }}>jour {rang}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '38px repeat(7, 1fr)', columnGap: 5, rowGap: 6 }}>
        <span />
        {JOURS.map((j, i) => (
          <span key={i} style={{ textAlign: 'center', fontSize: 12, color: 'var(--sur-ink-3)' }}>
            {j}
          </span>
        ))}

        {plan.weeks.map((w) => (
          <Ligne
            key={w.n}
            semaine={w}
            parJour={parJour}
            indices={indices}
            now={now}
            onChoisirJour={onChoisirJour}
          />
        ))}
      </div>

      <div className="carte" style={{ padding: '16px 18px', marginTop: 18 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--accent)' }}>derrière : la bande du jour</p>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {(['vert', 'jaune', 'orange', 'rouge', 'noir'] as const).map((b) => (
            <span
              key={b}
              style={{
                flex: 1,
                height: 18,
                borderRadius: 'var(--pill)',
                background: TEINTE_BANDE[b],
                border: b === 'noir' ? '1px solid var(--border-2)' : undefined,
              }}
            />
          ))}
        </div>
        <p style={{ margin: '16px 0 0', fontSize: 14, color: 'var(--accent)' }}>devant : ce qui est écrit</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {LEGENDE_FORME.map(([f, l]) => (
            <span
              key={f}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--pill)',
                fontSize: 13,
                background: STYLE_FORME[f].fond,
                color: STYLE_FORME[f].encre,
                border: STYLE_FORME[f].bord,
              }}
            >
              {l}
            </span>
          ))}
        </div>
        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0 12px' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
          {LEGENDE_NATURE.map(([n, l]) => (
            <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--sur-ink-2)' }}>
              <span style={{ width: 3, height: 14, borderRadius: 2, background: TEINTE_NATURE[n] }} />
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Ligne({
  semaine: w,
  parJour,
  indices,
  now,
  onChoisirJour,
}: {
  semaine: Week
  parJour: Map<string, SeancePlanifiee[]>
  indices: Record<string, IndexBreakdown>
  now: string
  onChoisirJour: (day: string) => void
}) {
  const nature = w.nature ?? (w.deload ? 'decharge' : 'charge')
  return (
    <>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--sur-ink-3)' }}>
        <span style={{ width: 3, height: 22, borderRadius: 2, background: TEINTE_NATURE[nature] ?? 'var(--accent)' }} />
        {libelleLigne(w)}
      </span>
      {Array.from({ length: 7 }, (_, k) => {
        const day = addDays(w.monday, k)
        const passe = day < now
        const aujourdhui = day === now
        const idx = indices[day]
        let fond: string
        let encre: string
        let bord: string
        if ((passe || aujourdhui) && idx && !idx.painInconnue) {
          const b = bandOf(idx.idx).key
          fond = TEINTE_BANDE[b]
          encre = ENCRE_BANDE[b]
          bord = b === 'noir' ? '1.5px solid var(--border-2)' : '1.5px solid transparent'
        } else if (passe) {
          // Un jour passé sans indice lisible : ni une bande ni un programme.
          fond = 'transparent'
          encre = 'var(--ink-3)'
          bord = '1.5px dotted var(--border-2)'
        } else {
          const st = STYLE_FORME[formeDuJour(parJour.get(day) ?? [])]
          fond = st.fond
          encre = st.encre
          bord = st.bord
        }
        return (
          <button
            key={day}
            type="button"
            onClick={() => onChoisirJour(day)}
            aria-label={day}
            style={{
              aspectRatio: '1',
              width: '100%',
              maxWidth: 44,
              justifySelf: 'center',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontSize: 13.5,
              fontVariantNumeric: 'tabular-nums',
              background: fond,
              color: encre,
              border: bord,
              boxShadow: aujourdhui ? '0 0 0 2px var(--bg), 0 0 0 3.5px var(--pale)' : undefined,
            }}
          >
            {Number(day.slice(8))}
          </button>
        )
      })}
    </>
  )
}
