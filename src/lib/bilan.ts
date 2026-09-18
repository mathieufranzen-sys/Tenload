/**
 * Le bilan de la semaine, le dimanche soir et le lundi matin.
 *
 * Demandé par Mathieu le 16 septembre 2026, enrichi le 18 avec les repères de
 * Maxime : volume sur 28 jours, part de la sortie longue, minutes cumulées au
 * seuil, dosage seuil contre vitesse, réserve de répétitions, jours sans
 * douleur, semaines d'affilée. Plus trois choses qu'il a demandées nommément :
 * les erreurs de la semaine, des adaptations chiffrées avec leur déclencheur,
 * et un mot mental pour la semaine qui vient.
 *
 * Même règle que le coach : aucun chiffre qui ne soit une mesure. Une charge
 * réelle comparée au plan alors qu'une séance n'est pas notée serait fausse, et
 * toujours dans le sens rassurant : l'écart n'est alors pas calculé.
 *
 * Les faits arrivent calculés depuis `Today`. Ce module ne fait que les
 * assembler, les juger et les mettre en phrases : c'est ce qui le garde pur et
 * testable.
 */
import type { Session, SessionType, Week } from '../data/types'
import type { PainMap } from './tendonIndex'
import { DAYS_LONG, addDays, formatNumber, weekdayIndex } from './dates'
import { sessionLoad } from './load'

const COURSE: SessionType[] = ['long', 'ef', 'tempo', 'inter', 'test', 'course', 'race']

/** Effort perçu maximum attendu, selon ce que la séance travaille. */
export const EFFORT_MAX = { seuil: 7.5, specifique: 9, 'allure marathon': 8, vitesse: 8 } as const
/** Minutes cumulées au seuil visées sur une semaine (Maxime). */
export const SEUIL_CIBLE = [20, 30] as const
/** Au-delà, une journée écrase la semaine. */
export const PART_LONGUE_MAX = 45

export interface SeanceBilan {
  /** La séance vécue, écarts et adaptation appliqués. */
  s: Session
  typePlan: SessionType
  day: string
  faite: boolean
  /** Effort perçu et douleur saisis, quand la séance est notée. */
  rpe: number | null
  douleur: number | null
  /** La séance du plan de référence, pour dire ce qui a changé. */
  reference: Session | null
}

/** Ce que Today sait calculer et que le bilan se contente de lire. */
export interface FaitsBilan {
  /** Kilomètres de course notés sur 28 jours. */
  volume28: number
  /** Jours dont la charge est une mesure, sur les sept de la semaine. */
  attestes: number
  /** Jours sans douleur au-dessus de 2, et relevés dans cette fenêtre. */
  sansDouleur: { jours: number; releves: number }
  /** Jours d'excentrique d'affilée, aujourd'hui compris. */
  excentriqueSerie: number
  /** Semaines d'affilée sans interruption. */
  semainesDAffilee: number
  /**
   * Indice de charge sur la semaine. `emballement` et `monotonie` sont les
   * POINTS des deux termes, sur 30 et sur 8, pas le rapport brut : c'est ce que
   * le modèle calcule et affiche ailleurs, et inventer une seconde échelle
   * ferait deux chiffres pour la même chose.
   */
  indice: { moyen: number | null; pic: number | null; emballement: number | null; monotonie: number | null }
  /** Forme projetée et son écart au dernier test, voir `forme.ts`. */
  forme: { allure: number; ecart: number; seances: number } | null
  /** Jours restants avant les deux échéances. */
  echeances: { dixKm: number | null; marathon: number }
  /** Séances de seuil et de vitesse sur les 28 derniers jours. */
  dosage: { seuil: number; vitesse: number }
}

export interface EntreeBilan {
  semaine: Week
  /** Les séances qui tombent réellement dans la semaine calendaire. */
  seances: SeanceBilan[]
  pain: PainMap
  /** Charge tendineuse par jour. */
  charge: Record<string, number>
  now: string
  faits: FaitsBilan
  suivante?: { semaine: Week; seances: SeanceBilan[] }
}

export type MomentDouleur = 'réveil' | 'effort' | 'soir'

export interface BilanSemaine {
  n: number
  du: string
  au: string
  faites: number
  prevues: number
  sautees: number
  nonNotees: number
  kmRealises: number
  kmPrevus: number
  volume28: number
  /** Part de la sortie longue dans le volume réel, en pourcentage. */
  partLongue: number | null
  seuilMin: number
  dosage: { seuil: number; vitesse: number }
  chargeRealisee: number
  chargePrevue: number
  /** En pourcentage du plan. Null dès qu'une séance passée n'est pas notée. */
  ecartCharge: number | null
  raideur: number | null
  raideurPrecedente: number | null
  pic: { valeur: number; day: string; moment: MomentDouleur } | null
  excentrique: number
  excentriqueSerie: number
  sansDouleur: { jours: number; releves: number }
  attestes: number
  semainesDAffilee: number
  rpeMoyen: number | null
  indice: FaitsBilan['indice']
  forme: FaitsBilan['forme']
  echeances: FaitsBilan['echeances']
  erreurs: string[]
  adaptations: string[]
  mental: string
  suivante: string[]
}

const moyenneSiAssez = (xs: number[]): number | null =>
  // Trois matins au minimum : en dessous, une seule nuit fait la moyenne.
  xs.length >= 3 ? xs.reduce((a, b) => a + b, 0) / xs.length : null

const moyenne = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length

function reveilsSemaine(pain: PainMap, debut: string, fin?: string): number[] {
  const out: number[] = []
  for (let k = 0; k < 7; k++) {
    const d = addDays(debut, k)
    if (fin && d > fin) break
    const v = pain[d]?.wake
    if (v != null) out.push(v)
  }
  return out
}

const km = (v: number) => `${formatNumber(v)} km`
const jourDe = (iso: string) => DAYS_LONG[weekdayIndex(iso)].toLowerCase()

/** L'effort maximum attendu d'une séance, d'après ce qu'elle travaille. */
export function effortAttendu(s: Session): number | null {
  const nature = s.qualite
  return nature ? EFFORT_MAX[nature] ?? null : null
}

export function bilanSemaine({ semaine, seances, pain, charge, now, faits, suivante }: EntreeBilan): BilanSemaine {
  const du = semaine.monday
  const au = addDays(du, 6)
  const fin = now < au ? now : au
  const jours: string[] = []
  for (let d = du; d <= fin; d = addDays(d, 1)) jours.push(d)

  const actives = seances.filter((x) => x.s.type !== 'repos')
  const passees = actives.filter((x) => x.day <= now)
  const sautees = actives.filter((x) => x.s.saute).length
  const faites = actives.filter((x) => x.faite && !x.s.saute).length
  const nonNotees = passees.filter((x) => !x.faite && !x.s.saute).length

  const courues = actives.filter((x) => x.faite && !x.s.saute && COURSE.includes(x.s.type))
  const kmRealises = courues.reduce((a, x) => a + (x.s.dist ?? 0), 0)
  const kmPrevus = semaine.sessions
    .filter((s) => COURSE.includes(s.type))
    .reduce((a, s) => a + (s.dist ?? 0), 0)
  const longue = seances.find((x) => x.s.type === 'long' && !x.s.saute)
  const partLongue = longue?.s.dist && kmRealises > 0 ? (longue.s.dist / kmRealises) * 100 : null

  const seuilMin = actives
    .filter((x) => x.faite && !x.s.saute)
    .reduce((a, x) => a + (x.s.seuilMin ?? 0), 0)

  const chargeRealisee = jours.reduce((a, d) => a + (charge[d] ?? 0), 0)
  const chargePrevue = semaine.sessions
    .filter((s) => addDays(du, s.day) <= fin)
    .reduce((a, s) => a + sessionLoad(s), 0)
  const ecartCharge =
    nonNotees === 0 && chargePrevue > 0 ? Math.round((chargeRealisee / chargePrevue - 1) * 100) : null

  const rpes = actives.map((x) => x.rpe).filter((v): v is number => v != null)
  const rpeMoyen = rpes.length ? moyenne(rpes) : null

  let pic: BilanSemaine['pic'] = null
  for (const d of jours) {
    const p = pain[d]
    for (const [moment, v] of [['réveil', p?.wake], ['effort', p?.effort], ['soir', p?.evening]] as const) {
      if (v != null && (pic == null || v > pic.valeur)) pic = { valeur: v, day: d, moment }
    }
  }

  const raideur = moyenneSiAssez(reveilsSemaine(pain, du, fin))
  const raideurPrecedente = moyenneSiAssez(reveilsSemaine(pain, addDays(du, -7)))

  const base = {
    n: semaine.n,
    du,
    au,
    faites,
    prevues: actives.length,
    sautees,
    nonNotees,
    kmRealises: Math.round(kmRealises * 10) / 10,
    kmPrevus: Math.round(kmPrevus * 10) / 10,
    volume28: faits.volume28,
    partLongue,
    seuilMin,
    dosage: faits.dosage,
    chargeRealisee: Math.round(chargeRealisee),
    chargePrevue: Math.round(chargePrevue),
    ecartCharge,
    raideur,
    raideurPrecedente,
    pic,
    excentrique: jours.filter((d) => pain[d]?.eccentric).length,
    excentriqueSerie: faits.excentriqueSerie,
    sansDouleur: faits.sansDouleur,
    attestes: faits.attestes,
    semainesDAffilee: faits.semainesDAffilee,
    rpeMoyen,
    indice: faits.indice,
    forme: faits.forme,
    echeances: faits.echeances,
  }

  return {
    ...base,
    erreurs: erreursDeLaSemaine(actives, base),
    adaptations: adaptations(base),
    mental: motMental(base, suivante?.semaine),
    suivante: suivante ? ceQueChangeLaSuivante(seances, suivante) : [],
  }
}

type Base = Omit<BilanSemaine, 'erreurs' | 'adaptations' | 'mental' | 'suivante'>

/**
 * Les erreurs de la semaine, nommées.
 *
 * Maxime les compte plutôt que ses kilomètres : 45 à 50 sur une mauvaise année,
 * 10 à 20 sur une bonne. Chacune dit ce qui s'est passé et ce que ça coûte, et
 * aucune ne se déduit d'une absence de donnée.
 */
function erreursDeLaSemaine(actives: SeanceBilan[], b: Base): string[] {
  const out: string[] = []

  for (const x of actives) {
    const cible = effortAttendu(x.s)
    if (x.rpe != null && cible != null && x.rpe > cible) {
      out.push(
        `${x.s.title} du ${jourDe(x.day)} courue à ${formatNumber(x.rpe)} sur dix, pour ${formatNumber(cible)} attendu. ` +
          `Une séance partie trop vite se paie le lendemain et empêche de prendre du volume.`,
      )
    }
    if (x.douleur != null && x.douleur >= 4) {
      out.push(
        `${x.s.title} du ${jourDe(x.day)} faite avec ${formatNumber(x.douleur)} de douleur. ` +
          `Au-dessus de 4, la séance n'apprend plus rien au tendon, elle lui coûte.`,
      )
    }
  }

  if (b.nonNotees > 0) {
    out.push(
      `${b.nonNotees} séance${b.nonNotees > 1 ? 's' : ''} sans ressenti. Leur journée ne compte pas ` +
        `dans la charge, et l'indice suppose au lieu de mesurer.`,
    )
  }
  if (b.partLongue != null && b.partLongue > PART_LONGUE_MAX) {
    out.push(
      `Ta sortie longue pèse ${Math.round(b.partLongue)} % de la semaine, la limite est ${PART_LONGUE_MAX} %. ` +
        `Une journée qui écrase les six autres, c'est le profil de charge qui use un tendon.`,
    )
  }
  return out
}

/**
 * Ce que je propose de changer, chaque proposition avec la donnée qui la
 * déclenche. Elles ne se contredisent pas : la douleur coupe l'intensité, la
 * fatigue coupe le volume, et on ne majore que sur des signaux qui vont tous
 * dans le même sens.
 */
function adaptations(b: Base): string[] {
  const out: string[] = []
  const baisse = b.raideur != null && b.raideurPrecedente != null && b.raideurPrecedente - b.raideur >= 0.3
  const hausse = b.raideur != null && b.raideurPrecedente != null && b.raideur - b.raideurPrecedente >= 0.4
  const picHaut = b.pic != null && b.pic.valeur >= 3

  if (hausse || picHaut) {
    const raison = hausse
      ? `ta raideur remonte de ${formatNumber(b.raideurPrecedente!)} à ${formatNumber(b.raideur!)}`
      : `ton pic de douleur atteint ${formatNumber(b.pic!.valeur)}`
    out.push(
      `Couper l'intensité, pas le volume : ${raison}. La séance de qualité redevient du seuil facile, ` +
        `l'endurance ne bouge pas. C'est la douleur qui décide, et elle décide en premier.`,
    )
  } else if (baisse && b.attestes >= 6 && (b.indice.emballement ?? 30) < 10) {
    out.push(
      `Majorer le volume de 5 % : ta raideur descend de ${formatNumber(b.raideurPrecedente!)} à ` +
        `${formatNumber(b.raideur!)}, ton emballement pèse ${Math.round(b.indice.emballement!)} points sur 30 et tu as ` +
        `attesté ${b.attestes} jours sur 7. Tu encaisses plus que tu ne dépenses.`,
    )
  }

  if (b.rpeMoyen != null && b.rpeMoyen > 7.5) {
    out.push(
      `Ralentir les séances de 5 s/km : ton effort perçu moyen est à ${formatNumber(b.rpeMoyen)}, pour 7,5 au ` +
        `maximum hors bloc spécifique. Moins vite en séance, c'est mieux de volume dans la semaine.`,
    )
  }
  if (b.seuilMin > 0 && b.seuilMin < SEUIL_CIBLE[0]) {
    out.push(
      `Allonger le seuil : ${b.seuilMin} minutes cumulées cette semaine, la cible est ${SEUIL_CIBLE[0]} à ` +
        `${SEUIL_CIBLE[1]}. Une répétition de plus suffit, à allure identique.`,
    )
  }
  if (b.dosage.vitesse > b.dosage.seuil / 3 && b.dosage.seuil + b.dosage.vitesse >= 4) {
    out.push(
      `Rendre une séance de vitesse au seuil : ${b.dosage.vitesse} vitesses pour ${b.dosage.seuil} seuils sur ` +
        `28 jours, le dosage d'un marathonien est de trois seuils pour une vitesse.`,
    )
  }
  if (out.length === 0) {
    out.push('Rien à changer : la semaine prochaine se court telle qu’elle est écrite.')
  }
  return out
}

/**
 * Le mot mental pour la semaine qui vient. Il ne parle pas de ce qui s'est
 * passé mais de ce qu'il faut accepter de ne pas ressentir, et de l'endroit où
 * mettre l'envie de se tester.
 */
function motMental(b: Base, suivante?: Week): string {
  const course = suivante?.sessions.find((s) => s.type === 'course' || s.type === 'race')
  if (course) {
    return (
      `Semaine de dossard : ${course.title}. Tu vas te sentir bizarrement frais et avoir envie d'en faire ` +
      `plus. N'en fais pas plus, c'est le piège classique. Le jour J, pars sur ton niveau d'aujourd'hui, ` +
      `pas sur ton record.`
    )
  }
  if (suivante?.deload) {
    return (
      `Semaine de décharge. Elle sert à encaisser ce que tu viens de faire, pas à te reposer d'un échec. ` +
      `La qualité ne bouge pas, tout le reste raccourcit : c'est normal de finir les séances avec de la marge.`
    )
  }
  if (b.echeances.dixKm != null && b.echeances.dixKm <= 35) {
    return (
      `Le 10 km est dans ${b.echeances.dixKm} jours. À partir d'ici, chaque séance spécifique compte plus que ` +
      `le volume. Garde tes efforts maximaux pour le dossard : le 10 sur 10 n'a sa place que là.`
    )
  }
  return (
    `Semaine de volume, pas de chrono. Tu ne verras probablement aucun progrès à l'entraînement avant trois à ` +
    `quatre semaines, et c'est normal : la forme se construit sans se voir. Ne compare pas tes allures à celles ` +
    `de la saison passée, tu n'y gagnerais que du doute.`
  )
}

/**
 * Ce que la semaine suivante change, en phrases. Rien d'autre que ce que le
 * plan porte ou ce que le moteur a déjà appliqué : la projection de l'indice
 * ne vaut que sur dix jours, et elle le dit.
 */
function ceQueChangeLaSuivante(
  cetteSemaine: SeanceBilan[],
  { semaine, seances }: { semaine: Week; seances: SeanceBilan[] },
): string[] {
  const out: string[] = []
  const vivantes = seances.filter((x) => !x.s.saute)

  if (semaine.deload) out.push('Semaine de décharge : le volume baisse, la qualité ne bouge pas.')

  const dossard = vivantes.find((x) => x.s.type === 'course' || x.s.type === 'race')
  if (dossard) out.push(`${dossard.s.title} le ${jourDe(dossard.day)} : la semaine s'allège pour arriver frais.`)

  const longue = vivantes.find((x) => x.s.type === 'long')
  const longueCette = cetteSemaine.find((x) => x.s.type === 'long' && !x.s.saute)
  if (longue?.s.dist) {
    const palier = longue.s.adapted?.startsWith('Palier') ? longue.s.adapted.split(' · ')[1] : null
    if (palier && longue.reference?.dist && longue.reference.dist !== longue.s.dist) {
      out.push(
        `Sortie longue tenue à ${km(longue.s.dist)} au lieu de ${km(longue.reference.dist)} : ${palier.charAt(0).toLowerCase()}${palier.slice(1)}.`,
      )
    } else {
      out.push(
        `Sortie longue de ${km(longue.s.dist)}${longueCette?.s.dist ? `, contre ${km(longueCette.s.dist)} cette semaine` : ''}.`,
      )
    }
  }

  const qualite = vivantes.find((x) => x.s.seuilMin || x.s.qualite)
  if (qualite) {
    const min = qualite.s.seuilMin
    out.push(`${qualite.s.title} le ${jourDe(qualite.day)}${min ? `, ${min} minutes cumulées au seuil` : ''}.`)
  }

  const adaptees = vivantes.filter(
    (x) => x.s.adapted && !x.s.adapted.startsWith('Palier') && x.s.type !== x.typePlan,
  )
  if (adaptees.length) {
    out.push(
      `L'indice projeté change déjà ${adaptees.length > 1 ? `${adaptees.length} séances` : 'une séance'} : ${adaptees
        .map((x) => `${jourDe(x.day)}, ${x.s.title.toLowerCase()}`)
        .join(' ; ')}. Ça peut encore bouger d'ici là.`,
    )
  }

  if (out.length === 0) out.push('Semaine type, rien de particulier annoncé.')
  return out
}
