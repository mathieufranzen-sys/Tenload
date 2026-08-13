/**
 * Garantie de non-régression du branchement Supabase : les lignes de
 * `daily_logs` doivent produire exactement le même indice que les instantanés
 * embarqués. Un écart ici signale une erreur de traduction, pas un changement
 * de modèle.
 */
import { describe, expect, it } from 'vitest'
import notionSeed from '../data/notion-seed.json'
import { buildPain, type DailyLogRow, type FeedbackRow } from './buildPain'
import { indexSeries, type LoadMap, type PainMap } from './tendonIndex'

interface LigneCarnet {
  date: string
  painWake: number | null
  painEffort: number | null
  painEvening: number | null
  icing: boolean
  jumps: boolean
  activities: string[]
}

const carnet = notionSeed as LigneCarnet[]

/** Le PainMap tel que l'app le construit aujourd'hui, avant Supabase. */
function painEmbarque(): PainMap {
  const pain: PainMap = {}
  for (const r of carnet) {
    pain[r.date] = {
      wake: r.painWake,
      effort: r.painEffort,
      evening: r.painEvening,
      icing: r.icing,
      jumps: r.jumps,
      eccentric: (r.activities ?? []).some((a) => /renfo bas/i.test(a)),
    }
  }
  return pain
}

/** Les mêmes journées, telles que supabase/seed.sql les a écrites en base. */
function lignesBase(): DailyLogRow[] {
  return carnet.map((r) => ({
    day: r.date,
    pain_wake: r.painWake,
    pain_effort: r.painEffort,
    pain_evening: r.painEvening,
    eccentric: (r.activities ?? []).some((a) => /renfo bas/i.test(a)),
    icing: r.icing,
    jumps: r.jumps,
  }))
}

/** Une charge plausible et constante : on compare deux PainMap, pas la charge. */
const charge: LoadMap = Object.fromEntries(carnet.map((r) => [r.date, 12]))

const jours = carnet.map((r) => r.date).sort()
const premier = jours[0]
const dernier = jours[jours.length - 1]

describe('buildPain', () => {
  it('reproduit à l’identique le PainMap des instantanés embarqués', () => {
    expect(buildPain({ logs: lignesBase() })).toEqual(painEmbarque())
  })

  it('donne exactement le même indice, jour par jour', () => {
    const avant = indexSeries(premier, dernier, charge, painEmbarque())
    const apres = indexSeries(premier, dernier, charge, buildPain({ logs: lignesBase() }))
    expect(apres.map((r) => r.idx)).toEqual(avant.map((r) => r.idx))
  })

  it('accepte les numériques renvoyés en chaîne par PostgREST', () => {
    const brut = [
      { day: '2026-08-11', pain_wake: '1.5', pain_effort: null, pain_evening: '2',
        eccentric: false, icing: false, jumps: false },
    ] as unknown as DailyLogRow[]
    expect(buildPain({ logs: brut })['2026-08-11']).toMatchObject({ wake: 1.5, evening: 2 })
  })
})

describe('bascule vers les saisies de l’app', () => {
  const log = (day: string, extra: Partial<DailyLogRow> = {}): DailyLogRow => ({
    day,
    pain_wake: 1,
    pain_effort: 2,
    pain_evening: 3,
    eccentric: false,
    icing: false,
    jumps: false,
    ...extra,
  })
  const fb = (day: string, pain: number, extra: Partial<FeedbackRow> = {}): FeedbackRow => ({
    week: 1,
    day_index: 0,
    slot: 0,
    day,
    session_type: 'ef',
    pain,
    rpe: 5,
    ...extra,
  })

  it('après la bascule, le ressenti de séance l’emporte sur la colonne', () => {
    const pain = buildPain({
      logs: [log('2026-09-01')],
      feedback: [fb('2026-09-01', 6)],
      bascule: '2026-08-11',
    })
    expect(pain['2026-09-01'].effort).toBe(6)
  })

  it('retient la séance la plus douloureuse de la journée', () => {
    const pain = buildPain({
      logs: [log('2026-09-01')],
      feedback: [fb('2026-09-01', 2, { slot: 0 }), fb('2026-09-01', 5, { slot: 1 })],
      bascule: '2026-08-11',
    })
    expect(pain['2026-09-01'].effort).toBe(5)
  })

  it('retombe sur la saisie directe quand aucune séance n’est notée', () => {
    const pain = buildPain({ logs: [log('2026-09-01')], bascule: '2026-08-11' })
    expect(pain['2026-09-01'].effort).toBe(2)
  })

  it('avant la bascule, la colonne du carnet reste maîtresse', () => {
    const pain = buildPain({
      logs: [log('2026-08-01')],
      feedback: [fb('2026-08-01', 9)],
      bascule: '2026-08-11',
    })
    expect(pain['2026-08-01'].effort).toBe(2)
  })

  it('après la bascule, une case décochée reste décochée malgré une activité', () => {
    const pain = buildPain({
      logs: [log('2026-09-01', { eccentric: false })],
      bascule: '2026-08-11',
      eccentriqueDevine: new Set(['2026-09-01']),
    })
    expect(pain['2026-09-01'].eccentric).toBe(false)
  })

  it('avant la bascule, l’activité peut encore trahir l’excentrique', () => {
    const pain = buildPain({
      logs: [log('2026-08-01', { eccentric: false })],
      bascule: '2026-08-11',
      eccentriqueDevine: new Set(['2026-08-01']),
    })
    expect(pain['2026-08-01'].eccentric).toBe(true)
  })

  it('crée la journée quand seule une séance a été notée', () => {
    const pain = buildPain({
      logs: [],
      feedback: [fb('2026-09-01', 4)],
      bascule: '2026-08-11',
    })
    expect(pain['2026-09-01'].effort).toBe(4)
  })
})
