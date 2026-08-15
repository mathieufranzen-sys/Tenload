import { describe, expect, it } from 'vitest'
import { motDuCoach } from './coach'
import { addDays } from './dates'
import type { PainMap } from './tendonIndex'

const NOW = '2026-10-01'
const TOTAL = { prevu: 0, realise: 0 }

/** Construit un carnet : `wake[k]` est la raideur du jour NOW − k. */
function carnet(wake: Array<number | null>, options: { excentrique?: number } = {}): PainMap {
  const p: PainMap = {}
  wake.forEach((v, k) => {
    if (v == null) return
    p[addDays(NOW, -k)] = { wake: v }
  })
  for (let k = 0; k < (options.excentrique ?? 0); k++) {
    const d = addDays(NOW, -k)
    p[d] = { ...(p[d] ?? {}), eccentric: true }
  }
  return p
}

const serie = (n: number, v: number) => Array.from({ length: n }, () => v)

describe('motDuCoach — raideur au réveil', () => {
  it('félicite quand la raideur baisse nettement', () => {
    // 14 jours à 0,8 après 14 jours à 2,0.
    const pain = carnet([...serie(14, 0.8), ...serie(14, 2)])
    const m = motDuCoach({ pain, byDate: {}, now: NOW, seancesTotal: TOTAL })
    expect(m.ton).toBe('bravo')
    expect(m.texte).toContain('2')
    expect(m.texte).toContain('0,8')
  })

  it('cite l’excentrique quand il est tenu', () => {
    const pain = carnet([...serie(14, 0.8), ...serie(14, 2)], { excentrique: 10 })
    const m = motDuCoach({ pain, byDate: {}, now: NOW, seancesTotal: TOTAL })
    expect(m.texte).toContain('10 jours')
  })

  it('alerte quand la raideur remonte', () => {
    const pain = carnet([...serie(14, 2.2), ...serie(14, 1)])
    const m = motDuCoach({ pain, byDate: {}, now: NOW, seancesTotal: TOTAL })
    expect(m.ton).toBe('vigilance')
  })

  it('reste neutre sur une raideur stable', () => {
    const pain = carnet([...serie(14, 1.2), ...serie(14, 1.2)])
    const m = motDuCoach({ pain, byDate: {}, now: NOW, seancesTotal: TOTAL })
    expect(m.ton).toBe('neutre')
    expect(m.texte).toContain('stable')
  })

  it('salue une stabilité tenue avec une forte observance', () => {
    const pain = carnet([...serie(14, 1.2), ...serie(14, 1.2)], { excentrique: 14 })
    const m = motDuCoach({ pain, byDate: {}, now: NOW, seancesTotal: TOTAL })
    expect(m.ton).toBe('bravo')
  })

  it('ne conclut pas sur trois saisies récentes', () => {
    // Trois valeurs très basses face à quatorze hautes : la tentation de crier
    // victoire est maximale, et c'est précisément ce qu'il ne faut pas faire.
    const pain = carnet([0.2, 0.2, 0.2, ...serie(11, null as unknown as number), ...serie(14, 2.5)])
    const m = motDuCoach({ pain, byDate: {}, now: NOW, seancesTotal: TOTAL })
    expect(m.texte).not.toContain('0,2')
  })
})

describe('motDuCoach — replis', () => {
  it('parle de l’excentrique quand le carnet est trop court', () => {
    const pain = carnet([], { excentrique: 9 })
    const m = motDuCoach({ pain, byDate: {}, now: NOW, seancesTotal: TOTAL })
    expect(m.ton).toBe('bravo')
    expect(m.texte).toContain('9 jours')
  })

  it('salue une semaine complète', () => {
    const m = motDuCoach({
      pain: {},
      byDate: {},
      now: NOW,
      seancesTotal: { prevu: 6, realise: 6 },
    })
    expect(m.ton).toBe('bravo')
    expect(m.texte).toContain('6 séances sur 6')
  })

  it('signale une baisse de l’indice en dernier recours', () => {
    const byDate: Record<string, { idx: number }> = {}
    for (let k = 0; k < 7; k++) byDate[addDays(NOW, -k)] = { idx: 20 }
    for (let k = 7; k < 14; k++) byDate[addDays(NOW, -k)] = { idx: 34 }
    const m = motDuCoach({ pain: {}, byDate, now: NOW, seancesTotal: TOTAL })
    expect(m.ton).toBe('bravo')
    expect(m.texte).toContain('34')
    expect(m.texte).toContain('20')
  })

  it('demande des saisies quand il n’y a rien à dire', () => {
    const m = motDuCoach({ pain: {}, byDate: {}, now: NOW, seancesTotal: TOTAL })
    expect(m.ton).toBe('neutre')
    expect(m.texte).toContain('douleur au réveil')
  })

  it('n’invente jamais de chiffre sans donnée', () => {
    const m = motDuCoach({ pain: {}, byDate: {}, now: NOW, seancesTotal: TOTAL })
    expect(m.texte).not.toMatch(/\d+,\d/)
  })
})
