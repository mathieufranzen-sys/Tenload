import { describe, expect, it } from 'vitest'
import { construireInsights, familleDe } from './insights'
import type { Session, Week } from '../data/types'
import type { ActivityRow } from './load'
import type { FeedbackRow } from './buildPain'
import type { SeancePlanifiee } from './adapt'
import { slotsParJour, indexerEcarts } from './overrides'
import { addDays } from './dates'

const LUNDI = '2026-08-10'
const LUNDI_SUIVANT = '2026-08-17'

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

/** Semaine dont les sessions sont fournies : sert les tests de kilométrage. */
const semaineAvec = (n: number, monday: string, sessions: Session[]): Week => ({
  ...semaine,
  n,
  monday,
  sessions,
})

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

const base = {
  semaine,
  now: '2026-08-13',
  feedback: [],
  activities: [],
  byDate: {},
  weeks: [semaine],
}

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
  // Aucune de ces séances n'est « prévue aujourd'hui » dans `base.semaine` :
  // le kilométrage se lit sur `weeks`, indépendamment de la semaine affichée.
  it('additionne les distances du plan sur les sept derniers jours', () => {
    const w = semaineAvec(1, LUNDI, [
      seance({ day: 0, type: 'long', dist: 20 }), // lundi 10 août
      seance({ day: 3, type: 'ef', dist: 7 }), // jeudi 13 août — c'est `now`
    ])
    const r = construireInsights({ ...base, seances: [] as SeancePlanifiee[], weeks: [w] })
    expect(r.km7).toBe(27)
    expect(r.km7Jours).toHaveLength(7)
    expect(r.km7Jours[6]).toBe(7) // aujourd'hui, en dernière position
    expect(r.km7Jours[3]).toBe(20) // lundi, trois jours avant
  })

  it('ignore ce qui n’est pas de la course, même avec une distance', () => {
    // Le vélo ne porte jamais de distance dans le plan, mais si un jour il en
    // portait une, elle ne devrait toujours pas compter ici : c'est l'impact
    // au sol qui définit ce kilométrage, pas le volume aérobie.
    const w = semaineAvec(1, LUNDI, [seance({ day: 3, type: 'velo', dist: 30 })])
    const r = construireInsights({ ...base, seances: [] as SeancePlanifiee[], weeks: [w] })
    expect(r.km7).toBe(0)
  })

  it('ne remonte rien au-delà de sept jours', () => {
    const w = semaineAvec(1, LUNDI, [seance({ day: 0, type: 'long', dist: 20 })]) // lundi, 3 jours avant `now`
    const r = construireInsights({ ...base, seances: [] as SeancePlanifiee[], weeks: [w], now: '2026-08-20' })
    expect(r.km7).toBe(0)
  })

  it('applique l’écart avant de sommer, pas la distance d’origine', () => {
    const w = semaineAvec(1, LUNDI, [seance({ day: 3, type: 'ef', dist: 7 })]) // jeudi, `now`
    const ecarts = indexerEcarts([{ week: 1, day_index: 3, slot: 0, patch: { dist: 4 }, reason: null }])
    const r = construireInsights({ ...base, seances: [] as SeancePlanifiee[], weeks: [w], ecarts })
    expect(r.km7).toBe(4)
  })

  it('ne compte pas une séance déclarée non faite', () => {
    const w = semaineAvec(1, LUNDI, [seance({ day: 3, type: 'ef', dist: 7 })])
    const ecarts = indexerEcarts([
      { week: 1, day_index: 3, slot: 0, patch: { skipped: true }, reason: null },
    ])
    const r = construireInsights({ ...base, seances: [] as SeancePlanifiee[], weeks: [w], ecarts })
    expect(r.km7).toBe(0)
  })

  it('compte la distance sur le jour d’arrivée quand l’écart déplace la séance', () => {
    // now = jeudi 20 août, fenêtre du 14 au 20. Le lundi 10 (jour 0) en est
    // hors ; déplacée au dimanche 16 (jour 6), elle doit entrer dans le total.
    const w = semaineAvec(1, LUNDI, [seance({ day: 0, type: 'ef', dist: 9 })])
    const ecarts = indexerEcarts([{ week: 1, day_index: 0, slot: 0, patch: { day: 6 }, reason: null }])
    const r = construireInsights({ ...base, seances: [] as SeancePlanifiee[], weeks: [w], ecarts, now: '2026-08-20' })
    expect(r.km7).toBe(9)
  })

  it('additionne à travers deux semaines quand la fenêtre chevauche', () => {
    // now = mardi 18 août (semaine 2) : la fenêtre de sept jours remonte au
    // mercredi 12 août, dans la semaine 1.
    const w1 = semaineAvec(1, LUNDI, [seance({ day: 2, type: 'ef', dist: 6 })]) // mercredi 12 août
    const w2 = semaineAvec(2, LUNDI_SUIVANT, [seance({ day: 1, type: 'long', dist: 15 })]) // mardi 18 août
    const r = construireInsights({
      ...base,
      seances: [] as SeancePlanifiee[],
      weeks: [w1, w2],
      now: '2026-08-18',
    })
    expect(r.km7).toBe(21)
  })

  it('ignore les activités Strava : seul le plan compte désormais', () => {
    const w = semaineAvec(1, LUNDI, [seance({ day: 3, type: 'ef', dist: 7 })])
    const r = construireInsights({
      ...base,
      seances: [] as SeancePlanifiee[],
      weeks: [w],
      activities: [activite('2026-08-13', 'Run', 40)],
    })
    expect(r.km7).toBe(7)
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
