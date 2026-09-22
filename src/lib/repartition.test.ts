import { describe, expect, it } from 'vitest'
import planJson from '../data/plan.json'
import type { Plan, Session } from '../data/types'
import { repartitionSemaine } from './repartition'

const plan = planJson as unknown as Plan
const AM = 277

describe('repartitionSemaine', () => {
  it('ne compte ni le repos ni une séance sautée', () => {
    const w = plan.weeks.find((x) => x.n === 7)!
    const toutes = repartitionSemaine(w.sessions, AM)
    const sansLongue = repartitionSemaine(
      w.sessions.map((s) => (s.type === 'long' ? { ...s, saute: true } : s)) as Session[],
      AM,
    )
    expect(sansLongue.endurance).toBeLessThan(toutes.endurance)
  })

  it('range le vélo et le renfo à part, en minutes', () => {
    const w = plan.weeks.find((x) => x.n === 7)!
    const r = repartitionSemaine(w.sessions, AM)
    expect(r.velo).toBeGreaterThan(0)
    expect(r.renfo).toBeGreaterThan(0)
  })

  it('une semaine de charge reste majoritairement en endurance', () => {
    const w = plan.weeks.find((x) => x.n === 18)!
    const r = repartitionSemaine(w.sessions, AM)
    const course = r.endurance + r.marathon + r.seuil + r.vitesse
    expect(r.endurance / course).toBeGreaterThan(0.6)
    expect(r.seuil + r.vitesse).toBeGreaterThan(0)
  })

  it('un 10 km de dossard sans déroulé compte en vitesse', () => {
    const dix: Session = { day: 6, type: 'race', title: '10 km', cat: 'Course', dist: 10, note: '' } as Session
    expect(repartitionSemaine([dix], AM).vitesse).toBeGreaterThan(30)
  })
})
