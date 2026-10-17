import { describe, expect, it } from 'vitest'
import { motMobilite, serieMobilite } from './mobilite'
import type { DailyLogRow } from './buildPain'

const log = (day: string, stretching = true): DailyLogRow => ({
  day,
  pain_wake: null,
  pain_effort: null,
  pain_evening: null,
  eccentric: false,
  icing: false,
  jumps: false,
  stretching,
})
const NOW = '2026-10-17'

describe('la série de mobilité', () => {
  it('aujourd’hui pas encore fait ne casse pas la série', () => {
    const s = serieMobilite([log('2026-10-15'), log('2026-10-16')], NOW)
    expect(s).toMatchObject({ enCours: 2, faitAujourdhui: false })
    expect(motMobilite(s, NOW)).toMatch(/Fais-la aujourd’hui/)
  })

  it('un jour manqué remet la série à zéro, le record reste', () => {
    const logs = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-15'].map((d) => log(d))
    expect(serieMobilite(logs, NOW)).toMatchObject({ enCours: 0, record: 4 })
    expect(motMobilite(serieMobilite(logs, NOW), NOW)).toMatch(/record est de 4 jours/)
  })

  it('une case décochée ne compte pas, l’avenir non plus', () => {
    const s = serieMobilite([log('2026-10-16', false), log('2026-10-17'), log('2026-10-18')], NOW)
    expect(s).toMatchObject({ enCours: 1, record: 1, faitAujourdhui: true, sur28: 1 })
    expect(motMobilite(s, NOW)).toMatch(/^Premier jour/)
  })

  it('le record se dit quand la série l’atteint', () => {
    const s = serieMobilite(['2026-10-15', '2026-10-16', '2026-10-17'].map((d) => log(d)), NOW)
    expect(motMobilite(s, NOW)).toMatch(/^3 jours d’affilée, c’est ton record/)
  })
})
