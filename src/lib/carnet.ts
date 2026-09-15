/**
 * Le carnet de suivi, jour par jour, et ce qu'il laisse voir.
 *
 * L'app enregistrait déjà tout, mais en tables séparées : les douleurs d'un
 * côté, les ressentis de séance de l'autre, les écarts ailleurs. Aucune vue ne
 * mettait sur la même ligne « ce que j'ai fait » et « ce que le tendon en a
 * dit », alors que c'est la seule question qui compte pour trouver un pattern.
 *
 * Trois usages, une seule construction :
 *   - `construireCarnet` aligne les activités et les douleurs par jour ;
 *   - `trouverPatterns` compare la douleur des jours avec et sans chaque
 *     activité, dans l'app ;
 *   - `exporterPourIA` met le tout en texte, pour une analyse plus large
 *     ailleurs.
 *
 * Règle de tout le dépôt : ne jamais présenter une absence comme une mesure.
 * Une journée dont une séance n'est pas notée ne dit pas ce qui a été fait :
 * elle reste dans l'export, marquée, mais n'entre dans aucune comparaison.
 */
import type { Session, SessionType, Week } from '../data/types'
import type { ActivityRow } from './load'
import type { FeedbackRow } from './buildPain'
import type { LoadMap, PainMap } from './tendonIndex'
import { addDays, formatNumber } from './dates'
import { seancesAvecEcarts, slotsParJour, type EcartRow } from './overrides'

export type Nature =
  | 'longue'
  | 'qualite'
  | 'facile'
  | 'course'
  | 'velo'
  | 'renfo-bas'
  | 'renfo-haut'
  | 'escalade'
  | 'marche'
  | 'autre'

export interface ActiviteDuJour {
  nature: Nature
  titre: string
  km: number | null
  /** Seulement une durée saisie : une estimation du plan n'est pas une mesure. */
  minutes: number | null
  rpe: number | null
  douleurEffort: number | null
  /** `plan` : séance notée dans l'app. `historique` : activité importée avant le 10 août. */
  source: 'plan' | 'historique'
}

export interface JourCarnet {
  day: string
  activites: ActiviteDuJour[]
  /** Séances du plan ni notées ni sautées. Au-dessus de zéro, le jour est incomplet. */
  nonNotees: number
  sautees: number
  reveil: number | null
  effort: number | null
  soir: number | null
  /** C'est le verdict de la journée : le tendon parle le lendemain matin. */
  reveilLendemain: number | null
  excentrique: boolean
  charge: number
}

const NATURE_SEANCE: Partial<Record<SessionType, Nature>> = {
  long: 'longue',
  tempo: 'qualite',
  inter: 'qualite',
  test: 'qualite',
  ef: 'facile',
  course: 'course',
  race: 'course',
  velo: 'velo',
  'muscu-bas': 'renfo-bas',
  'muscu-haut': 'renfo-haut',
  escalade: 'escalade',
  marche: 'marche',
}

/** Même lecture que `activityLoad` : le nom de l'activité importée dit sa nature. */
function natureActivite(a: ActivityRow): Nature {
  const nom = (a.name ?? '').toLowerCase()
  const km = a.distance_m / 1000
  switch (a.sport) {
    case 'Run':
      if (/fractionn|x\s?\d|seuil|tempo|test/.test(nom)) return 'qualite'
      return km >= 18 ? 'longue' : 'facile'
    case 'Ride':
      return 'velo'
    case 'Weight':
      return /jambe|bas|bulgare|trx|squat|mollet/.test(nom) ? 'renfo-bas' : 'renfo-haut'
    case 'Climb':
      return 'escalade'
    case 'Hike':
    case 'Walk':
      return 'marche'
    default:
      return 'autre'
  }
}

export interface EntreeCarnet {
  weeks: Week[]
  ecarts?: Map<string, EcartRow>
  feedback: FeedbackRow[]
  pain: PainMap
  load: LoadMap
  activities: ActivityRow[]
  /** Bornes incluses, en ISO. `au` est normalement aujourd'hui. */
  du: string
  au: string
}

export function construireCarnet({
  weeks,
  ecarts,
  feedback,
  pain,
  load,
  activities,
  du,
  au,
}: EntreeCarnet): JourCarnet[] {
  const jours = new Map<string, JourCarnet>()
  for (let d = du; d <= au; d = addDays(d, 1)) {
    jours.set(d, {
      day: d,
      activites: [],
      nonNotees: 0,
      sautees: 0,
      reveil: pain[d]?.wake ?? null,
      effort: pain[d]?.effort ?? null,
      soir: pain[d]?.evening ?? null,
      reveilLendemain: pain[addDays(d, 1)]?.wake ?? null,
      excentrique: Boolean(pain[d]?.eccentric),
      charge: Math.round((load[d] ?? 0) * 10) / 10,
    })
  }

  const parActivite = new Set<string>()
  for (const a of activities) {
    const j = jours.get(a.day)
    if (!j) continue
    parActivite.add(a.day)
    j.activites.push({
      nature: natureActivite(a),
      titre: a.name ?? a.sport,
      km: a.distance_m ? Math.round(a.distance_m / 100) / 10 : null,
      minutes: a.moving_s ? Math.round(a.moving_s / 60) : null,
      rpe: null,
      douleurEffort: null,
      source: 'historique',
    })
  }

  const ressentis = new Map(feedback.map((f) => [`${f.week}-${f.day_index}-${f.slot}`, f]))
  for (const w of weeks) {
    const slots = slotsParJour(w.sessions)
    const seances: Session[] = ecarts ? seancesAvecEcarts(w, ecarts) : w.sessions
    seances.forEach((s, i) => {
      const d = addDays(w.monday, s.day + 7 * (s.semaines ?? 0))
      const j = jours.get(d)
      if (!j || s.type === 'repos') return
      if (s.saute) {
        j.sautees++
        return
      }
      const f = ressentis.get(`${w.n}-${w.sessions[i].day}-${slots[i]}`)
      if (!f) {
        // Une journée couverte par l'historique est décrite par lui : le plan
        // n'y ajoute rien, exactement comme dans `buildLoad`.
        if (!parActivite.has(d)) j.nonNotees++
        return
      }
      const cle = `${w.n}-${w.sessions[i].day}-${slots[i]}`
      j.activites.push({
        nature: NATURE_SEANCE[s.type] ?? 'autre',
        titre: s.title,
        km: s.dist ?? f.distance_km ?? null,
        minutes: ecarts?.get(cle)?.patch.durMin ?? null,
        rpe: f.rpe,
        douleurEffort: f.pain,
        source: 'plan',
      })
    })
  }

  return [...jours.values()]
}

// ─── Les patterns ──────────────────────────────────────────────────────────

export interface Pattern {
  cle: string
  /** « Après une sortie longue », en toutes lettres. */
  facteur: string
  mesure: 'reveilLendemain' | 'soir'
  avec: number
  sans: number
  nAvec: number
  nSans: number
  /** Positif : la douleur est plus haute les jours avec. */
  ecart: number
}

/**
 * Quatre jours de chaque côté au minimum. En dessous, une seule mauvaise nuit
 * fabrique un pattern, et un pattern affiché s'installe dans la tête comme une
 * vérité : il vaut mieux se taire deux semaines de plus.
 */
export const MIN_JOURS = 4
/** Un demi-point sur dix : sous ce seuil, l'écart est dans le bruit de la saisie. */
export const ECART_MIN = 0.5

const JAMBES: Nature[] = ['longue', 'qualite', 'facile', 'course', 'velo', 'renfo-bas', 'marche']

interface Facteur {
  cle: string
  libelle: string
  test: (j: JourCarnet, carnet: JourCarnet[], i: number) => boolean | null
}

const aFait = (n: Nature) => (j: JourCarnet) => j.activites.some((a) => a.nature === n)

const FACTEURS: Facteur[] = [
  { cle: 'longue', libelle: 'une sortie longue', test: aFait('longue') },
  { cle: 'qualite', libelle: 'une séance de qualité', test: aFait('qualite') },
  { cle: 'facile', libelle: 'une course facile', test: aFait('facile') },
  { cle: 'velo', libelle: 'du vélo', test: aFait('velo') },
  { cle: 'renfo-bas', libelle: 'du renfo bas du corps', test: aFait('renfo-bas') },
  { cle: 'escalade', libelle: 'de l’escalade', test: aFait('escalade') },
  { cle: 'excentrique', libelle: 'l’excentrique', test: (j) => j.excentrique },
  {
    cle: 'sans-jambes',
    libelle: 'une journée sans jambes',
    test: (j) => !j.activites.some((a) => JAMBES.includes(a.nature)),
  },
  {
    cle: 'effort-dur',
    libelle: 'un effort perçu à 8 ou plus',
    test: (j) => j.activites.some((a) => a.rpe != null && a.rpe >= 8),
  },
  {
    // Rapportée aux quatre semaines d'avant : une charge « haute » ne veut rien
    // dire dans l'absolu, seulement contre ce que le tendon a l'habitude de porter.
    cle: 'charge-haute',
    libelle: 'une charge 30 % au-dessus de ton habitude',
    test: (j, carnet, i) => {
      const avant = carnet.slice(Math.max(0, i - 28), i)
      if (avant.length < 20) return null
      const habitude = avant.reduce((a, x) => a + x.charge, 0) / avant.length
      return habitude > 0 && j.charge > habitude * 1.3
    },
  },
]

export function trouverPatterns(carnet: JourCarnet[]): Pattern[] {
  const out: Pattern[] = []
  for (const f of FACTEURS) {
    for (const mesure of ['reveilLendemain', 'soir'] as const) {
      const avec: number[] = []
      const sans: number[] = []
      carnet.forEach((j, i) => {
        if (j.nonNotees > 0) return
        const v = j[mesure]
        if (v == null) return
        const t = f.test(j, carnet, i)
        if (t == null) return
        ;(t ? avec : sans).push(v)
      })
      if (avec.length < MIN_JOURS || sans.length < MIN_JOURS) continue
      const moy = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
      const ecart = moy(avec) - moy(sans)
      if (Math.abs(ecart) < ECART_MIN) continue
      out.push({
        cle: `${f.cle}-${mesure}`,
        facteur: f.libelle,
        mesure,
        avec: moy(avec),
        sans: moy(sans),
        nAvec: avec.length,
        nSans: sans.length,
        ecart,
      })
    }
  }
  return out.sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))
}

// ─── La tenue du carnet ────────────────────────────────────────────────────

export interface Tenue {
  jours: number
  complets: number
  reveilsSaisis: number
  soirsSaisis: number
  excentrique: number
  sautees: number
  nonNotees: number
}

export function tenueDuCarnet(carnet: JourCarnet[]): Tenue {
  return {
    jours: carnet.length,
    complets: carnet.filter((j) => j.nonNotees === 0).length,
    reveilsSaisis: carnet.filter((j) => j.reveil != null).length,
    soirsSaisis: carnet.filter((j) => j.soir != null).length,
    excentrique: carnet.filter((j) => j.excentrique).length,
    sautees: carnet.reduce((a, j) => a + j.sautees, 0),
    nonNotees: carnet.reduce((a, j) => a + j.nonNotees, 0),
  }
}

// ─── L'export ──────────────────────────────────────────────────────────────

const val = (v: number | null) => (v == null ? '·' : formatNumber(v))

function decrireActivite(a: ActiviteDuJour): string {
  const morceaux = [a.titre]
  if (a.km != null && !a.titre.includes(`${formatNumber(a.km)} km`)) morceaux.push(`${formatNumber(a.km)} km`)
  if (a.minutes != null) morceaux.push(`${a.minutes} min`)
  if (a.rpe != null) morceaux.push(`effort ${a.rpe}/10`)
  if (a.douleurEffort != null) morceaux.push(`douleur ${formatNumber(a.douleurEffort)}/10`)
  return morceaux.join(', ').replace(/\|/g, '/')
}

/**
 * Le carnet en Markdown, prêt à coller dans une IA. L'en-tête porte le
 * contexte et les échelles : sans lui, « 3 » ne veut rien dire, et une IA
 * conclurait sur des chiffres dont elle ignore le sens. La consigne demande
 * de séparer corrélation et cause, parce que c'est l'erreur qu'un carnet de
 * trois mois invite à faire.
 */
export function exporterPourIA(carnet: JourCarnet[], patterns: Pattern[], tenue: Tenue): string {
  if (carnet.length === 0) return ''
  const lignes: string[] = []
  lignes.push("# Carnet de suivi : tendinopathie d'Achille en convalescence, préparation marathon")
  lignes.push('')
  lignes.push(`Période : du ${carnet[0].day} au ${carnet[carnet.length - 1].day}.`)
  lignes.push('')
  lignes.push('## Comment lire les données')
  lignes.push('')
  lignes.push('- Douleurs sur une échelle de 0 à 10. **Réveil** : raideur du tendon au lever, le marqueur de référence. **Effort** : douleur pendant la séance. **Soir** : douleur en fin de journée.')
  lignes.push("- **Réveil J+1** : raideur du lendemain matin. C'est elle qui dit si la journée a été encaissée.")
  lignes.push('- **Effort perçu** de chaque séance sur 10.')
  lignes.push("- **Charge** : charge tendineuse du jour calculée par l'app, en kilomètres-équivalents. Le vélo compte 0,10 par minute, une course environ 1 par kilomètre, plus pour la vitesse.")
  lignes.push('- **Excentrique** : protocole de renforcement excentrique fait ce jour-là (traitement).')
  lignes.push('- **Non notées** : séances prévues dont le ressenti manque. Un jour qui en porte est incomplet : ce qui a été fait ce jour-là est inconnu, pas nul.')
  lignes.push('- `·` signifie non saisi.')
  lignes.push('')
  lignes.push('## Ce que je te demande')
  lignes.push('')
  lignes.push("Cherche les liens entre activités et douleur, le soir même et le lendemain matin, les manques (excentrique, jours de repos) et les abus (charge, effort, enchaînements). Distingue ce qui est une corrélation de ce qui pourrait être une cause, et dis quand un effectif est trop faible pour conclure. Ignore les jours incomplets dans tes comparaisons.")
  lignes.push('')
  lignes.push('## Tenue du carnet')
  lignes.push('')
  lignes.push(`${tenue.complets} jours complets sur ${tenue.jours}, raideur au réveil saisie ${tenue.reveilsSaisis} jours, douleur du soir ${tenue.soirsSaisis} jours, excentrique ${tenue.excentrique} jours, ${tenue.sautees} séances sautées, ${tenue.nonNotees} séances non notées.`)
  lignes.push('')
  lignes.push('## Jours')
  lignes.push('')
  lignes.push('| Date | Activités | Réveil | Effort | Soir | Réveil J+1 | Excentrique | Charge | Sautées | Non notées |')
  lignes.push('|---|---|---|---|---|---|---|---|---|---|')
  for (const j of carnet) {
    const activites = j.activites.length ? j.activites.map(decrireActivite).join(' ; ') : 'aucune'
    lignes.push(
      `| ${j.day} | ${activites} | ${val(j.reveil)} | ${val(j.effort)} | ${val(j.soir)} | ${val(j.reveilLendemain)} | ${j.excentrique ? 'oui' : 'non'} | ${formatNumber(j.charge)} | ${j.sautees} | ${j.nonNotees} |`,
    )
  }
  if (patterns.length) {
    lignes.push('')
    lignes.push("## Ce que l'app a déjà repéré")
    lignes.push('')
    lignes.push(`Comparaisons simples, jours complets seulement, ${MIN_JOURS} jours minimum de chaque côté. À vérifier, pas à croire.`)
    lignes.push('')
    for (const p of patterns) lignes.push(`- ${phrasePattern(p)}`)
  }
  return lignes.join('\n')
}

/** La même phrase dans l'écran et dans l'export. */
export function phrasePattern(p: Pattern): string {
  const quand = p.mesure === 'reveilLendemain' ? 'raideur du lendemain matin' : 'douleur du soir'
  return `Après ${p.facteur}, ${quand} à ${formatNumber(p.avec)} contre ${formatNumber(p.sans)} sans (${p.nAvec} jours contre ${p.nSans}).`
}
