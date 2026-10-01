/**
 * Construction de la charge tendineuse quotidienne.
 *
 * Deux sources se complètent :
 *   - le passé vient de ce qui a réellement été fait — les activités importées
 *     de Strava jusqu'au 9 août 2026, les ressentis saisis dans l'app ensuite ;
 *   - le futur vient du plan, ce qui permet de PROJETER l'indice sur dix jours
 *     et de voir venir une zone orange avant d'y être.
 *
 * `activities` est un historique figé : l'intégration Strava a été retirée,
 * plus rien de neuf n'y entre. Tout ce qui arrive passe par les ressentis.
 *
 * Règle anti-double-comptage : si une journée passée porte au moins une
 * activité enregistrée, on ignore le plan pour cette journée.
 */
import type { Session, SessionType, Week } from '../data/types'
import { KM_COST, MIN_COST, RUN_COST, VELO_Z3, estVeloAppuye, surcoutLongue, type LoadMap } from './tendonIndex'
import { addDays } from './dates'
import { formeNotee, seancesAvecEcarts, slotsParJour, type EcartRow } from './overrides'
import type { FeedbackRow } from './buildPain'
import { familleDe, familleDuSport } from './insights'

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
      return km * KM_COST.ef + surcoutLongue(km)
    }
    case 'Ride':
      return min * (estVeloAppuye(name) ? VELO_Z3 : MIN_COST.velo)
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

/**
 * Charge d'une séance planifiée.
 *
 * Le coût au kilomètre n'existe que pour ce qui se court. Une distance ne
 * suffit donc pas à basculer sur ce tarif : depuis que « Donnée réelle »
 * accepte des kilomètres sur le vélo, une sortie de 40 km à vélo tombait sur
 * le repli `?? 1` et coûtait 40 points de charge, contre 4 pour ses 40 minutes.
 * Dix fois trop, sur la seule discipline que le plan utilise justement pour
 * porter du volume sans charger le tendon.
 */
export function sessionLoad(s: Session): number {
  // La fin des longues coûte plus que leur début : au-delà de 20 km seulement.
  const fin = (km: number) => (s.type === 'long' ? surcoutLongue(km) : 0)
  if (s.struct?.length) {
    const km = s.struct.reduce((acc, seg) => acc + seg.km, 0)
    return s.struct.reduce((acc, seg) => acc + seg.km * (KM_COST[seg.zone] ?? 1), 0) + fin(km)
  }
  const auKm = RUN_COST[s.type]
  if (auKm != null && s.dist) return s.dist * auKm + fin(s.dist)
  const minutes = s.dur?.[0] ?? 0
  if (s.type === 'velo') return minutes * (estVeloAppuye(s.title) ? VELO_Z3 : MIN_COST.velo)
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
  /** Écarts volontaires, indexés par `cleEcart`. Absent = plan nominal. */
  ecarts?: Map<string, EcartRow>
  /**
   * Les ressentis : une séance notée pèse la forme sous laquelle elle a été
   * faite. Sans eux, une course passée au vélo par l'indice pesait encore ses
   * kilomètres une fois notée.
   */
  feedback?: FeedbackRow[]
  /**
   * La forme projetée d'une séance à venir, plafonds de progression et
   * reprise compris (`formeProjetee`, adapt.ts). Sans elle, la projection
   * reprenait le plan tel qu'écrit juste après une crise.
   */
  projection?: (s: Session, plan: Session, cle: string, day: string) => Session
}

export interface LoadParDiscipline {
  course: number
  velo: number
  autre: number
}

const familleActivite = (sport: string): keyof LoadParDiscipline => {
  const f = familleDuSport(sport)
  return f === 'course' || f === 'velo' ? f : 'autre'
}

const familleSession = (type: SessionType): keyof LoadParDiscipline => {
  const f = familleDe(type)
  return f === 'course' || f === 'velo' ? f : 'autre'
}

/**
 * Comme `buildLoad`, mais la charge de chaque jour est répartie par
 * discipline plutôt que sommée en un seul nombre. Sert le graphique « Charge
 * d'entraînement par semaine » de l'écran Suivi : il doit lire le même coût
 * que l'indice de charge, pas l'effort relatif de Strava, un chiffre que
 * Strava calcule à sa façon et qui n'a rien à voir avec le modèle de l'app.
 */
export function buildLoadParDiscipline({
  weeks,
  activities,
  completed,
  today,
  horizon = 21,
  ecarts,
  feedback,
  projection,
}: BuildLoadInput): Record<string, LoadParDiscipline> {
  const notees = new Map((feedback ?? []).map((f) => [`${f.week}-${f.day_index}-${f.slot}`, f]))
  const load: Record<string, LoadParDiscipline> = {}
  const bump = (day: string, famille: keyof LoadParDiscipline, valeur: number) => {
    if (!valeur) return
    const cur = load[day] ?? { course: 0, velo: 0, autre: 0 }
    cur[famille] += valeur
    load[day] = cur
  }

  const daysWithActivity = new Set<string>()
  for (const a of activities) {
    bump(a.day, familleActivite(a.sport), activityLoad(a))
    daysWithActivity.add(a.day)
  }

  const limit = addDays(today, horizon)
  for (const w of weeks) {
    // Le slot est le rang dans la JOURNÉE, pas l'index dans la semaine : c'est
    // la clé sous laquelle les ressentis et les écarts sont enregistrés.
    const slots = slotsParJour(w.sessions)
    const seances = ecarts ? seancesAvecEcarts(w, ecarts) : w.sessions

    seances.forEach((s, i) => {
      // Une séance déclarée non faite ne charge rien : le tendon n'a rien
      // encaissé, exactement comme une journée sans activité importée.
      if (s.saute) return

      // `semaines` porte le franchissement du dimanche : sans lui, une séance
      // déplacée d'une semaine chargeait le mauvais jour, sept jours trop tôt
      // ou trop tard.
      const day = addDays(w.monday, s.day + 7 * (s.semaines ?? 0))
      if (day > limit) return
      if (day <= today) {
        // Le passé appartient aux activités enregistrées. On ne complète avec le
        // plan que pour une journée sans aucune activité ET dont la séance a été
        // notée à la main (typiquement la muscu ou l'escalade, absentes de Strava).
        if (daysWithActivity.has(day)) return
        // La clé garde le jour d'ORIGINE : déplacer une séance ne doit pas
        // détacher le ressenti qui lui était déjà rattaché.
        const cle = `${w.n}-${w.sessions[i].day}-${slots[i]}`
        if (!completed.has(cle)) return
        const f = notees.get(cle)
        const faite = f ? formeNotee(s, f, ecarts?.get(cle)?.patch.dist != null) : s
        bump(day, familleSession(faite.type), sessionLoad(faite))
        return
      }
      const projetee = projection ? projection(s, w.sessions[i], `${w.n}-${w.sessions[i].day}-${slots[i]}`, day) : s
      bump(day, familleSession(projetee.type), sessionLoad(projetee))
    })
  }

  return load
}

/**
 * Les jours dont la charge est une MESURE, et non un silence.
 *
 * `buildLoad` ne peut pas les distinguer : un dimanche de repos et un mardi de
 * 24 km non noté valent tous les deux zéro. L'indice lisait donc un carnet
 * muet comme une semaine légère, c'est-à-dire dans le sens rassurant, qui est
 * le seul dangereux. C'est le même angle mort que `painInconnue` du côté de la
 * douleur, et il n'avait pas d'équivalent côté charge.
 *
 * Un jour est attesté quand :
 *   - une activité importée le couvre — l'historique Strava jusqu'au 9 août ;
 *   - ou toutes ses séances sont notées, sautées, ou du repos, qui n'a rien à
 *     noter (contrainte 4 : le dimanche est un repos jambes complet) ;
 *   - ou il est dans le futur, où le plan EST la projection.
 *
 * Une seule séance oubliée suffit à retirer le jour : la charge d'un jour est
 * la somme de ses séances, pas la plus grosse.
 */
export function joursAttestes({
  weeks,
  activities,
  completed,
  today,
  horizon = 21,
  ecarts,
}: BuildLoadInput): Set<string> {
  const parActivite = new Set(activities.map((a) => a.day))
  const vus = new Set<string>()
  const manquants = new Set<string>()

  const limit = addDays(today, horizon)
  for (const w of weeks) {
    const slots = slotsParJour(w.sessions)
    const seances = ecarts ? seancesAvecEcarts(w, ecarts) : w.sessions

    seances.forEach((s, i) => {
      const day = addDays(w.monday, s.day + 7 * (s.semaines ?? 0))
      if (day > limit) return
      vus.add(day)
      if (day > today || parActivite.has(day)) return
      if (s.saute || s.type === 'repos') return
      if (!completed.has(`${w.n}-${w.sessions[i].day}-${slots[i]}`)) manquants.add(day)
    })
  }

  const attestes = new Set(parActivite)
  for (const d of vus) if (!manquants.has(d)) attestes.add(d)
  return attestes
}

export function buildLoad(input: BuildLoadInput): LoadMap {
  const parDiscipline = buildLoadParDiscipline(input)
  const load: LoadMap = {}
  for (const [day, v] of Object.entries(parDiscipline)) {
    load[day] = v.course + v.velo + v.autre
  }
  return load
}
