import { describe, expect, it } from 'vitest'
import planJson from '../data/plan.json'
import type { Plan, Session } from '../data/types'
import { weekSessions } from './adapt'
import { cleEcart, indexerEcarts } from './overrides'
import { niveauDe, signauxSemaine } from './signal'

const semaine = (planJson as unknown as Plan).weeks[11] // S12 : longue lundi, EF mardi, qualité jeudi, EF samedi
const base = { title: 'x', cat: 'x', note: '', day: 0 } as Session

describe('le signal d’une carte : une seule icône, la plus importante', () => {
  it('une contrainte cassée l’emporte sur tout', () => {
    expect(niveauDe({ ...base, type: 'ef', motif: 'plafond' }, ['Deux jours de course consécutifs'])).toBe('alerte')
  })

  it('la douleur avant le volume, et rien pour une séance faite autrement', () => {
    expect(niveauDe({ ...base, type: 'long', motif: 'indice' }, [])).toBe('douleur')
    expect(niveauDe({ ...base, type: 'long', motif: 'palier' }, [])).toBe('douleur')
    expect(niveauDe({ ...base, type: 'ef', motif: 'progression' }, [])).toBe('adapte')
    expect(niveauDe({ ...base, type: 'velo', motif: 'faite' }, [])).toBeNull()
    expect(niveauDe({ ...base, type: 'ef', motif: 'indice', saute: true }, [])).toBeNull()
  })

  it('une séance seulement déplacée n’a pas d’icône ; celle qui casse une contrainte, si', () => {
    // Le renfo du vendredi passé au samedi : rien à signaler. La course
    // facile du samedi ramenée au vendredi colle à la qualité du jeudi : deux
    // jours de course d'affilée, sur les deux cartes et sur elles seules.
    const calme = signauxSemaine(
      weekSessions(semaine, semaine.monday, {}, indexerEcarts([{ week: 12, day_index: 4, slot: 0, patch: { day: 5 }, reason: null }])),
    )
    expect(calme.get(cleEcart(12, 4, 0))?.niveau).toBeNull()

    const colle = signauxSemaine(
      weekSessions(semaine, semaine.monday, {}, indexerEcarts([{ week: 12, day_index: 5, slot: 0, patch: { day: 4 }, reason: null }])),
    )
    expect(colle.get(cleEcart(12, 5, 0))).toMatchObject({ niveau: 'alerte', alertes: ['Deux jours de course consécutifs (jeudi et vendredi).'] })
    expect(colle.get(cleEcart(12, 3, 0))?.niveau).toBe('alerte')
    expect(colle.get(cleEcart(12, 0, 0))?.niveau).toBeNull()
  })
})
