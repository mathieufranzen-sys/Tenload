import { describe, expect, it } from 'vitest'
import type { FeedbackRow } from './buildPain'
import { DOULEUR_MAX, ECART_MAX, MIN_SEANCES, ajusterForme, ecartEffortSemaine, serieForme } from './forme'

const NOW = '2026-09-15'
const BASE = 289 // 4:49/km, la forme projetée par le test du 8 août

const seance = (extra: Partial<FeedbackRow>): FeedbackRow => ({
  week: 1,
  day_index: 0,
  slot: 0,
  day: '2026-09-10',
  session_type: 'tempo',
  pain: 1,
  rpe: 8,
  ...extra,
})

/** n séances identiques, réparties sur des jours distincts de la fenêtre. */
const lot = (n: number, extra: Partial<FeedbackRow>): FeedbackRow[] =>
  Array.from({ length: n }, (_, i) => seance({ day: `2026-09-${String(10 - i).padStart(2, '0')}`, ...extra }))

describe('ajusterForme', () => {
  it('ne bouge pas sans assez de séances', () => {
    const r = ajusterForme(BASE, lot(MIN_SEANCES - 1, { rpe: 10 }), NOW)
    expect(r.allure).toBe(BASE)
    expect(r.ecart).toBe(0)
  })

  it('ne bouge pas quand le ressenti colle à l’attendu', () => {
    // tempo attendu à 8, ressenti à 8.
    const r = ajusterForme(BASE, lot(4, { rpe: 8 }), NOW)
    expect(r.ecart).toBe(0)
    expect(r.allure).toBe(BASE)
  })

  it('ralentit la projection quand tout coûte plus cher que prévu', () => {
    const r = ajusterForme(BASE, lot(4, { rpe: 10 }), NOW)
    expect(r.ecart).toBeGreaterThan(0)
    expect(r.allure).toBeGreaterThan(BASE)
  })

  it('accélère la projection quand les séances passent facilement', () => {
    const r = ajusterForme(BASE, lot(4, { rpe: 6 }), NOW)
    expect(r.ecart).toBeLessThan(0)
    expect(r.allure).toBeLessThan(BASE)
  })

  it('borne l’écart des deux côtés', () => {
    const dur = ajusterForme(BASE, lot(5, { session_type: 'ef', rpe: 10 }), NOW)
    expect(dur.ecart).toBe(ECART_MAX)
    expect(dur.borne).toBe(true)

    const facile = ajusterForme(BASE, lot(5, { session_type: 'inter', rpe: 1 }), NOW)
    expect(facile.ecart).toBe(-ECART_MAX)
    expect(facile.borne).toBe(true)
  })

  it('écarte les séances douloureuses', () => {
    // Un RPE élevé sur une séance douloureuse mesure la douleur, pas la forme.
    const r = ajusterForme(BASE, lot(4, { rpe: 10, pain: DOULEUR_MAX }), NOW)
    expect(r.seances).toBe(0)
    expect(r.allure).toBe(BASE)
  })

  it('ignore ce qui n’a pas d’allure', () => {
    for (const type of ['muscu-bas', 'muscu-haut', 'escalade', 'repos', 'velo'] as const) {
      const r = ajusterForme(BASE, lot(4, { session_type: type, rpe: 10 }), NOW)
      expect(r.seances).toBe(0)
    }
  })

  it('ignore ce qui sort de la fenêtre de 28 jours', () => {
    const vieux = lot(4, { rpe: 10 }).map((f) => ({ ...f, day: '2026-07-01' }))
    expect(ajusterForme(BASE, vieux, NOW).seances).toBe(0)
  })

  it('ignore le futur', () => {
    const demain = lot(4, { rpe: 10 }).map((f) => ({ ...f, day: '2026-09-20' }))
    expect(ajusterForme(BASE, demain, NOW).seances).toBe(0)
  })

  it('pondère chaque type par son attendu propre', () => {
    // Un 9/10 sur des intervalles est normal, sur de l'endurance facile non.
    const inter = ajusterForme(BASE, lot(4, { session_type: 'inter', rpe: 9 }), NOW)
    const ef = ajusterForme(BASE, lot(4, { session_type: 'ef', rpe: 9 }), NOW)
    expect(inter.ecart).toBe(0)
    expect(ef.ecart).toBeGreaterThan(0)
  })
})

describe('serieForme et ecartEffortSemaine', () => {
  it('rejoue la forme à chaque date sur les seuls ressentis connus alors', () => {
    const fb = [
      { week: 1, day_index: 0, slot: 0, day: '2026-09-01', session_type: 'ef', pain: 0, rpe: 2 },
      { week: 1, day_index: 1, slot: 0, day: '2026-09-02', session_type: 'ef', pain: 0, rpe: 2 },
      { week: 1, day_index: 2, slot: 0, day: '2026-09-03', session_type: 'ef', pain: 0, rpe: 2 },
    ]
    const s = serieForme(289, fb, ['2026-08-31', '2026-09-04'])
    expect(s[0].allure).toBe(289)
    expect(s[1].allure).toBeLessThan(289)
  })

  it('moyenne l’écart d’effort de la semaine, séances douloureuses écartées', () => {
    const fb = [
      { week: 1, day_index: 0, slot: 0, day: '2026-09-07', session_type: 'ef', pain: 0, rpe: 6 },
      { week: 1, day_index: 1, slot: 0, day: '2026-09-08', session_type: 'ef', pain: 5, rpe: 9 },
    ]
    expect(ecartEffortSemaine(fb, '2026-09-07')).toEqual({ ecart: 2, seances: 1 })
    expect(ecartEffortSemaine(fb, '2026-09-14').ecart).toBeNull()
  })
})
