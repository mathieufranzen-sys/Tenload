import { describe, expect, it } from 'vitest'
import planJson from '../data/plan.json'
import type { Plan } from '../data/types'
import type { FeedbackRow } from './buildPain'
import { weekSessions, type ContextePlan } from './adapt'
import { appliquerEcart, cleEcart, indexerEcarts, type EcartPatch } from './overrides'

// 20 octobre 2026 : un vélo de 60 min corrigé à 18,6 km redevenait une course
// facile de 11 km, et « Remplacer par du vélo » ne changeait rien.
const semaine = (planJson as unknown as Plan).weeks[10]
const MERCREDI = '2026-10-21'
const CLE = cleEcart(11, 2, 1)

function veloDuMercredi(patch: EcartPatch | null, noteEn?: string) {
  const ecarts = indexerEcarts(patch ? [{ week: 11, day_index: 2, slot: 1, patch, reason: null }] : [])
  const f = noteEn
    ? ({ week: 11, day_index: 2, slot: 1, day: MERCREDI, session_type: noteEn, pain: 0, rpe: 4, distance_km: 11 } as unknown as FeedbackRow)
    : null
  const contexte: ContextePlan = {
    volumeOuvert: true,
    realisees: new Map(f ? [[CLE, f]] : []),
    faites: new Set(f ? [CLE] : []),
  }
  return weekSessions(semaine, MERCREDI, {}, ecarts, contexte).find((x) => x.jourOrigine === 2 && x.slot === 1)!.s
}

describe('l’ouverture du volume ne passe jamais par-dessus un écart de Mathieu', () => {
  it('sans écart, le vélo du plan devient une course facile de même durée', () => {
    expect(veloDuMercredi(null)).toMatchObject({ type: 'ef', dist: 11 })
  })

  it('une distance saisie sur le vélo le garde en vélo', () => {
    expect(veloDuMercredi({ dist: 18.6 })).toMatchObject({ type: 'velo', dist: 18.6 })
  })

  it('« Remplacer par du vélo » sur un vélo du plan est respecté', () => {
    expect(veloDuMercredi({ type: 'velo' }).type).toBe('velo')
  })

  it('remplacer après avoir noté l’emporte sur la discipline affichée au moment de noter', () => {
    expect(veloDuMercredi({ type: 'velo', dist: 18.6 }, 'ef')).toMatchObject({ type: 'velo', dist: 18.6 })
  })
})

describe('le badge d’écart ne dit que ce qui a changé', () => {
  it('un vélo remplacé par un vélo de même durée, déplacé au mardi : seul le jour', () => {
    const velo = semaine.sessions.find((s) => s.type === 'velo')!
    expect(appliquerEcart(velo, { type: 'velo', durMin: 60, day: 1 }).ecart).toBe('initialement mercredi')
  })
})
