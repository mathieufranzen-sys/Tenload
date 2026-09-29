import { describe, expect, it } from 'vitest'
import type { FeedbackRow } from './buildPain'
import { DOULEUR_MAX, ECART_MAX, MIN_SEANCES, ajusterForme, coursesChronometrees, ecartChronometre, ecartEffortSemaine, serieForme } from './forme'
import { indexerEcarts } from './overrides'

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

describe('les courses chronométrées', () => {
  // À la forme de 289 s/km, l'endurance va de 5:39 (339) à 6:04 (364).
  const chrono = (allure: number, rpe = 4, zone: 'ef' | 'recup' = 'ef') =>
    ({ day: '', allure, zone, rpe, type: 'ef' as const })

  it('une allure dans la plage prescrite ne dit rien de plus que l’effort', () => {
    expect(ecartChronometre(chrono(350), BASE)).toBe(0)
  })

  it('plus vite que la plage, à l’effort attendu : la forme progresse', () => {
    expect(ecartChronometre(chrono(327), BASE)).toBe(-12)
  })

  it('une récupération courue lentement, comme demandé, ne coûte rien', () => {
    expect(ecartChronometre(chrono(385, 3, 'recup'), BASE)).toBe(-4)
  })

  it('la forme bouge avec des efforts notés à l’attendu, si l’allure parle', () => {
    const fb = lot(3, { session_type: 'ef', rpe: 4 })
    const chronos = fb.map((f) => ({ ...chrono(327), day: f.day }))
    expect(ajusterForme(BASE, fb, NOW).ecart).toBe(0)
    const r = ajusterForme(BASE, fb, NOW, chronos)
    expect(r.ecart).toBe(-12)
    expect(r.chronometrees).toBe(3)
  })

  it('se lit dans la donnée réelle, pour les courses faciles seulement', () => {
    const weeks = [{
      n: 1, bloc: 'A', blocName: '', monday: '2026-09-07', deload: false, sl: 20, efKm: 8,
      sessions: [
        { day: 1, type: 'ef', title: 'Course facile de 8 km', cat: '', note: '', dist: 8, struct: [{ km: 8, zone: 'recup' }] },
        { day: 3, type: 'tempo', title: 'Seuil', cat: '', note: '', dist: 10 },
      ],
    }] as never
    const fb = [
      seance({ day_index: 1, day: '2026-09-08', session_type: 'ef', rpe: 4, distance_km: 8 }),
      seance({ day_index: 3, day: '2026-09-10', session_type: 'tempo', rpe: 8, distance_km: 10 }),
    ]
    const ecarts = indexerEcarts([
      { week: 1, day_index: 1, slot: 0, patch: { durMin: 48 }, reason: null },
      { week: 1, day_index: 3, slot: 0, patch: { durMin: 50 }, reason: null },
    ])
    const c = coursesChronometrees(fb, ecarts, weeks)
    expect(c).toHaveLength(1)
    expect(c[0]).toMatchObject({ zone: 'recup', allure: 360 })
  })
})
