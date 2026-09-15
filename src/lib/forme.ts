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
import type { SessionType } from '../data/types'
import type { FeedbackRow } from './buildPain'
import { addDays } from './dates'

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
}

/**
 * @param base Allure projetée par le dernier test de 3 km, en s/km.
 */
export function ajusterForme(
  base: number,
  feedback: FeedbackRow[],
  now: string,
): AjustementForme {
  const depuis = addDays(now, -FENETRE)

  const ecarts: number[] = []
  for (const f of feedback) {
    if (f.day > now || f.day <= depuis) continue
    const attendu = RPE_ATTENDU[f.session_type as SessionType]
    if (attendu == null) continue
    if (f.pain >= DOULEUR_MAX) continue
    ecarts.push(f.rpe - attendu)
  }

  if (ecarts.length < MIN_SEANCES) {
    return { allure: base, ecart: 0, seances: ecarts.length, borne: false }
  }

  const moyen = ecarts.reduce((a, b) => a + b, 0) / ecarts.length
  const brut = moyen * SEC_PAR_POINT
  const ecart = Math.round(Math.max(-ECART_MAX, Math.min(ECART_MAX, brut)))

  return {
    allure: base + ecart,
    ecart,
    seances: ecarts.length,
    borne: Math.abs(brut) > ECART_MAX,
  }
}
