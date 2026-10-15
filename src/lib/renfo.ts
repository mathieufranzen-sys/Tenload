/**
 * Le suivi du renforcement : ce qui a été soulevé, et ce qu'il faut soulever
 * la prochaine fois.
 *
 * Demandé par Mathieu le 6 octobre 2026. Le renfo du mollet est le traitement
 * de la tendinopathie (Beyer 2015, JOSPT 2024), et un traitement par la
 * charge ne se pilote pas sans connaître la charge : la case « excentrique »
 * disait qu'il avait eu lieu, pas à quel poids. Il faisait 3 x 20 à 14 kg
 * depuis des semaines sans le savoir trop léger.
 *
 * Une ligne par exercice et par jour, jamais une ligne par série : saisir
 * chaque série au téléphone, entre deux séries, est une saisie qu'on
 * abandonne. Les deux jambes ensemble, et les sauts en contacts seulement
 * (arbitrés par Mathieu le même jour).
 *
 * La charge proposée ne monte que sur deux séances « facile » de suite et,
 * pour ce qui charge le tendon, un réveil calme le lendemain (Silbernagel
 * 2007). Elle ne descend jamais d'elle-même : réduire est le travail de
 * l'indice, ici on refuse seulement de monter. Même règle que le palier de
 * la sortie longue.
 *
 * Un exercice lesté progresse au TONNAGE, séries × répétitions × kilos
 * (15 octobre 2026, Mathieu) : 3 x 12 à 10 kg soulève plus que 3 x 8 à
 * 14 kg. Trois leviers, kilos, séries, répétitions, dans un cadre fixe :
 * trois séries au plus, 6 à 10 répétitions (la fin du protocole de Beyer
 * 2015, qui descend de 15 vers 6 RM), et le matériel de Mathieu, deux
 * haltères de 10 kg ou une de 16.
 */
import type { Exercise, SessionType } from '../data/types'
import { addDays, formatDay, formatNumber } from './dates'
import { lendemainCalme } from './reprise'
import type { PainMap } from './tendonIndex'

export type Marge = 'facile' | 'juste' | 'limite'

/** Une ligne de `renfo_series`. Une série à zéro vaut « retiré ». */
export interface RenfoRow {
  day: string
  exercice: string
  series: number
  /** Répétitions, secondes ou contacts, selon la mesure de l'exercice. */
  valeur: number
  /** Charge ajoutée, haltère et sac ensemble. Zéro : poids du corps. */
  kg: number
  marge: Marge | null
}

export type Mesure = 'reps' | 'duree' | 'contacts' | 'libre'

export interface ExerciceRenfo {
  id: string
  nom: string
  mesure: Mesure
  /** Charge le tendon d'Achille : sa progression attend un réveil calme. */
  tendon: boolean
  /** Compte comme l'excentrique du jour dans le carnet. */
  excentrique: boolean
  /** Une charge est attendue : la progression ajoute des kilos, pas des répétitions. */
  leste: boolean
  /** Pas de progression : kilos pour un exercice lesté, sinon répétitions, secondes ou contacts. */
  pas: number
  /** Charge que le matériel permet, si elle diffère de deux haltères de 10 kg. */
  kgMax?: number
  consigne?: string
}

const MOLLET = {
  mesure: 'reps' as const,
  tendon: true,
  excentrique: true,
  leste: true,
  pas: 2,
  // Une main tient le mur : une seule haltère, la 16 kg.
  kgMax: 16,
}

/**
 * Le catalogue, dans l'ordre où les noms du plan s'y reconnaissent. Les noms
 * du plan varient d'une semaine à l'autre (« Stanish (excentrique mollet,
 * 2 jambes) » le mercredi, « Stanish (excentrique mollet) » le vendredi) :
 * l'historique doit les suivre comme un seul exercice.
 */
const CATALOGUE: Array<ExerciceRenfo & { motif: RegExp }> = [
  {
    id: 'mollet-statique',
    nom: 'Mollet statique jambe tendue',
    motif: /statique/i,
    ...MOLLET,
    mesure: 'duree',
    pas: 5,
    consigne: 'Une jambe, maintien à mi-hauteur.',
  },
  {
    id: 'mollet-tendu',
    nom: 'Mollet jambe tendue',
    motif: /stanish|jambe tendue/i,
    ...MOLLET,
    consigne: '3 s pour monter, 3 s pour descendre, talon sous la marche. Haltère et sac ensemble.',
  },
  {
    id: 'mollet-flechi',
    nom: 'Mollet genou fléchi',
    motif: /genou fl[ée]chi|sol[ée]aire/i,
    ...MOLLET,
    consigne: 'Genou plié à 30 ou 45° et gardé fixe : le soléaire, le muscle qui porte la course.',
  },
  {
    id: 'sauts-deux',
    nom: 'Sauts sur deux jambes',
    motif: /saut.*deux/i,
    mesure: 'contacts',
    tendon: true,
    excentrique: false,
    leste: false,
    pas: 5,
    consigne: 'Genoux presque tendus, rebond sur l’avant du pied. En début de séance, frais.',
  },
  {
    id: 'sauts-une',
    nom: 'Sauts sur une jambe',
    motif: /saut.*une/i,
    mesure: 'contacts',
    tendon: true,
    excentrique: false,
    leste: false,
    pas: 2,
    consigne: 'Sur place, après des sauts sur deux jambes bien tolérés.',
  },
  { id: 'sdt-roumain', nom: 'Soulevé de terre roumain', motif: /terre roumain/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2 },
  { id: 'sdt-unilateral', nom: 'Soulevé de terre unilatéral', motif: /terre unilat/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2, kgMax: 16 },
  { id: 'fentes-bulgares', nom: 'Fentes bulgares', motif: /fentes/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2 },
  { id: 'squat-talonnette', nom: 'Squat talonnette', motif: /squat/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2 },
  { id: 'hip-extension', nom: 'Hip extension unilatéral', motif: /hip extension/i, mesure: 'reps', tendon: false, excentrique: false, leste: false, pas: 1 },
  { id: 'pont-fessier', nom: 'Pont fessier unilatéral', motif: /pont fessier/i, mesure: 'reps', tendon: false, excentrique: false, leste: false, pas: 1 },
  { id: 'crab-walk', nom: 'Crab walk élastique', motif: /crab walk/i, mesure: 'reps', tendon: false, excentrique: false, leste: false, pas: 1 },
  { id: 'gainage', nom: 'Gainage', motif: /gainage/i, mesure: 'duree', tendon: false, excentrique: false, leste: false, pas: 5 },
  { id: 'mobilite-cheville', nom: 'Mobilité cheville et voûte plantaire', motif: /mobilit/i, mesure: 'libre', tendon: false, excentrique: false, leste: false, pas: 0 },
  { id: 'tractions', nom: 'Tractions ou tirage vertical', motif: /traction/i, mesure: 'reps', tendon: false, excentrique: false, leste: false, pas: 1 },
  { id: 'developpe-couche', nom: 'Développé couché ou pompes lestées', motif: /couch/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2 },
  { id: 'developpe-militaire', nom: 'Développé militaire', motif: /militaire/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2 },
  { id: 'pompes', nom: 'Pompes', motif: /^pompes/i, mesure: 'reps', tendon: false, excentrique: false, leste: false, pas: 1 },
  { id: 'rowing', nom: 'Rowing haltère', motif: /rowing/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2, kgMax: 16 },
  { id: 'elevations', nom: 'Élévations latérales', motif: /[ée]l[ée]vations/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 1 },
  { id: 'curl', nom: 'Curl biceps', motif: /curl/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 1 },
  { id: 'dips', nom: 'Dips sur banc', motif: /dips/i, mesure: 'reps', tendon: false, excentrique: false, leste: false, pas: 1 },
]

/** Le bas du corps, dans l'ordre du catalogue. La mobilité n'a rien à noter. */
const BAS_DU_CORPS = [
  'mollet-tendu',
  'mollet-flechi',
  'mollet-statique',
  'sauts-deux',
  'sauts-une',
  'sdt-roumain',
  'sdt-unilateral',
  'fentes-bulgares',
  'squat-talonnette',
  'hip-extension',
  'pont-fessier',
  'crab-walk',
]

/**
 * Ce qui s'ajoute à une séance hors de sa liste du plan (6 octobre 2026). Les
 * sauts sont le palier d'après le renfo lourd (Baxter 2021) ; le reste, des
 * exercices que Mathieu fait déjà sans que le plan les écrive. Le jour du
 * haut, tout le bas : c'est sa seconde séance de jambes de la semaine.
 */
export const SUGGESTIONS: Partial<Record<SessionType, string[]>> = {
  'muscu-bas': ['sauts-deux', 'sauts-une', 'fentes-bulgares', 'squat-talonnette', 'pompes', 'curl'],
  'muscu-haut': BAS_DU_CORPS,
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** L'exercice du catalogue que désigne un nom du plan, ou un exercice libre à son nom. */
export function identifier(nomPlan: string, prescription = ''): ExerciceRenfo {
  const trouve = CATALOGUE.find((e) => e.motif.test(nomPlan))
  if (trouve) {
    const { motif: _motif, ...exo } = trouve
    return exo
  }
  const mesure: Mesure = /\d\s*min/.test(prescription) ? 'libre' : /\d\s*s\b/.test(prescription) ? 'duree' : 'reps'
  return { id: slug(nomPlan), nom: nomPlan, mesure, tendon: false, excentrique: false, leste: false, pas: mesure === 'duree' ? 5 : 1 }
}

export function exerciceParId(id: string): ExerciceRenfo | null {
  const trouve = CATALOGUE.find((e) => e.id === id)
  if (!trouve) return null
  const { motif: _motif, ...exo } = trouve
  return exo
}

export interface Charge {
  series: number
  valeur: number
  kg: number
}

/** « 3 x 15 », « 3 x 45 s », « 3 x 12 / côté » ; la charge vient de la précision (« 12 kg »). */
export function lirePrescription(serie: string, precision = ''): Charge | null {
  const m = serie.match(/(\d+)\s*x\s*(\d+)/i)
  if (!m) return null
  const nombre = (t: string) => Number(t.replace(',', '.'))
  // « 2 x 6 kg » : deux haltères de 6, la charge est leur somme.
  const paire = precision.match(/(\d+)\s*x\s*(\d+(?:[,.]\d+)?)\s*kg/i)
  const seule = precision.match(/(\d+(?:[,.]\d+)?)\s*kg/i)
  const kg = paire ? nombre(paire[1]) * nombre(paire[2]) : seule ? nombre(seule[1]) : 0
  return { series: Number(m[1]), valeur: Number(m[2]), kg }
}

/** Le cadre de progression d'un exercice lesté. */
export const SERIES_MAX = 3
export const REPS_MIN = 6
export const REPS_MAX = 10
/** Deux haltères de 10 kg. Une seule main : la 16 kg (`kgMax`). */
export const KG_MAX = 20

/** Ce que soulève une séance : séries × répétitions × kilos. */
export const tonnage = (c: Charge) => c.series * c.valeur * c.kg

export type StatutProposition = 'plan' | 'monte' | 'tient'

export interface Proposition extends Charge {
  statut: StatutProposition
  /** Ce qui a décidé la charge, en une phrase. */
  raison: string
  /** Écart avec la dernière séance, « +2 kg », quand la charge monte. */
  hausse: string | null
}

/**
 * La charge à faire le jour `jour`, d'après les séances notées AVANT ce jour.
 * Sans historique, la prescription du plan sert de départ.
 */
export function proposer(
  exo: ExerciceRenfo,
  historique: RenfoRow[],
  plan: Charge | null,
  jour: string,
  pain: PainMap,
  now: string,
): Proposition | null {
  const avant = historique.filter((r) => r.exercice === exo.id && r.day < jour && r.series > 0)
  avant.sort((a, b) => a.day.localeCompare(b.day))
  const der = avant[avant.length - 1]
  const lesteReps = exo.leste && exo.mesure === 'reps'
  if (!der) {
    if (!plan) return null
    const depart = lesteReps ? { ...plan, series: Math.min(plan.series, SERIES_MAX), valeur: Math.min(plan.valeur, REPS_MAX) } : plan
    return { ...depart, statut: 'plan', raison: 'Première séance notée : la charge du plan sert de départ.', hausse: null }
  }
  const base: Charge = { series: der.series, valeur: der.valeur, kg: der.kg }
  const tient = (raison: string): Proposition => ({ ...base, statut: 'tient', raison, hausse: null })

  // Au-delà de 10 répétitions, la charge est trop légère pour le tendon : on
  // rentre dans le cadre sans attendre deux séances faciles, puisque chaque
  // répétition devient plus lourde mais la séance plus courte.
  if (lesteReps && base.kg > 0 && (base.valeur > REPS_MAX || base.series > SERIES_MAX)) {
    const kg = Math.min(base.kg + exo.pas, exo.kgMax ?? KG_MAX)
    return {
      series: Math.min(base.series, SERIES_MAX),
      valeur: REPS_MAX,
      kg,
      statut: 'monte',
      raison: `Hors du cadre de ${REPS_MIN} à ${REPS_MAX} répétitions : plus lourd, moins de répétitions.`,
      hausse: kg > base.kg ? `+${formatNumber(kg - base.kg)} kg` : null,
    }
  }

  if (der.marge == null) return tient('Marge non notée la dernière fois : même charge.')
  if (der.marge === 'limite') return tient('Dernière série à la limite : même charge.')
  if (der.marge === 'juste') return tient('Dernière série juste : c’est la bonne charge, garde-la.')
  if (avant[avant.length - 2]?.marge !== 'facile') return tient('Encore une séance facile, et la charge monte.')
  if (exo.tendon) {
    const verdict = lendemainCalme(pain, der.day, now)
    if (verdict === 'agite') return tient('Le réveil d’après n’était pas calme : même charge.')
    if (verdict === 'inconnu') return tient('Le réveil d’après n’est pas noté : même charge.')
  }

  const monte = (c: Charge, hausse: string, raison?: string): Proposition => ({
    ...c,
    statut: 'monte',
    raison:
      raison ??
      (exo.tendon ? 'Deux séances faciles et un réveil calme : la charge monte.' : 'Deux séances faciles : la charge monte.'),
    hausse,
  })
  if (exo.mesure === 'duree') return monte({ ...base, valeur: base.valeur + exo.pas }, `+${exo.pas} s`)
  if (exo.mesure === 'contacts') return monte({ ...base, valeur: base.valeur + exo.pas }, `+${exo.pas} contacts`)
  if (!exo.leste && base.kg === 0)
    return monte({ ...base, valeur: base.valeur + exo.pas }, `+${exo.pas} répétition${exo.pas > 1 ? 's' : ''}`)
  if (base.kg === 0) return monte({ ...base, kg: exo.pas, valeur: Math.min(base.valeur, REPS_MAX) }, `+${formatNumber(exo.pas)} kg`)

  const suite = progresser(base, exo.kgMax ?? KG_MAX, exo.pas)
  if (!suite) return tient('Au plafond de ton matériel : ralentis la descente à 4 ou 5 s pour durcir.')
  const avantT = tonnage(base)
  const apresT = tonnage(suite.charge)
  const pourquoi = exo.tendon ? 'Deux séances faciles et un réveil calme' : 'Deux séances faciles'
  return monte(suite.charge, suite.hausse, `${pourquoi} : ${formatNumber(avantT)} → ${formatNumber(apresT)} kg soulevés.`)
}

/**
 * Le pas suivant d'un exercice lesté : le plus petit gain de tonnage parmi les
 * trois leviers, dans le cadre. Le plus petit, parce qu'une progression qui
 * saute une marche est celle qu'on rate. À égalité, les kilos : c'est la
 * charge qui renforce le tendon (Bohm 2015). Ce qui en sort ressemble à une
 * double progression : les répétitions montent jusqu'à 10, puis la charge
 * monte et les répétitions redescendent juste assez pour soulever plus.
 */
export function progresser(c: Charge, kgMax: number, pas: number): { charge: Charge; hausse: string } | null {
  const t = tonnage(c)
  // Le moins de répétitions, dans le cadre, qui soulève plus qu'avant.
  const repsPour = (series: number, kg: number) => Math.max(REPS_MIN, Math.floor(t / (series * kg)) + 1)
  const candidats: Array<{ charge: Charge; hausse: string; rang: number }> = []
  const kg = Math.min(c.kg + pas, kgMax)
  if (kg > c.kg) {
    const valeur = repsPour(c.series, kg)
    if (valeur <= REPS_MAX) candidats.push({ charge: { ...c, kg, valeur }, hausse: `+${formatNumber(kg - c.kg)} kg`, rang: 0 })
  }
  if (c.series < SERIES_MAX) {
    const valeur = repsPour(c.series + 1, c.kg)
    if (valeur <= REPS_MAX) candidats.push({ charge: { ...c, series: c.series + 1, valeur }, hausse: '+1 série', rang: 1 })
  }
  if (c.valeur < REPS_MAX) candidats.push({ charge: { ...c, valeur: c.valeur + 1 }, hausse: '+1 répétition', rang: 2 })
  candidats.sort((a, b) => tonnage(a.charge) - tonnage(b.charge) || a.rang - b.rang)
  const choix = candidats[0]
  return choix ? { charge: choix.charge, hausse: choix.hausse } : null
}

const UNITE: Record<Mesure, string> = { reps: '', duree: ' s', contacts: ' contacts', libre: '' }

/** « 3 × 20 · 14 kg », « 3 × 45 s », « 3 × 20 contacts ». */
export function formatCharge(exo: ExerciceRenfo, c: Charge): string {
  const kg = c.kg > 0 && exo.mesure === 'reps' ? ` · ${formatNumber(c.kg)} kg` : ''
  return `${c.series} × ${c.valeur}${UNITE[exo.mesure]}${kg}`
}

/**
 * Ce que l'exercice a gagné sur les séances notées jusqu'à `jour` inclus. Le
 * tonnage pour un exercice lesté : c'est la mesure de sa progression, et
 * passer de 3 x 10 à 3 x 9 avec 2 kg de plus se lit comme une hausse.
 */
export function evolution(exo: ExerciceRenfo, historique: RenfoRow[], jour: string): string | null {
  const lignes = historique
    .filter((r) => r.exercice === exo.id && r.day <= jour && r.series > 0)
    .sort((a, b) => a.day.localeCompare(b.day))
  if (lignes.length < 2) return null
  const premiere = lignes[0]
  const derniere = lignes[lignes.length - 1]
  const depuis = `Depuis le ${formatDay(premiere.day)}`
  if (exo.mesure === 'reps' && derniere.kg > 0) {
    const [a, b] = [tonnage(premiere), tonnage(derniere)]
    if (a !== b) return `${depuis} : ${formatNumber(a)} → ${formatNumber(b)} kg soulevés`
  } else if (premiere.valeur !== derniere.valeur) {
    const unite = exo.mesure === 'duree' ? ' s' : exo.mesure === 'contacts' ? ' contacts' : ' répétitions'
    return `${depuis} : ${premiere.valeur} → ${derniere.valeur}${unite}`
  }
  return `Même charge sur ${lignes.length} séances`
}

export interface ExerciceDuJour {
  exo: ExerciceRenfo
  /** Séries et répétitions écrites dans le plan, et sa précision. */
  serie: string
  precision: string
  plan: Charge | null
  /** Ce qui est noté ce jour-là, s'il y a quelque chose. */
  note: RenfoRow | null
  proposition: Proposition | null
  evolution: string | null
  /** Exercice hors plan, ajouté par Mathieu. */
  ajoute: boolean
}

/** Au-delà, un exercice ajouté qu'on n'a plus fait ne revient plus d'office. */
const AJOUTS_RECENTS = 28

/**
 * La liste de la séance : les exercices du plan, puis les suggestions qui font
 * partie de la routine récente (ou s'ils sont notés ce jour-là), puis tout
 * exercice noté ce jour-là qui n'est dans aucune des deux.
 */
export function exercicesDeLaSeance(
  ex: Exercise[],
  type: SessionType,
  jour: string,
  historique: RenfoRow[],
  pain: PainMap,
  now: string,
): ExerciceDuJour[] {
  const vus = new Set<string>()
  const liste: ExerciceDuJour[] = []
  const notesDuJour = historique.filter((r) => r.day === jour && r.series > 0)

  const ajouter = (exo: ExerciceRenfo, serie: string, precision: string, ajoute: boolean) => {
    if (vus.has(exo.id)) return
    vus.add(exo.id)
    const plan = lirePrescription(serie, precision)
    liste.push({
      exo,
      serie,
      precision: exo.consigne ?? precision,
      plan,
      note: notesDuJour.find((r) => r.exercice === exo.id) ?? null,
      proposition: exo.mesure === 'libre' ? null : proposer(exo, historique, plan, jour, pain, now),
      evolution: evolution(exo, historique, jour),
      ajoute,
    })
  }

  for (const [nom, serie, precision] of ex) ajouter(identifier(nom, serie), serie, precision, false)

  const debut = addDays(jour, -AJOUTS_RECENTS)
  for (const id of SUGGESTIONS[type] ?? []) {
    const recent = historique.some((r) => r.exercice === id && r.series > 0 && r.day >= debut && r.day <= jour)
    if (recent) ajouter(exerciceParId(id)!, '', '', true)
  }
  for (const r of notesDuJour) {
    const exo = exerciceParId(r.exercice) ?? identifier(r.exercice)
    ajouter(exo, '', '', true)
  }
  return liste
}

/** Les exercices qu'on peut encore ajouter à la séance : ceux qui n'y sont pas déjà. */
export function suggestionsAAjouter(type: SessionType, liste: ExerciceDuJour[]): ExerciceRenfo[] {
  return (SUGGESTIONS[type] ?? [])
    .filter((id) => !liste.some((x) => x.exo.id === id))
    .map((id) => exerciceParId(id)!)
}

/** Charge de départ d'un exercice ajouté sans historique ni plan. */
export function chargeDeDepart(exo: ExerciceRenfo): Charge {
  if (exo.mesure === 'contacts') return { series: 3, valeur: 20, kg: 0 }
  if (exo.mesure === 'duree') return { series: 3, valeur: 30, kg: 0 }
  return { series: 3, valeur: 10, kg: 0 }
}

/** Les exercices suivis, pour le graphique de Suivi : ceux qui ont au moins deux séances. */
export function seriesParExercice(historique: RenfoRow[]): Array<{ exo: ExerciceRenfo; lignes: RenfoRow[] }> {
  const groupes = new Map<string, RenfoRow[]>()
  for (const r of historique) {
    if (r.series <= 0) continue
    groupes.set(r.exercice, [...(groupes.get(r.exercice) ?? []), r])
  }
  const ordre = CATALOGUE.map((e) => e.id)
  return [...groupes.entries()]
    .filter(([, lignes]) => lignes.length >= 2)
    .map(([id, lignes]) => ({
      exo: exerciceParId(id) ?? identifier(id),
      lignes: lignes.sort((a, b) => a.day.localeCompare(b.day)),
    }))
    .sort((a, b) => {
      const ia = ordre.indexOf(a.exo.id)
      const ib = ordre.indexOf(b.exo.id)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
}
