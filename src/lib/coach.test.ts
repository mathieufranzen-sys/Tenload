import { describe, expect, it } from 'vitest'
import { butDeLaSeance, motDuCoach, type SeanceDuJour } from './coach'
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

describe('butDeLaSeance', () => {
  it('explique ce que travaillent les séances de qualité', () => {
    for (const t of ['inter', 'tempo', 'long', 'ef', 'test', 'course', 'race'] as const) {
      expect(butDeLaSeance(t)).toBeTruthy()
    }
  })

  it('se tait sur les séances sans objet de progression propre', () => {
    // Un texte qui vaut pour tout le monde ne dit plus rien à personne.
    for (const t of ['velo', 'escalade', 'repos', 'muscu-bas', 'muscu-haut'] as const) {
      expect(butDeLaSeance(t)).toBeNull()
    }
  })

  it('ne cite aucune donnée : c’est de la physiologie, pas une lecture du carnet', () => {
    // « VO2max » est un nom, pas une mesure : c'est la seule occurrence de
    // chiffre tolérée. Tout le reste serait une valeur affirmée sans source.
    for (const t of ['inter', 'tempo', 'long', 'ef', 'test', 'race'] as const) {
      expect(butDeLaSeance(t)!.replace(/VO2max/g, '')).not.toMatch(/\d/)
    }
  })
})

describe('motDuCoach — la séance du jour', () => {
  const seance = (p: Partial<SeanceDuJour> = {}): SeanceDuJour => ({
    type: 'ef',
    typePlan: 'ef',
    titre: 'Endurance facile 7 km',
    dist: 7,
    distPlan: 7,
    ecart: null,
    adaptee: false,
    faite: false,
    saute: false,
    ...p,
  })
  const calme = { idx: 20, painInconnue: false, chargeInconnue: false }

  it('déconseille la course quand l’indice l’a neutralisée', () => {
    const m = motDuCoach({
      pain: {},
      byDate: {},
      now: NOW,
      seancesTotal: TOTAL,
      duJour: [seance({ type: 'velo', typePlan: 'long', adaptee: true })],
      indice: { idx: 71, painInconnue: false, chargeInconnue: false },
    })
    expect(m.ton).toBe('vigilance')
    expect(m.texte).toContain('71 sur 100')
    expect(m.texte).toContain('sortie longue')
  })

  it('dit que l’indice est amputé quand la douleur n’est pas saisie', () => {
    const m = motDuCoach({
      pain: {},
      byDate: {},
      now: NOW,
      seancesTotal: TOTAL,
      duJour: [seance({ type: 'velo', typePlan: 'tempo', adaptee: true })],
      indice: { idx: 68, painInconnue: true, chargeInconnue: false },
    })
    expect(m.texte).toContain('sans ta douleur')
  })

  it('félicite un allègement décidé par Mathieu sur un indice haut', () => {
    const m = motDuCoach({
      pain: {},
      byDate: {},
      now: NOW,
      seancesTotal: TOTAL,
      duJour: [seance({ type: 'velo', typePlan: 'tempo', dist: null, ecart: 'remplacement' })],
      indice: { idx: 56, painInconnue: false, chargeInconnue: false },
    })
    expect(m.ton).toBe('bravo')
    expect(m.texte).toContain('56')
  })

  it('relaie la contrainte cassée par un déplacement', () => {
    const m = motDuCoach({
      pain: {},
      byDate: {},
      now: NOW,
      seancesTotal: TOTAL,
      duJour: [seance({ type: 'tempo', typePlan: 'tempo', ecart: 'deplacement' })],
      indice: calme,
      alertes: ['Séance de qualité accolée à la sortie longue.'],
    })
    expect(m.ton).toBe('vigilance')
    expect(m.texte).toContain('accolée à la sortie longue')
  })

  it('se tait sur une séance déjà notée', () => {
    const m = motDuCoach({
      pain: {},
      byDate: {},
      now: NOW,
      seancesTotal: TOTAL,
      duJour: [seance({ type: 'velo', typePlan: 'long', adaptee: true, faite: true })],
      indice: { idx: 71, painInconnue: false, chargeInconnue: false },
    })
    expect(m.texte).not.toContain('71 sur 100')
  })

  it('relance l’allure quand la raideur baisse et qu’une qualité est au programme', () => {
    const pain = carnet([...serie(14, 0.8), ...serie(14, 2)])
    const m = motDuCoach({
      pain,
      byDate: {},
      now: NOW,
      seancesTotal: TOTAL,
      duJour: [seance({ type: 'tempo', typePlan: 'tempo' })],
      indice: calme,
    })
    expect(m.ton).toBe('bravo')
    expect(m.texte).toContain("Tiens l'allure prévue")
  })

  it('n’invente rien sans séance ni indice : les règles d’avant tiennent', () => {
    const pain = carnet([...serie(14, 0.8), ...serie(14, 2)])
    const m = motDuCoach({ pain, byDate: {}, now: NOW, seancesTotal: TOTAL })
    expect(m.ton).toBe('bravo')
    expect(m.texte).not.toContain("Tiens l'allure")
  })
})

describe('motDuCoach — un changement à indice bas doit quand même parler', () => {
  const seance = (p: Partial<SeanceDuJour> = {}): SeanceDuJour => ({
    type: 'ef',
    typePlan: 'ef',
    titre: 'Endurance facile 7 km',
    dist: 7,
    distPlan: 7,
    ecart: null,
    adaptee: false,
    faite: false,
    saute: false,
    ...p,
  })
  // 27 sur 100 : le vert. C'est là que les règles se taisaient toutes, parce
  // qu'elles étaient toutes conditionnées à un indice haut ou à une contrainte
  // cassée. Or c'est exactement le cas courant.
  const calme = { idx: 27, painInconnue: false, chargeInconnue: false }
  const mot = (duJour: SeanceDuJour[], alertes?: string[]) =>
    motDuCoach({ pain: {}, byDate: {}, now: NOW, seancesTotal: TOTAL, duJour, indice: calme, alertes })

  it('parle d’une séance sautée', () => {
    const m = mot([seance({ typePlan: 'tempo', type: 'tempo', ecart: 'saut', saute: true })])
    expect(m.texte).toContain('sauté')
    expect(m.texte).toContain('séance de qualité')
  })

  it('parle d’un remplacement vers plus doux, sans féliciter à tort', () => {
    // À 27, l'indice ne demandait rien : c'est son ressenti qui a tranché, et
    // le dire « bon réflexe » laisserait croire que le modèle l'avait vu venir.
    const m = mot([seance({ typePlan: 'long', type: 'velo', dist: null, distPlan: 26, ecart: 'remplacement' })])
    expect(m.ton).toBe('neutre')
    expect(m.texte).toContain('26 km')
    expect(m.texte).toContain('du vélo')
    expect(m.texte).not.toContain('Bon réflexe')
  })

  it('félicite le même remplacement quand l’indice, lui, était haut', () => {
    const m = motDuCoach({
      pain: {},
      byDate: {},
      now: NOW,
      seancesTotal: TOTAL,
      duJour: [seance({ typePlan: 'long', type: 'velo', dist: null, ecart: 'remplacement' })],
      indice: { idx: 56, painInconnue: false, chargeInconnue: false },
    })
    expect(m.ton).toBe('bravo')
    expect(m.texte).toContain('56')
  })

  it('avertit quand un vélo devient de la course', () => {
    const m = mot([seance({ typePlan: 'velo', type: 'ef', dist: 8, distPlan: null, ecart: 'remplacement' })])
    expect(m.ton).toBe('vigilance')
    expect(m.texte).toContain('8 km')
  })

  it('parle d’une séance déplacée jusqu’ici', () => {
    const m = mot([seance({ typePlan: 'long', type: 'long', dist: 26, distPlan: 26, ecart: 'deplacement' })])
    expect(m.texte).toContain('sortie longue de 26 km')
    expect(m.texte).toContain("arrivée sur aujourd'hui")
  })

  it('relève une distance réelle supérieure au plan', () => {
    const m = mot([seance({ dist: 12, distPlan: 7, ecart: 'donnee' })])
    expect(m.ton).toBe('vigilance')
    expect(m.texte).toContain('12 km')
    expect(m.texte).toContain('7 km')
  })

  it('la contrainte cassée passe avant le reste', () => {
    const m = mot(
      [seance({ typePlan: 'tempo', type: 'tempo', ecart: 'deplacement' })],
      ['Séance de qualité accolée à la sortie longue.'],
    )
    expect(m.ton).toBe('vigilance')
    expect(m.texte).toContain('accolée à la sortie longue')
  })

  it('sans aucun écart, il retombe sur les règles de fond', () => {
    const m = mot([seance()])
    expect(m.texte).toContain('Note ta douleur au réveil')
  })
})
