import { describe, expect, it } from 'vitest'
import {
  construireCarnet,
  exporterPourIA,
  tenueDuCarnet,
  trouverPatterns,
  type JourCarnet,
} from './carnet'
import { addDays } from './dates'
import { indexerEcarts, type EcartRow } from './overrides'
import type { Week } from '../data/types'
import type { FeedbackRow } from './buildPain'

const LUNDI = '2026-09-07'

const semaine: Week = {
  n: 5,
  bloc: 'A',
  blocName: '',
  monday: LUNDI,
  deload: false,
  sl: 24,
  efKm: 7,
  sessions: [
    { day: 0, type: 'long', title: 'Sortie longue de 24 km', cat: '', note: '', dist: 24 },
    { day: 1, type: 'ef', title: 'Endurance facile 7 km', cat: '', note: '', dist: 7 },
    { day: 3, type: 'velo', title: 'Vélo Z2', cat: '', note: '' },
    { day: 6, type: 'repos', title: 'Repos', cat: '', note: '' },
  ],
}

const ressenti = (day_index: number, rpe: number, pain: number): FeedbackRow => ({
  week: 5,
  day_index,
  slot: 0,
  day: addDays(LUNDI, day_index),
  session_type: '',
  rpe,
  pain,
})

describe('construireCarnet', () => {
  const carnet = construireCarnet({
    weeks: [semaine],
    ecarts: indexerEcarts([{ week: 5, day_index: 3, slot: 0, patch: { skipped: true }, reason: null } as EcartRow]),
    feedback: [ressenti(0, 7, 2)],
    pain: { [LUNDI]: { evening: 2 }, [addDays(LUNDI, 1)]: { wake: 3 } },
    load: { [LUNDI]: 26.4 },
    activities: [],
    du: LUNDI,
    au: addDays(LUNDI, 6),
  })

  it('met la séance notée et la douleur du lendemain sur la même ligne', () => {
    const lundi = carnet[0]
    expect(lundi.activites[0]).toMatchObject({ nature: 'longue', rpe: 7, douleurEffort: 2, km: 24 })
    expect(lundi.soir).toBe(2)
    expect(lundi.reveilLendemain).toBe(3)
  })

  it('marque la séance non notée au lieu de la compter comme rien', () => {
    expect(carnet[1].activites).toHaveLength(0)
    expect(carnet[1].nonNotees).toBe(1)
  })

  it('compte la séance sautée, et le repos ne réclame rien', () => {
    expect(carnet[3].sautees).toBe(1)
    expect(carnet[3].nonNotees).toBe(0)
    expect(carnet[6].nonNotees).toBe(0)
  })

  it('ne prend pas une durée estimée pour une mesure', () => {
    expect(carnet[0].activites[0].minutes).toBeNull()
  })
})

/** Un jour de carnet complet, la douleur du lendemain donnée. */
const jour = (k: number, natures: JourCarnet['activites'][number]['nature'][], reveilLendemain: number): JourCarnet => ({
  day: addDays(LUNDI, k),
  activites: natures.map((nature) => ({ nature, titre: nature, km: null, minutes: null, rpe: null, douleurEffort: null, source: 'plan' })),
  nonNotees: 0,
  sautees: 0,
  reveil: null,
  effort: null,
  soir: null,
  reveilLendemain,
  excentrique: false,
  charge: 10,
})

describe('trouverPatterns', () => {
  it('voit la raideur qui suit le vélo', () => {
    const carnet = [
      ...Array.from({ length: 5 }, (_, k) => jour(k, ['velo'], 3)),
      ...Array.from({ length: 5 }, (_, k) => jour(k + 5, ['escalade'], 1)),
    ]
    const p = trouverPatterns(carnet).find((x) => x.cle === 'velo-reveilLendemain')!
    expect(p.avec).toBe(3)
    expect(p.sans).toBe(1)
    expect(p.nAvec).toBe(5)
  })

  it('se tait sous quatre jours de chaque côté', () => {
    const carnet = [
      ...Array.from({ length: 3 }, (_, k) => jour(k, ['velo'], 3)),
      ...Array.from({ length: 10 }, (_, k) => jour(k + 3, ['escalade'], 1)),
    ]
    expect(trouverPatterns(carnet).find((x) => x.cle === 'velo-reveilLendemain')).toBeUndefined()
  })

  it('écarte les jours incomplets : on ne sait pas ce qui y a été fait', () => {
    const carnet = [
      ...Array.from({ length: 5 }, (_, k) => ({ ...jour(k, [], 4), nonNotees: 1 })),
      ...Array.from({ length: 5 }, (_, k) => jour(k + 5, ['velo'], 1)),
      ...Array.from({ length: 5 }, (_, k) => jour(k + 10, ['escalade'], 1)),
    ]
    expect(trouverPatterns(carnet).find((x) => x.cle === 'sans-jambes-reveilLendemain')).toBeUndefined()
  })

  it('ignore un écart dans le bruit de la saisie', () => {
    const carnet = [
      ...Array.from({ length: 5 }, (_, k) => jour(k, ['velo'], 1.3)),
      ...Array.from({ length: 5 }, (_, k) => jour(k + 5, ['escalade'], 1)),
    ]
    expect(trouverPatterns(carnet).find((x) => x.cle === 'velo-reveilLendemain')).toBeUndefined()
  })
})

describe('exporterPourIA', () => {
  it('porte les échelles, la consigne et une ligne par jour, sans valeur inventée', () => {
    const carnet = [jour(0, ['longue'], 2), { ...jour(1, [], 1), reveilLendemain: null, nonNotees: 1 }]
    const texte = exporterPourIA(carnet, [], tenueDuCarnet(carnet))
    expect(texte).toContain('échelle de 0 à 10')
    expect(texte).toContain('Distingue ce qui est une corrélation')
    expect(texte).toContain(`| ${addDays(LUNDI, 1)} | aucune | · | · | · | · | non | 10 | 0 | 1 |`)
    expect(texte).not.toMatch(/NaN|undefined|null/)
  })
})
