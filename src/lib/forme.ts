/**
 * Ajustement de la forme projetée par l'effort perçu.
 *
 * Le test de 3 km reste l'ancre : c'est la seule mesure directe de la
 * cylindrée. Mais il se fait exceptionnellement — Mathieu n'en refera pas
 * avant la fin du bloc A — et entre deux tests la forme projetée restait figée
 * pendant des mois alors que l'entraînement, lui, avance.
 *
 * Le ressenti comble ce trou. À allure donnée, un effort perçu plus bas que
 * prévu dit qu'on encaisse mieux ; plus haut, qu'on encaisse moins bien.
 *
 * Quatre garde-fous, parce qu'un RPE est bruité (sommeil, chaleur, stress) et
 * qu'aucun d'eux ne doit pouvoir emmener le plan loin de la mesure :
 *
 *  1. Seules les séances de course informent. Le renfo et l'escalade n'ont pas
 *     d'allure, leur RPE ne dit rien de la vitesse.
 *  2. Une séance douloureuse est écartée. Au-delà de 4, le RPE mesure la
 *     douleur, pas la condition physique — c'est même l'inverse d'un signal de
 *     forme.
 *  3. Il faut au moins trois séances exploitables sur 28 jours. En dessous,
 *     une mauvaise journée déplacerait la projection à elle seule.
 *  4. L'écart total est borné à ±15 s/km. Le ressenti nuance le test, il ne le
 *     remplace pas : au-delà, c'est un nouveau test qu'il faut, pas un calcul.
 */
import type { SessionType, Week } from '../data/types'
import type { FeedbackRow } from './buildPain'
import { addDays } from './dates'
import { cleEcart, slotsParJour, type EcartRow } from './overrides'
import { PLAGE_LENTE, ZONE_OFFSETS } from './paces'

/**
 * Effort perçu attendu pour chaque type de séance, quand les allures sont
 * justes. Ce sont les repères de l'échelle décrite dans la feuille de séance :
 * 4 « facile, conversation possible », 8 « dur, allure de seuil ».
 */
export const RPE_ATTENDU: Partial<Record<SessionType, number>> = {
  ef: 4,
  long: 7,
  tempo: 8,
  inter: 9,
  course: 8,
}

/** Secondes par kilomètre pour un point d'effort perçu d'écart. */
export const SEC_PAR_POINT = 4

/** Écart maximal que le ressenti seul peut produire, en secondes par km. */
export const ECART_MAX = 15

/** Nombre minimum de séances exploitables avant d'ajuster quoi que ce soit. */
export const MIN_SEANCES = 3

/** Fenêtre d'observation, en jours. */
export const FENETRE = 28

/** Au-delà, le RPE parle de la douleur et plus de la forme. */
export const DOULEUR_MAX = 4

export interface AjustementForme {
  /** Allure projetée après ajustement, en s/km. */
  allure: number
  /** Écart appliqué, en s/km. Positif = plus lent que le test ne disait. */
  ecart: number
  /** Séances exploitables trouvées dans la fenêtre. */
  seances: number
  /** Vrai quand l'écart a été rogné par la borne. */
  borne: boolean
  /** Séances dont l'allure réelle est connue, parmi les exploitables. */
  chronometrees: number
}

/**
 * Une course facile dont on connaît le temps : la « donnée réelle » saisie
 * dans la feuille de séance, durée et distance.
 *
 * Ajouté le 29 septembre 2026 : sans Strava, la forme ne bougeait que par
 * l'effort perçu, et un carnet noté près de l'effort attendu la laissait plate
 * depuis août. Mathieu saisit déjà le temps de ses courses : c'est la seule
 * mesure de vitesse que l'app reçoit.
 *
 * Seules les courses faciles comptent (endurance, récupération, sortie longue
 * sans allure rapide) : leur allure a une plage prescrite, à laquelle on peut
 * la comparer. Un fractionné se lit en répétitions, et sa durée totale ne dit
 * rien de l'allure des répétitions.
 */
export interface CourseChronometree {
  day: string
  /** Allure moyenne, en secondes par kilomètre. */
  allure: number
  zone: 'ef' | 'recup'
  rpe: number
  type: SessionType
}

const ZONES_FACILES = ['ef', 'recup']

export function coursesChronometrees(
  feedback: FeedbackRow[],
  ecarts: Map<string, EcartRow> | undefined,
  weeks: Week[],
): CourseChronometree[] {
  const out: CourseChronometree[] = []
  const parNumero = new Map(weeks.map((w) => [w.n, w]))
  for (const f of feedback) {
    if (f.session_type !== 'ef' && f.session_type !== 'long') continue
    if (f.pain >= DOULEUR_MAX) continue
    const patch = ecarts?.get(cleEcart(f.week, f.day_index, f.slot))?.patch
    if (patch?.durMin == null) continue
    const w = parNumero.get(f.week)
    const slots = w ? slotsParJour(w.sessions) : []
    const prevue = w?.sessions.find((s, i) => s.day === f.day_index && slots[i] === f.slot)
    const zones = prevue?.struct?.map((seg) => seg.zone) ?? ['ef']
    if (!zones.every((z) => ZONES_FACILES.includes(z))) continue
    const km = patch.dist ?? f.distance_km ?? prevue?.dist
    if (!km || km < 3) continue
    out.push({
      day: f.day,
      allure: (patch.durMin * 60) / km,
      zone: zones.every((z) => z === 'recup') ? 'recup' : 'ef',
      rpe: f.rpe,
      type: f.session_type,
    })
  }
  return out
}

/**
 * L'écart que dit une course chronométrée, en s/km, par rapport à la forme
 * `base`. L'allure compte seulement hors de la plage prescrite à cette forme :
 * une récupération courue lentement, comme demandé, ne dit pas qu'on a perdu
 * de la forme. L'effort perçu s'y ajoute, à la même échelle que partout.
 */
export function ecartChronometre(c: CourseChronometree, base: number): number {
  const rapide = base + ZONE_OFFSETS[c.zone]
  const lente = base + (PLAGE_LENTE[c.zone] ?? ZONE_OFFSETS[c.zone])
  const allure = c.allure < rapide ? c.allure - rapide : c.allure > lente ? c.allure - lente : 0
  return allure + (c.rpe - (RPE_ATTENDU[c.type] ?? 4)) * SEC_PAR_POINT
}

/**
 * @param base Allure projetée par le dernier test de 3 km, en s/km.
 */
export function ajusterForme(
  base: number,
  feedback: FeedbackRow[],
  now: string,
  chronos: CourseChronometree[] = [],
): AjustementForme {
  const depuis = addDays(now, -FENETRE)
  const dedans = (day: string) => day <= now && day > depuis

  // Une course chronométrée parle par son allure ET son effort ; les autres,
  // par leur effort seul. Chaque séance compte une fois.
  const chronoDu = new Map(chronos.filter((c) => dedans(c.day)).map((c) => [`${c.day}-${c.type}`, c]))
  const ecarts: number[] = []
  let chronometrees = 0
  for (const f of feedback) {
    if (!dedans(f.day)) continue
    const attendu = RPE_ATTENDU[f.session_type as SessionType]
    if (attendu == null) continue
    if (f.pain >= DOULEUR_MAX) continue
    const c = chronoDu.get(`${f.day}-${f.session_type}`)
    if (c) {
      ecarts.push(ecartChronometre(c, base))
      chronometrees++
    } else ecarts.push((f.rpe - attendu) * SEC_PAR_POINT)
  }

  if (ecarts.length < MIN_SEANCES) {
    return { allure: base, ecart: 0, seances: ecarts.length, borne: false, chronometrees }
  }

  const brut = ecarts.reduce((a, b) => a + b, 0) / ecarts.length
  const ecart = Math.round(Math.max(-ECART_MAX, Math.min(ECART_MAX, brut)))

  return {
    allure: base + ecart,
    ecart,
    seances: ecarts.length,
    borne: Math.abs(brut) > ECART_MAX,
    chronometrees,
  }
}

/**
 * La forme projetée semaine après semaine, pour les graphiques de niveau
 * (Suivi) et la tendance de la carte « Forme projetée » (Objectif).
 *
 * Chaque point est `ajusterForme` rejoué à la date donnée, sur les seuls
 * ressentis connus à cette date : c'est ce que l'app aurait affiché ce
 * jour-là. L'ancre est le test ACTUEL : un recalage ancien n'est pas rejoué,
 * la courbe montre ce que le ressenti a fait bouger, pas l'histoire des tests.
 */
export function serieForme(
  base: number,
  feedback: FeedbackRow[],
  dates: string[],
  chronos: CourseChronometree[] = [],
): Array<{ day: string } & AjustementForme> {
  return dates.map((day) => ({ day, ...ajusterForme(base, feedback, day, chronos) }))
}

/**
 * L'effort perçu d'une semaine, contre l'effort attendu de chaque séance :
 * positif, la semaine a paru plus dure que prévu. Mêmes filtres que
 * `ajusterForme` (course seulement, séances douloureuses écartées), pour que
 * le graphique montre exactement ce que la forme lit. Null sans séance.
 */
export function ecartEffortSemaine(feedback: FeedbackRow[], lundi: string): { ecart: number | null; seances: number } {
  const dimanche = addDays(lundi, 6)
  const ecarts: number[] = []
  for (const f of feedback) {
    if (f.day < lundi || f.day > dimanche) continue
    const attendu = RPE_ATTENDU[f.session_type as SessionType]
    if (attendu == null || f.pain >= DOULEUR_MAX) continue
    ecarts.push(f.rpe - attendu)
  }
  return {
    ecart: ecarts.length ? ecarts.reduce((a, b) => a + b, 0) / ecarts.length : null,
    seances: ecarts.length,
  }
}
