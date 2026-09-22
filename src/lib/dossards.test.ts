import { describe, expect, it } from 'vitest'
import planJson from '../data/plan.json'
import type { Plan } from '../data/types'
import { indexerEcarts } from './overrides'
import { projeterMarathon } from './paces'
import {
  chronoEquivalent,
  formatChrono,
  idDossardPlan,
  listerDossards,
  motDuDossard,
  type Dossard,
  type DossardRow,
} from './dossards'

const plan = planJson as unknown as Plan

const perso = (x: Partial<DossardRow> = {}): DossardRow => ({
  id: 'd-1',
  nom: 'Corrida',
  day: '2026-12-31',
  distance_km: 10,
  objectif_s: null,
  chrono_s: null,
  supprime: false,
  ...x,
})

describe('listerDossards', () => {
  it('liste les quatre dossards du plan sans aucune ligne en base', () => {
    const l = listerDossards(plan, [], undefined, '2026-09-21')
    expect(l.map((d) => d.nom)).toEqual([
      '20 km de Paris',
      '10 km Hoka de Paris',
      'Semi-marathon test',
      'Marathon de Paris',
    ])
    expect(l.every((d) => d.duPlan)).toBe(true)
  })

  it("rattache l'objectif d'un dossard du plan à sa ligne, et son chrono à l'écart", () => {
    const id = idDossardPlan(14, 6, 0)
    const ecarts = indexerEcarts([{ week: 14, day_index: 6, slot: 0, patch: { durMin: 40.5 }, reason: null }])
    const l = listerDossards(plan, [perso({ id, objectif_s: 2430, chrono_s: 9999 })], ecarts, '2026-11-20')
    const dix = l.find((d) => d.id === id)!
    expect(dix.objectifS).toBe(2430)
    // Le chrono d'un dossard du plan ne vient que de l'écart : une seule source.
    expect(dix.chronoS).toBe(2430)
  })

  it('range les dossards à venir du plus proche au plus lointain, puis les passés', () => {
    const l = listerDossards(plan, [perso({ day: '2026-10-01' })], undefined, '2026-10-05')
    expect(l[0].nom).toBe('20 km de Paris')
    expect(l[l.length - 1].nom).toBe('Corrida')
  })

  it("n'affiche ni un dossard supprimé ni un dossard du plan sauté", () => {
    const ecarts = indexerEcarts([{ week: 9, day_index: 6, slot: 0, patch: { skipped: true }, reason: null }])
    const l = listerDossards(plan, [perso({ supprime: true })], ecarts, '2026-09-21')
    expect(l.map((d) => d.nom)).not.toContain('Corrida')
    expect(l.map((d) => d.nom)).not.toContain('20 km de Paris')
  })
})

describe('chronoEquivalent', () => {
  it('retombe sur le chrono dont il est la projection', () => {
    for (const [km, t] of [[10, 2430], [21.0975, 5400], [20, 5100]] as const) {
      const allure = projeterMarathon(km, t)
      expect(Math.abs(chronoEquivalent(km, allure) - t)).toBeLessThan(25)
    }
  })

  it('donne le marathon à la multiplication près', () => {
    expect(chronoEquivalent(42.195, 277)).toBe(Math.round(277 * 42.195))
  })
})

describe('motDuDossard', () => {
  const dix: Dossard = { id: 'x', nom: '10 km', day: '2026-11-15', km: 10, objectifS: null, chronoS: null, duPlan: true }

  it("sans objectif, donne ce que la forme projetée annonce et demande d'en fixer un", () => {
    const m = motDuDossard(dix, 289, '2026-09-21')
    expect(m.constat).toContain(formatChrono(chronoEquivalent(10, 289)))
    expect(m.constat).toContain('Fixe un objectif')
  })

  it("dit ce qu'il manque quand l'objectif est plus rapide que la forme", () => {
    const m = motDuDossard({ ...dix, objectifS: 2400 }, 289, '2026-09-21')
    expect(m.constat).toContain('il manque')
  })

  it('la dernière semaine, rappelle que rien ne se gagne', () => {
    expect(motDuDossard(dix, 289, '2026-11-10').conseil).toMatch(/^J-5\. La dernière semaine/)
  })

  it('après la course, réclame le chrono tant qu’il manque', () => {
    expect(motDuDossard(dix, 289, '2026-11-20').conseil).toMatch(/Saisis ton chrono/)
  })

  it("après la course, compare le chrono à l'objectif", () => {
    const m = motDuDossard({ ...dix, objectifS: 2440, chronoS: 2430 }, 289, '2026-11-20')
    expect(m.constat).toMatch(/^Objectif tenu, 10 s sous la barre/)
  })
})

describe('objectifs par défaut', () => {
  it('remplit le 10 km, le semi et le marathon, pas le 20 km', () => {
    const l = listerDossards(plan, [], undefined, '2026-09-22', 277)
    const par = Object.fromEntries(l.map((d) => [d.nom, d.objectifS]))
    expect(par['10 km Hoka de Paris']).toBe(2412)
    expect(par['Semi-marathon test']).toBe(5400)
    expect(par['Marathon de Paris']).toBe(Math.round(277 * 42.195))
    expect(par['20 km de Paris']).toBeNull()
  })

  it("s'efface devant un objectif saisi", () => {
    const id = idDossardPlan(14, 6, 0)
    const l = listerDossards(plan, [perso({ id, objectif_s: 2400 })], undefined, '2026-09-22', 277)
    expect(l.find((d) => d.id === id)!.objectifS).toBe(2400)
  })
})
