/**
 * Les trois chiffres du haut de l'écran Aujourd'hui.
 *
 * Rien n'est inventé ici : les séances réalisées sont celles qui portent un
 * ressenti OU qui trouvent une activité importée du même type le jour même —
 * exactement la même règle que `buildLoad` pour compter la charge. Un chiffre
 * affiché qui ne correspondrait pas à ce que le modèle prend en compte serait
 * pire que pas de chiffre du tout.
 */
import type { SessionType, Week } from '../data/types'
import type { ActivityRow } from './load'
import type { FeedbackRow } from './buildPain'
import type { SeancePlanifiee } from './adapt'
import { addDays } from './dates'

export type Famille = 'course' | 'velo' | 'renfo'

const FAMILLE_SEANCE: Partial<Record<SessionType, Famille>> = {
  long: 'course',
  ef: 'course',
  inter: 'course',
  tempo: 'course',
  test: 'course',
  course: 'course',
  race: 'course',
  velo: 'velo',
  'muscu-haut': 'renfo',
  'muscu-bas': 'renfo',
}

/** Escalade et repos n'appartiennent à aucune famille comptée. */
export const familleDe = (t: SessionType): Famille | null => FAMILLE_SEANCE[t] ?? null

const FAMILLE_SPORT: Record<string, Famille> = {
  Run: 'course',
  Ride: 'velo',
  Weight: 'renfo',
}

/** Famille d'une activité importée. Escalade et rando n'en ont pas. */
export const familleDuSport = (sport: string): Famille | null => FAMILLE_SPORT[sport] ?? null

export interface Compteur {
  prevu: number
  realise: number
}

export interface Insights {
  seances: Record<Famille, Compteur>
  seancesTotal: Compteur
  /** Kilomètres de course sur les sept derniers jours. */
  km7: number
  /** Kilomètres de course jour par jour, du plus ancien au plus récent. */
  km7Jours: number[]
  /** Indice de la veille, null si le jour n'est pas dans la série. */
  chargeVeille: number | null
  /** Écart avec l'avant-veille, null si l'un des deux manque. */
  chargeEcart: number | null
}

export interface EntreeInsights {
  semaine: Week
  /** Les séances de la semaine, écarts et adaptation déjà appliqués. */
  seances: SeancePlanifiee[]
  now: string
  feedback: FeedbackRow[]
  activities: ActivityRow[]
  /** Indice par jour, tel que renvoyé par `adapt`. */
  byDate: Record<string, { idx: number }>
}

export function construireInsights({
  semaine,
  seances,
  now,
  feedback,
  activities,
  byDate,
}: EntreeInsights): Insights {
  const vide = (): Compteur => ({ prevu: 0, realise: 0 })
  const compteurs: Record<Famille, Compteur> = { course: vide(), velo: vide(), renfo: vide() }

  // Familles couvertes par une activité importée, jour par jour.
  const importeesParJour = new Map<string, Set<Famille>>()
  for (const a of activities) {
    const f = FAMILLE_SPORT[a.sport]
    if (!f) continue
    const set = importeesParJour.get(a.day) ?? new Set<Famille>()
    set.add(f)
    importeesParJour.set(a.day, set)
  }

  const notees = new Set(feedback.map((f) => `${f.week}-${f.day_index}-${f.slot}`))

  seances.forEach(({ s, jourOrigine, slot, day }) => {
    // Une séance déclarée non faite n'est ni prévue ni réalisée : la compter
    // au dénominateur donnerait une semaine perpétuellement en retard.
    if (s.saute) return
    const f = familleDe(s.type)
    if (!f) return
    compteurs[f].prevu++

    if (day > now) return

    const aUnRessenti = notees.has(`${semaine.n}-${jourOrigine}-${slot}`)
    const aUneActivite = importeesParJour.get(day)?.has(f) ?? false
    if (aUnRessenti || aUneActivite) compteurs[f].realise++
  })

  const seancesTotal: Compteur = {
    prevu: compteurs.course.prevu + compteurs.velo.prevu + compteurs.renfo.prevu,
    realise: compteurs.course.realise + compteurs.velo.realise + compteurs.renfo.realise,
  }

  // Sept derniers jours glissants, aujourd'hui inclus.
  const km7Jours: number[] = []
  for (let k = 6; k >= 0; k--) {
    const jour = addDays(now, -k)
    const km = activities
      .filter((a) => a.day === jour && a.sport === 'Run')
      .reduce((total, a) => total + a.distance_m / 1000, 0)
    km7Jours.push(Math.round(km * 10) / 10)
  }
  const km7 = Math.round(km7Jours.reduce((a, b) => a + b, 0) * 10) / 10

  const veille = byDate[addDays(now, -1)]?.idx ?? null
  const avantVeille = byDate[addDays(now, -2)]?.idx ?? null

  return {
    seances: compteurs,
    seancesTotal,
    km7,
    km7Jours,
    chargeVeille: veille,
    chargeEcart: veille != null && avantVeille != null ? veille - avantVeille : null,
  }
}
