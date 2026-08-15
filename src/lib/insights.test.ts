import { describe, expect, it } from 'vitest'
import { construireInsights, familleDe } from './insights'
import type { Session, Week } from '../data/types'
import type { ActivityRow } from './load'
import type { FeedbackRow } from './buildPain'
import type { SeancePlanifiee } from './adapt'
import { slotsParJour } from './overrides'
import { addDays } from './dates'

const LUNDI = '2026-08-10'

const seance = (extra: Partial<Session>): Session => ({
  day: 0,
  type: 'ef',
  title: 'Séance',
  cat: 'Course',
  note: '',
  ...extra,
})

const semaine: Week = {
  n: 1,
  bloc: 'A',
  blocName: 'Réathlétisation',
  monday: LUNDI,
  deload: false,
  sl: 0,
  efKm: 7,
  sessions: [],
}

const activite = (day: string, sport: string, km = 10): ActivityRow => ({
  day,
  sport,
  name: null,
  distance_m: km * 1000,
  moving_s: 3000,
})

const ressenti = (dayIndex: number, slot = 0): FeedbackRow => ({
  week: 1,
  day_index: dayIndex,
  slot,
  day: '2026-08-10',
  session_type: 'ef',
  pain: 1,
  rpe: 5,
})

/**
 * Emballe des séances brutes comme le fait `weekSessions` : jour d'origine et
 * slot du jour, date effective. Les tests décrivent une semaine, pas la
 * plomberie d'identité.
 */
const planifiees = (sessions: Session[]): SeancePlanifiee[] => {
  const slots = slotsParJour(sessions)
  return sessions.map((s, i) => ({
    s,
    jourOrigine: s.day,
    slot: slots[i],
    day: addDays(LUNDI, s.day),
    ecart: null,
  }))
}

const base = { semaine, now: '2026-08-13', feedback: [], activities: [], byDate: {} }

describe('familleDe', () => {
  it('range toutes les courses dans la même famille', () => {
    for (const t of ['long', 'ef', 'inter', 'tempo', 'test', 'course', 'race'] as const) {
      expect(familleDe(t)).toBe('course')
    }
  })

  it('range les deux muscu dans le renfo', () => {
    expect(familleDe('muscu-haut')).toBe('renfo')
    expect(familleDe('muscu-bas')).toBe('renfo')
  })

  it('ne compte ni l’escalade ni le repos', () => {
    expect(familleDe('escalade')).toBeNull()
    expect(familleDe('repos')).toBeNull()
  })
})

describe('compteur de séances', () => {
  it('compte le prévu par famille', () => {
    const r = construireInsights({
      ...base,
      seances: planifiees([
        seance({ day: 0, type: 'long' }),
        seance({ day: 1, type: 'ef' }),
        seance({ day: 1, type: 'muscu-haut' }),
        seance({ day: 3, type: 'velo' }),
        seance({ day: 2, type: 'escalade' }),
      ]),
    })
    expect(r.seances.course.prevu).toBe(2)
    expect(r.seances.renfo.prevu).toBe(1)
    expect(r.seances.velo.prevu).toBe(1)
    expect(r.seancesTotal.prevu).toBe(4)
  })

  it('compte réalisée une séance qui porte un ressenti', () => {
    const r = construireInsights({
      ...base,
      seances: planifiees([seance({ day: 0, type: 'long' })]),
      feedback: [ressenti(0)],
    })
    expect(r.seances.course.realise).toBe(1)
  })

  it('compte réalisée une séance couverte par une activité importée', () => {
    const r = construireInsights({
      ...base,
      seances: planifiees([seance({ day: 0, type: 'long' })]),
      activities: [activite(LUNDI, 'Run')],
    })
    expect(r.seances.course.realise).toBe(1)
  })

  it('ne compte pas une activité d’une autre famille', () => {
    const r = construireInsights({
      ...base,
      seances: planifiees([seance({ day: 0, type: 'long' })]),
      activities: [activite(LUNDI, 'Ride')],
    })
    expect(r.seances.course.realise).toBe(0)
    expect(r.seances.velo.realise).toBe(0)
  })

  it('ne compte jamais une séance à venir', () => {
    const r = construireInsights({
      ...base,
      // dimanche 16, alors qu'on est le jeudi 13
      seances: planifiees([seance({ day: 6, type: 'long' })]),
      feedback: [ressenti(6)],
    })
    expect(r.seances.course.prevu).toBe(1)
    expect(r.seances.course.realise).toBe(0)
  })

  it('distingue deux séances du même jour par leur position', () => {
    const seances = planifiees([seance({ day: 1, type: 'ef' }), seance({ day: 1, type: 'muscu-haut' })])
    const r = construireInsights({ ...base, seances, feedback: [ressenti(1, 1)] })
    expect(r.seances.course.realise).toBe(0)
    expect(r.seances.renfo.realise).toBe(1)
  })
})

describe('volume de course', () => {
  it('additionne les sept derniers jours, course uniquement', () => {
    const r = construireInsights({
      ...base,
      seances: [] as SeancePlanifiee[],
      activities: [
        activite('2026-08-13', 'Run', 10),
        activite('2026-08-11', 'Run', 7),
        activite('2026-08-11', 'Ride', 30),
        // hors fenêtre : huit jours avant
        activite('2026-08-05', 'Run', 20),
      ],
    })
    expect(r.km7).toBe(17)
    expect(r.km7Jours).toHaveLength(7)
    expect(r.km7Jours[6]).toBe(10)
  })

  it('compte la distance du ressenti quand aucune activité Strava n’a été importée', () => {
    // Une course notée à la main — sans Strava — ne doit pas compter pour zéro.
    const r = construireInsights({
      ...base,
      seances: [] as SeancePlanifiee[],
      activities: [],
      feedback: [
        { week: 1, day_index: 2, slot: 0, day: '2026-08-12', session_type: 'ef', pain: 1, rpe: 5, distance_km: 8 },
      ],
    })
    expect(r.km7).toBe(8)
  })

  it('donne la priorité à Strava sur le ressenti le même jour, sans additionner les deux', () => {
    const r = construireInsights({
      ...base,
      seances: [] as SeancePlanifiee[],
      activities: [activite('2026-08-12', 'Run', 8)],
      feedback: [
        // La distance réellement parcourue, saisie après un écart : Strava
        // reste la source de vérité quand les deux coexistent.
        { week: 1, day_index: 2, slot: 0, day: '2026-08-12', session_type: 'ef', pain: 1, rpe: 5, distance_km: 6 },
      ],
    })
    expect(r.km7).toBe(8)
  })

  it('ignore le ressenti d’une séance qui n’est pas de la course', () => {
    const r = construireInsights({
      ...base,
      seances: [] as SeancePlanifiee[],
      activities: [],
      feedback: [
        { week: 1, day_index: 2, slot: 0, day: '2026-08-12', session_type: 'muscu-bas', pain: 1, rpe: 5, distance_km: 8 },
      ],
    })
    expect(r.km7).toBe(0)
  })
})

describe('charge de la veille', () => {
  it('lit l’indice de la veille et l’écart avec l’avant-veille', () => {
    const r = construireInsights({
      ...base,
      seances: [] as SeancePlanifiee[],
      byDate: { '2026-08-12': { idx: 51 }, '2026-08-11': { idx: 44 } },
    })
    expect(r.chargeVeille).toBe(51)
    expect(r.chargeEcart).toBe(7)
  })

  it('reste nul quand l’historique manque', () => {
    const r = construireInsights({ ...base, seances: [] as SeancePlanifiee[] })
    expect(r.chargeVeille).toBeNull()
    expect(r.chargeEcart).toBeNull()
  })
})
