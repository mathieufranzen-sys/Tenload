import { describe, expect, it } from 'vitest'
import planJson from '../data/plan.json'
import type { Plan } from '../data/types'
import { buildLoad, sessionLoad } from './load'
import { cleEcart, indexerEcarts, slotsParJour, type EcartRow } from './overrides'

const plan = planJson as unknown as Plan

/** Semaine 11 : lundi sortie longue, jeudi renfo bas + vélo, samedi intervalles. */
const semaine = plan.weeks[10]
const lundi = semaine.monday
const jour = (n: number): string => {
  const d = new Date(`${lundi}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

describe('buildLoad — clé de séance', () => {
  it('compte une séance passée notée sous son slot du JOUR, pas son index de semaine', () => {
    // Le renfo bas du jeudi est en 5e position dans la semaine mais son slot
    // vaut 0 : c'est le premier de sa journée. Une clé bâtie sur l'index de
    // semaine ne le trouverait jamais, et la séance vaudrait zéro en silence.
    const i = semaine.sessions.findIndex((s) => s.day === 3 && s.type === 'muscu-bas')
    expect(i).toBeGreaterThan(0)
    const slot = slotsParJour(semaine.sessions)[i]
    expect(slot).toBe(0)

    const load = buildLoad({
      weeks: [semaine],
      activities: [],
      completed: new Set([`${semaine.n}-3-${slot}`]),
      today: jour(6),
    })
    expect(load[jour(3)]).toBeCloseTo(sessionLoad(semaine.sessions[i]), 6)
  })

  it('ignore une séance passée sans ressenti ni activité', () => {
    const load = buildLoad({
      weeks: [semaine],
      activities: [],
      completed: new Set<string>(),
      today: jour(6),
    })
    expect(load[jour(3)] ?? 0).toBe(0)
  })
})

describe('buildLoad — écarts volontaires', () => {
  const ecart = (day_index: number, slot: number, patch: EcartRow['patch']): Map<string, EcartRow> =>
    indexerEcarts([{ week: semaine.n, day_index, slot, patch, reason: null }])

  it('une séance sautée ne charge rien', () => {
    const base = buildLoad({ weeks: [semaine], activities: [], completed: new Set(), today: jour(-1) })
    const avec = buildLoad({
      weeks: [semaine],
      activities: [],
      completed: new Set(),
      today: jour(-1),
      ecarts: ecart(0, 0, { skipped: true }),
    })
    expect(base[lundi]).toBeGreaterThan(0)
    expect(avec[lundi] ?? 0).toBe(0)
  })

  it('une séance déplacée porte sa charge sur le nouveau jour', () => {
    const avec = buildLoad({
      weeks: [semaine],
      activities: [],
      completed: new Set(),
      today: jour(-1),
      ecarts: ecart(5, 0, { day: 4 }),
    })
    const inter = semaine.sessions.find((s) => s.day === 5)!
    expect(avec[jour(5)] ?? 0).toBe(0)
    expect(avec[jour(4)]).toBeCloseTo(
      sessionLoad(semaine.sessions.find((s) => s.day === 4)!) + sessionLoad(inter),
      6,
    )
  })

  it('une distance réduite réduit la charge', () => {
    const base = buildLoad({ weeks: [semaine], activities: [], completed: new Set(), today: jour(-1) })
    const avec = buildLoad({
      weeks: [semaine],
      activities: [],
      completed: new Set(),
      today: jour(-1),
      ecarts: ecart(0, 0, { dist: 14 }),
    })
    expect(avec[lundi]).toBeLessThan(base[lundi])
  })

  it('un écart sur une autre semaine ne touche pas celle-ci', () => {
    const base = buildLoad({ weeks: [semaine], activities: [], completed: new Set(), today: jour(-1) })
    const avec = buildLoad({
      weeks: [semaine],
      activities: [],
      completed: new Set(),
      today: jour(-1),
      ecarts: indexerEcarts([
        { week: semaine.n + 1, day_index: 0, slot: 0, patch: { skipped: true }, reason: null },
      ]),
    })
    expect(avec[lundi]).toBeCloseTo(base[lundi], 6)
  })

  it('la clé d’un écart reste celle du jour d’origine après déplacement', () => {
    expect(cleEcart(semaine.n, 5, 0)).toBe(`${semaine.n}-5-0`)
  })
})
