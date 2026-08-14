/**
 * Construction de la charge tendineuse quotidienne.
 *
 * Deux sources se complètent :
 *   - le passé vient des activités réellement enregistrées (Strava fait foi) ;
 *   - le futur vient du plan, ce qui permet de PROJETER l'indice sur dix jours
 *     et de voir venir une zone orange avant d'y être.
 *
 * Règle anti-double-comptage : si une journée passée porte au moins une
 * activité enregistrée, on ignore le plan pour cette journée.
 */
import type { Session, Week } from '../data/types'
import { KM_COST, MIN_COST, RUN_COST, type LoadMap } from './tendonIndex'
import { addDays } from './dates'

export interface ActivityRow {
  day: string
  sport: string
  name?: string | null
  distance_m: number
  moving_s: number
  /** Dénivelé positif, en mètres. Absent des instantanés embarqués : la VAP
   *  ne s'affiche que quand Strava l'a remonté. */
  elevation_m?: number | null
  /** Effort relatif Strava. Absent des séances saisies à la main. */
  relative_effort?: number | null
}

/** Devine la nature de la charge d'une activité importée. */
export function activityLoad(a: ActivityRow): number {
  const km = a.distance_m / 1000
  const min = a.moving_s / 60
  const name = (a.name ?? '').toLowerCase()

  switch (a.sport) {
    case 'Run': {
      if (/fractionn|x\s?800|x\s?400|x\s?200|test/.test(name))
        return km * (0.45 * KM_COST.vo2 + 0.55 * KM_COST.ef)
      if (/seuil|tempo/.test(name)) return km * (0.45 * KM_COST.seuil + 0.55 * KM_COST.ef)
      return km * (km >= 18 ? KM_COST.long : KM_COST.ef)
    }
    case 'Ride':
      return min * MIN_COST.velo
    case 'Weight':
      // Seul le bas du corps charge le tendon.
      return /jambe|bas|bulgare|trx|squat|mollet/.test(name) ? min * MIN_COST['muscu-bas'] : 0
    case 'Hike':
      return min * MIN_COST.hike
    case 'Climb':
      return min * MIN_COST.escalade
    default:
      return 0
  }
}

/** Charge d'une séance planifiée. */
export function sessionLoad(s: Session): number {
  if (s.struct?.length) {
    return s.struct.reduce((acc, seg) => acc + seg.km * (KM_COST[seg.zone] ?? 1), 0)
  }
  if (s.dist) return s.dist * (RUN_COST[s.type] ?? 1)
  const minutes = s.dur?.[0] ?? 0
  return minutes * (MIN_COST[s.type] ?? 0)
}

export interface BuildLoadInput {
  weeks: Week[]
  activities: ActivityRow[]
  /** Clés `week-dayIndex-slot` des séances effectivement notées. */
  completed: Set<string>
  /** Aujourd'hui, en ISO. */
  today: string
  /** Horizon de projection, en jours. */
  horizon?: number
}

export function buildLoad({
  weeks,
  activities,
  completed,
  today,
  horizon = 21,
}: BuildLoadInput): LoadMap {
  const load: LoadMap = {}
  const daysWithActivity = new Set<string>()

  for (const a of activities) {
    load[a.day] = (load[a.day] ?? 0) + activityLoad(a)
    daysWithActivity.add(a.day)
  }

  const limit = addDays(today, horizon)
  for (const w of weeks) {
    w.sessions.forEach((s, slot) => {
      const day = addDays(w.monday, s.day)
      if (day > limit) return
      if (day <= today) {
        // Le passé appartient aux activités enregistrées. On ne complète avec le
        // plan que pour une journée sans aucune activité ET dont la séance a été
        // notée à la main (typiquement la muscu ou l'escalade, absentes de Strava).
        if (daysWithActivity.has(day)) return
        if (!completed.has(`${w.n}-${s.day}-${slot}`)) return
      }
      load[day] = (load[day] ?? 0) + sessionLoad(s)
    })
  }

  return load
}
