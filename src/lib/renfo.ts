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
  /** Au-delà, une montée de charge ramène les répétitions ici (Beyer : de 15 vers 6). */
  repsMax?: number
  consigne?: string
}

const MOLLET = {
  mesure: 'reps' as const,
  tendon: true,
  excentrique: true,
  leste: true,
  pas: 2,
  repsMax: 12,
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
  { id: 'sdt-roumain', nom: 'Soulevé de terre roumain', motif: /terre roumain/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2, repsMax: 10 },
  { id: 'sdt-unilateral', nom: 'Soulevé de terre unilatéral', motif: /terre unilat/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2, repsMax: 12 },
  { id: 'fentes-bulgares', nom: 'Fentes bulgares', motif: /fentes/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2, repsMax: 10 },
  { id: 'squat-talonnette', nom: 'Squat talonnette', motif: /squat/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2, repsMax: 12 },
  { id: 'hip-extension', nom: 'Hip extension unilatéral', motif: /hip extension/i, mesure: 'reps', tendon: false, excentrique: false, leste: false, pas: 1 },
  { id: 'pont-fessier', nom: 'Pont fessier unilatéral', motif: /pont fessier/i, mesure: 'reps', tendon: false, excentrique: false, leste: false, pas: 1 },
  { id: 'crab-walk', nom: 'Crab walk élastique', motif: /crab walk/i, mesure: 'reps', tendon: false, excentrique: false, leste: false, pas: 1 },
  { id: 'gainage', nom: 'Gainage', motif: /gainage/i, mesure: 'duree', tendon: false, excentrique: false, leste: false, pas: 5 },
  { id: 'mobilite-cheville', nom: 'Mobilité cheville et voûte plantaire', motif: /mobilit/i, mesure: 'libre', tendon: false, excentrique: false, leste: false, pas: 0 },
  { id: 'tractions', nom: 'Tractions ou tirage vertical', motif: /traction/i, mesure: 'reps', tendon: false, excentrique: false, leste: false, pas: 1 },
  { id: 'developpe-couche', nom: 'Développé couché ou pompes lestées', motif: /couch/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2, repsMax: 10 },
  { id: 'developpe-militaire', nom: 'Développé militaire', motif: /militaire/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2, repsMax: 10 },
  { id: 'pompes', nom: 'Pompes', motif: /^pompes/i, mesure: 'reps', tendon: false, excentrique: false, leste: false, pas: 1 },
  { id: 'rowing', nom: 'Rowing haltère', motif: /rowing/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 2, repsMax: 12 },
  { id: 'elevations', nom: 'Élévations latérales', motif: /[ée]l[ée]vations/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 1, repsMax: 15 },
  { id: 'curl', nom: 'Curl biceps', motif: /curl/i, mesure: 'reps', tendon: false, excentrique: false, leste: true, pas: 1, repsMax: 12 },
  { id: 'dips', nom: 'Dips sur banc', motif: /dips/i, mesure: 'reps', tendon: false, excentrique: false, leste: false, pas: 1 },
]

/** Hors plan, à ajouter à une séance du bas : le palier d'après le renfo lourd (Baxter 2021). */
export const SAUTS = ['sauts-deux', 'sauts-une'] as const

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
  if (!der) {
    if (!plan) return null
    return { ...plan, statut: 'plan', raison: 'Première séance notée : la charge du plan sert de départ.', hausse: null }
  }
  const base: Charge = { series: der.series, valeur: der.valeur, kg: der.kg }
  const tient = (raison: string): Proposition => ({ ...base, statut: 'tient', raison, hausse: null })

  if (der.marge == null) return tient('Marge non notée la dernière fois : même charge.')
  if (der.marge === 'limite') return tient('Dernière série à la limite : même charge.')
  if (der.marge === 'juste') return tient('Dernière série juste : c’est la bonne charge, garde-la.')
  if (avant[avant.length - 2]?.marge !== 'facile') return tient('Encore une séance facile, et la charge monte.')
  if (exo.tendon) {
    const verdict = lendemainCalme(pain, der.day, now)
    if (verdict === 'agite') return tient('Le réveil d’après n’était pas calme : même charge.')
    if (verdict === 'inconnu') return tient('Le réveil d’après n’est pas noté : même charge.')
  }

  const monte = (c: Charge, hausse: string): Proposition => ({
    ...c,
    statut: 'monte',
    raison: exo.tendon
      ? 'Deux séances faciles et un réveil calme : la charge monte.'
      : 'Deux séances faciles : la charge monte.',
    hausse,
  })
  if (exo.mesure === 'duree') return monte({ ...base, valeur: base.valeur + exo.pas }, `+${exo.pas} s`)
  if (exo.mesure === 'contacts') return monte({ ...base, valeur: base.valeur + exo.pas }, `+${exo.pas} contacts`)
  if (exo.leste || base.kg > 0) {
    const valeur = exo.repsMax ? Math.min(base.valeur, exo.repsMax) : base.valeur
    return monte({ ...base, kg: base.kg + exo.pas, valeur }, `+${formatNumber(exo.pas)} kg`)
  }
  return monte({ ...base, valeur: base.valeur + exo.pas }, `+${exo.pas} répétition${exo.pas > 1 ? 's' : ''}`)
}

const UNITE: Record<Mesure, string> = { reps: '', duree: ' s', contacts: ' contacts', libre: '' }

/** « 3 × 20 · 14 kg », « 3 × 45 s », « 3 × 20 contacts ». */
export function formatCharge(exo: ExerciceRenfo, c: Charge): string {
  const kg = c.kg > 0 && exo.mesure === 'reps' ? ` · ${formatNumber(c.kg)} kg` : ''
  return `${c.series} × ${c.valeur}${UNITE[exo.mesure]}${kg}`
}

/**
 * Ce que l'exercice a gagné sur les séances notées jusqu'à `jour` inclus.
 * La charge d'abord, les répétitions ensuite : c'est la charge qui renforce
 * le tendon (Bohm 2015), et un « 14 → 18 kg » se lit sans calcul.
 */
export function evolution(exo: ExerciceRenfo, historique: RenfoRow[], jour: string): string | null {
  const lignes = historique
    .filter((r) => r.exercice === exo.id && r.day <= jour && r.series > 0)
    .sort((a, b) => a.day.localeCompare(b.day))
  if (lignes.length < 2) return null
  const premiere = lignes[0]
  const derniere = lignes[lignes.length - 1]
  const depuis = `Depuis le ${formatDay(premiere.day)}`
  if (exo.mesure === 'reps' && premiere.kg !== derniere.kg)
    return `${depuis} : ${formatNumber(premiere.kg)} → ${formatNumber(derniere.kg)} kg`
  if (premiere.valeur !== derniere.valeur) {
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

/** Au-delà, des sauts qu'on n'a plus faits ne sont plus proposés d'office. */
const SAUTS_RECENTS = 28

/**
 * La liste de la séance : les exercices du plan, puis les sauts s'ils font
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

  if (type === 'muscu-bas') {
    const debut = addDays(jour, -SAUTS_RECENTS)
    for (const id of SAUTS) {
      const recent = historique.some((r) => r.exercice === id && r.series > 0 && r.day >= debut && r.day <= jour)
      if (recent) ajouter(exerciceParId(id)!, '', '', true)
    }
  }
  for (const r of notesDuJour) {
    const exo = exerciceParId(r.exercice) ?? identifier(r.exercice)
    ajouter(exo, '', '', true)
  }
  return liste
}

/** Les sauts qu'on peut encore ajouter à une séance du bas. */
export function sautsAAjouter(type: SessionType, liste: ExerciceDuJour[]): ExerciceRenfo[] {
  if (type !== 'muscu-bas') return []
  return SAUTS.filter((id) => !liste.some((x) => x.exo.id === id)).map((id) => exerciceParId(id)!)
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
