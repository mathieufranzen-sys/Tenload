/**
 * La forme projetée telle qu'elle était, jour après jour, sur six mois
 * (demandé par Mathieu le 18 octobre 2026 pour les chronos équivalents).
 *
 * `serieForme` part de l'ancre ACTUELLE : rejouée sur le passé, elle prête au
 * mois d'août la forme recalée par le 20 km d'octobre, et le progrès
 * disparaît. Ici chaque date reprend l'ancre qui existait ce jour-là : le
 * test de 3 km, puis chaque course qui recale (10 à 39 km, chrono saisi).
 * Le ressenti la fait vivre entre deux ancres, exactement comme dans l'app.
 * Avant la première ancre, rien : aucune mesure, donc aucun point.
 */
import { ajusterForme, type CourseChronometree } from './forme'
import type { FeedbackRow } from './buildPain'
import { projectFrom3k, projeterMarathon } from './paces'

export interface AncreForme {
  day: string
  /** Allure marathon projetée, en s/km. */
  allure: number
  /** Ce qui a posé l'ancre : « Test de 3 km », le nom du dossard. */
  source: string
}

export function ancresDeForme(
  test: { day: string; secondes: number },
  courses: Array<{ nom: string; day: string; km: number; chronoS: number | null }>,
  now: string,
): AncreForme[] {
  const ancres: AncreForme[] = [{ day: test.day, allure: projectFrom3k(test.secondes), source: 'Test de 3 km' }]
  for (const c of courses)
    if (c.chronoS != null && c.day <= now && c.km >= 10 && c.km < 40)
      ancres.push({ day: c.day, allure: projeterMarathon(c.km, c.chronoS), source: c.nom })
  return ancres.sort((a, b) => a.day.localeCompare(b.day))
}

export interface PointHistorique {
  day: string
  /** Null avant la première ancre. */
  allure: number | null
  /** L'ancre posée ce jour-là, s'il y en a une. */
  ancre: AncreForme | null
}

/**
 * Une allure par date. La dernière date est aujourd'hui et prend la forme
 * que l'app affiche (`formeDuJour`) : le graphique finit sur le chiffre du
 * tableau, même si le profil a été recalé à la main.
 */
export function historiqueForme(
  ancres: AncreForme[],
  feedback: FeedbackRow[],
  dates: string[],
  chronos: CourseChronometree[],
  formeDuJour: number,
): PointHistorique[] {
  return dates.map((day, i) => {
    const ancre = [...ancres].reverse().find((a) => a.day <= day) ?? null
    const posee = ancres.find((a) => a.day === day) ?? null
    if (i === dates.length - 1) return { day, allure: formeDuJour, ancre: posee }
    if (!ancre) return { day, allure: null, ancre: null }
    return { day, allure: ajusterForme(ancre.allure, feedback, day, chronos).allure, ancre: posee }
  })
}
