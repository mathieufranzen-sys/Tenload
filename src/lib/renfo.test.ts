import { describe, expect, it } from 'vitest'
import {
  evolution,
  exercicesDeLaSeance,
  formatCharge,
  identifier,
  lirePrescription,
  progresser,
  proposer,
  suggestionsAAjouter,
  tonnage,
  type RenfoRow,
} from './renfo'
import type { PainMap } from './tendonIndex'

const mollet = identifier('Stanish (excentrique mollet, 2 jambes)')
const ligne = (day: string, marge: RenfoRow['marge'], kg = 14, valeur = 20): RenfoRow => ({
  day,
  exercice: 'mollet-tendu',
  series: 3,
  valeur,
  kg,
  marge,
})
const calme: PainMap = { '2026-10-02': { wake: 1 }, '2026-10-05': { wake: 0.5 } }
const NOW = '2026-10-06'

describe('le catalogue suit un exercice sous ses différents noms', () => {
  it('les deux Stanish du plan sont le même exercice', () => {
    expect(identifier('Stanish (excentrique mollet)').id).toBe('mollet-tendu')
    expect(identifier('Stanish unilatéral').id).toBe('mollet-tendu')
    expect(identifier('Mollets genou fléchi (soléaire)').id).toBe('mollet-flechi')
    expect(identifier('Pointes de pied genou fléchi').id).toBe('mollet-flechi')
    expect(identifier('Pointes de pied statique jambe tendue').id).toBe('mollet-statique')
  })

  it('un nom inconnu devient un exercice libre, mesuré d’après sa prescription', () => {
    expect(identifier('Planche latérale', '3 x 30 s').mesure).toBe('duree')
    expect(identifier('Étirements', '8 min').mesure).toBe('libre')
  })

  it('lit la prescription et la charge du plan', () => {
    expect(lirePrescription('3 x 15', 'tempo 3 s descente, charge 12 kg')).toEqual({ series: 3, valeur: 15, kg: 12 })
    expect(lirePrescription('3 x 10', '2 x 6 kg')).toEqual({ series: 3, valeur: 10, kg: 12 })
    expect(lirePrescription('8 min')).toBeNull()
  })
})

describe('la charge ne monte que sur deux séances faciles et un réveil calme', () => {
  it('sans historique, le plan sert de départ', () => {
    const p = proposer(mollet, [], { series: 3, valeur: 15, kg: 0 }, '2026-10-07', calme, NOW)
    expect(p?.statut).toBe('plan')
  })

  it('une seule séance facile ne suffit pas', () => {
    const p = proposer(mollet, [ligne('2026-10-04', 'facile', 14, 10)], null, '2026-10-07', calme, NOW)
    expect(p?.statut).toBe('tient')
    expect(p?.kg).toBe(14)
  })

  it('au-delà de 10 répétitions, on rentre dans le cadre sans attendre : plus lourd, 10 répétitions', () => {
    const p = proposer(mollet, [ligne('2026-10-04', 'juste')], null, '2026-10-07', calme, NOW)
    expect(p).toMatchObject({ statut: 'monte', series: 3, valeur: 10, kg: 16, hausse: '+2 kg' })
  })

  it('deux faciles et un réveil calme : une répétition de plus tant qu’on est sous 10', () => {
    const h = [ligne('2026-10-01', 'facile', 14, 8), ligne('2026-10-04', 'facile', 14, 8)]
    const p = proposer(mollet, h, null, '2026-10-07', calme, NOW)
    expect(p).toMatchObject({ statut: 'monte', series: 3, valeur: 9, kg: 14, hausse: '+1 répétition' })
    expect(p?.raison).toMatch(/336 → 378 kg soulevés/)
  })

  it('un réveil agité ou non noté le lendemain tient la charge', () => {
    const h = [ligne('2026-10-01', 'facile', 14, 10), ligne('2026-10-04', 'facile', 14, 10)]
    expect(proposer(mollet, h, null, '2026-10-07', { '2026-10-05': { wake: 4 } }, NOW)?.statut).toBe('tient')
    expect(proposer(mollet, h, null, '2026-10-07', {}, NOW)?.raison).toMatch(/pas noté/)
  })

  it('une dernière série à la limite tient, elle ne baisse jamais', () => {
    const p = proposer(mollet, [ligne('2026-10-01', 'facile', 14, 10), ligne('2026-10-04', 'limite', 14, 10)], null, '2026-10-07', calme, NOW)
    expect(p).toMatchObject({ statut: 'tient', kg: 14, valeur: 10 })
  })

  it('un exercice au poids du corps gagne une répétition, pas des kilos', () => {
    const pompes = identifier('Pompes')
    const h: RenfoRow[] = [
      { day: '2026-10-01', exercice: 'pompes', series: 4, valeur: 12, kg: 0, marge: 'facile' },
      { day: '2026-10-04', exercice: 'pompes', series: 4, valeur: 12, kg: 0, marge: 'facile' },
    ]
    expect(proposer(pompes, h, null, '2026-10-07', {}, NOW)).toMatchObject({ statut: 'monte', valeur: 13, kg: 0 })
  })

  it('la séance du jour ne décide pas de sa propre charge', () => {
    const h = [ligne('2026-10-01', 'facile', 14, 10), ligne('2026-10-04', 'facile', 14, 10), ligne('2026-10-07', 'limite', 16, 12)]
    expect(proposer(mollet, h, null, '2026-10-07', calme, NOW)?.kg).toBe(16)
  })
})

describe('la progression au tonnage, dans le cadre', () => {
  it('à 10 répétitions, la charge monte et les répétitions redescendent juste assez', () => {
    expect(progresser({ series: 3, valeur: 10, kg: 14 }, 20, 2)).toEqual({
      charge: { series: 3, valeur: 9, kg: 16 },
      hausse: '+2 kg',
    })
  })

  it('sous trois séries, une série de plus si c’est le plus petit pas', () => {
    expect(progresser({ series: 2, valeur: 10, kg: 10 }, 20, 2)).toEqual({
      charge: { series: 3, valeur: 7, kg: 10 },
      hausse: '+1 série',
    })
  })

  it('le matériel plafonne : 3 x 10 à 16 kg sur une main, il n’y a plus de pas', () => {
    expect(progresser({ series: 3, valeur: 10, kg: 16 }, 16, 2)).toBeNull()
    const h = [ligne('2026-10-01', 'facile', 16, 10), ligne('2026-10-04', 'facile', 16, 10)]
    expect(proposer(mollet, h, null, '2026-10-07', calme, NOW)?.raison).toMatch(/plafond/)
  })

  it('tous les tonnages proposés montent, et restent dans le cadre', () => {
    let c = { series: 1, valeur: 6, kg: 4 }
    for (let i = 0; i < 60; i++) {
      const suite = progresser(c, 20, 2)
      if (!suite) break
      expect(tonnage(suite.charge)).toBeGreaterThan(tonnage(c))
      expect(suite.charge.series).toBeLessThanOrEqual(3)
      expect(suite.charge.valeur).toBeGreaterThanOrEqual(6)
      expect(suite.charge.valeur).toBeLessThanOrEqual(10)
      expect(suite.charge.kg).toBeLessThanOrEqual(20)
      c = suite.charge
    }
    expect(c).toEqual({ series: 3, valeur: 10, kg: 20 })
  })
})

describe('la liste de la séance', () => {
  const ex: Array<[string, string, string]> = [
    ['Stanish (excentrique mollet, 2 jambes)', '3 x 15', 'tempo 3 s'],
    ['Mollets genou fléchi (soléaire)', '3 x 12', ''],
  ]

  it('ajoute les sauts faits ces quatre dernières semaines', () => {
    const h: RenfoRow[] = [{ day: '2026-10-01', exercice: 'sauts-deux', series: 3, valeur: 20, kg: 0, marge: 'facile' }]
    const ids = exercicesDeLaSeance(ex, 'muscu-bas', '2026-10-07', h, {}, NOW).map((x) => x.exo.id)
    expect(ids).toEqual(['mollet-tendu', 'mollet-flechi', 'sauts-deux'])
    expect(exercicesDeLaSeance(ex, 'muscu-bas', '2026-11-15', h, {}, NOW).map((x) => x.exo.id)).not.toContain('sauts-deux')
  })

  it('montre ce qui est noté ce jour-là et l’évolution', () => {
    const h = [ligne('2026-09-16', 'facile', 12), ligne('2026-10-07', 'juste', 16, 12)]
    const [premier] = exercicesDeLaSeance(ex, 'muscu-bas', '2026-10-07', h, {}, NOW)
    expect(premier.note?.kg).toBe(16)
    expect(premier.evolution).toBe('Depuis le 16 sept. : 720 → 576 kg soulevés')
    expect(formatCharge(premier.exo, premier.note!)).toBe('3 × 12 · 16 kg')
  })

  it('une évolution demande deux séances', () => {
    expect(evolution(mollet, [ligne('2026-10-01', 'facile')], NOW)).toBeNull()
  })
})

describe('les suggestions d’ajout', () => {
  it('le jour du bas : sauts, fentes, squat, pompes, curl, sauf ce qui est déjà au plan', () => {
    const liste = exercicesDeLaSeance([['Fentes bulgares', '3 x 10', '']], 'muscu-bas', '2026-10-07', [], {}, NOW)
    expect(suggestionsAAjouter('muscu-bas', liste).map((e) => e.id)).toEqual([
      'sauts-deux',
      'sauts-une',
      'squat-talonnette',
      'pompes',
      'curl',
    ])
  })

  it('le jour du haut : tout le bas du corps, et un ajout récent revient d’office', () => {
    const h: RenfoRow[] = [{ day: '2026-10-02', exercice: 'fentes-bulgares', series: 3, valeur: 10, kg: 12, marge: 'juste' }]
    const liste = exercicesDeLaSeance([['Stanish (excentrique mollet)', '3 x 12', '']], 'muscu-haut', '2026-10-09', h, {}, NOW)
    expect(liste.map((x) => x.exo.id)).toEqual(['mollet-tendu', 'fentes-bulgares'])
    const ids = suggestionsAAjouter('muscu-haut', liste).map((e) => e.id)
    expect(ids).toContain('squat-talonnette')
    expect(ids).not.toContain('mollet-tendu')
    expect(ids).not.toContain('pompes')
  })
})
