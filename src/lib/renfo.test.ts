import { describe, expect, it } from 'vitest'
import {
  evolution,
  exercicesDeLaSeance,
  formatCharge,
  identifier,
  lirePrescription,
  proposer,
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
    const p = proposer(mollet, [ligne('2026-10-04', 'facile')], null, '2026-10-07', calme, NOW)
    expect(p?.statut).toBe('tient')
    expect(p?.kg).toBe(14)
  })

  it('deux faciles et un réveil calme : +2 kg, et les répétitions redescendent vers 12', () => {
    const p = proposer(mollet, [ligne('2026-10-01', 'facile'), ligne('2026-10-04', 'facile')], null, '2026-10-07', calme, NOW)
    expect(p?.statut).toBe('monte')
    expect(p).toMatchObject({ series: 3, valeur: 12, kg: 16, hausse: '+2 kg' })
  })

  it('un réveil agité ou non noté le lendemain tient la charge', () => {
    const h = [ligne('2026-10-01', 'facile'), ligne('2026-10-04', 'facile')]
    expect(proposer(mollet, h, null, '2026-10-07', { '2026-10-05': { wake: 4 } }, NOW)?.statut).toBe('tient')
    expect(proposer(mollet, h, null, '2026-10-07', {}, NOW)?.raison).toMatch(/pas noté/)
  })

  it('une dernière série à la limite tient, elle ne baisse jamais', () => {
    const p = proposer(mollet, [ligne('2026-10-01', 'facile'), ligne('2026-10-04', 'limite')], null, '2026-10-07', calme, NOW)
    expect(p).toMatchObject({ statut: 'tient', kg: 14, valeur: 20 })
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
    const h = [ligne('2026-10-01', 'facile'), ligne('2026-10-04', 'facile'), ligne('2026-10-07', 'limite', 16, 12)]
    expect(proposer(mollet, h, null, '2026-10-07', calme, NOW)?.kg).toBe(16)
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
    expect(premier.evolution).toBe('Depuis le 16 sept. : 12 → 16 kg')
    expect(formatCharge(premier.exo, premier.note!)).toBe('3 × 12 · 16 kg')
  })

  it('une évolution demande deux séances', () => {
    expect(evolution(mollet, [ligne('2026-10-01', 'facile')], NOW)).toBeNull()
  })
})
