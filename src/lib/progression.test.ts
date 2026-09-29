import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import type { FeedbackRow } from './buildPain'
import { plafondsProgression } from './progression'
import type { SeanceArrangee } from './palier'
import type { SessionType } from '../data/types'

const S1 = '2026-09-07'

/** Quatre semaines identiques : longue le lundi, deux EF, une qualité. */
function plan(semaines = 4, longue = 20): SeanceArrangee[] {
  const out: SeanceArrangee[] = []
  for (let w = 0; w < semaines; w++) {
    const lundi = addDays(S1, 7 * w)
    const s = (jour: number, type: SessionType, dist: number): SeanceArrangee => ({
      week: w + 1,
      jourOrigine: jour,
      slot: 0,
      day: addDays(lundi, jour),
      type,
      dist,
      saute: false,
    })
    out.push(s(0, 'long', longue), s(1, 'ef', 8), s(3, 'tempo', 10), s(5, 'ef', 12))
  }
  return out
}

/** Les ressentis de la semaine `w`, chaque course faite à `part` de sa distance. */
function faite(seances: SeanceArrangee[], w: number, part: number): FeedbackRow[] {
  return seances
    .filter((s) => s.week === w)
    .map((s) => ({
      week: s.week,
      day_index: s.jourOrigine,
      slot: 0,
      day: s.day,
      session_type: part === 0 ? 'velo' : s.type,
      pain: 1,
      rpe: 5,
      distance_km: part === 0 ? null : (s.dist ?? 0) * part,
    }))
}

describe('la semaine remonte de 15 % au plus, en part du plan', () => {
  const seances = plan()
  const lundi3 = addDays(S1, 14)

  it('une semaine faite comme prévue ne plafonne rien', () => {
    const fb = [...faite(seances, 1, 1), ...faite(seances, 2, 1)]
    expect(plafondsProgression(seances, fb, lundi3).size).toBe(0)
  })

  it('un épisode court presque sans effet : 90 % du plan tenu, 100 % la semaine d’après', () => {
    const fb = [...faite(seances, 1, 1), ...faite(seances, 2, 0.9)]
    expect(plafondsProgression(seances, fb, lundi3).size).toBe(0)
  })

  it('une semaine à 40 % : la suivante à 46 %, les courses faciles d’abord', () => {
    const fb = [...faite(seances, 1, 1), ...faite(seances, 2, 0.4)]
    const p = plafondsProgression(seances, fb, lundi3)
    // Plan 50 km, permis 23 : les EF descendent à 4 km, puis la longue.
    expect(p.get('3-5-0')!.km).toBe(4)
    expect(p.get('3-1-0')!.km).toBe(4)
    expect(p.get('3-0-0')!.km).toBeLessThan(20)
    expect(p.get('3-0-0')!.motif).toBe('progression')
    // La qualité ne se raccourcit pas.
    expect(p.has('3-3-0')).toBe(false)
  })

  it('la remontée continue les semaines suivantes, de plus en plus près du plan', () => {
    const fb = [...faite(seances, 1, 1), ...faite(seances, 2, 0.4)]
    const p = plafondsProgression(seances, fb, lundi3)
    const longue3 = p.get('3-0-0')!.km
    const longue4 = p.get('4-0-0')?.km ?? 20
    expect(longue4).toBeGreaterThan(longue3)
  })

  it('une semaine sans aucun ressenti ne dit rien et ne dégrade pas', () => {
    const fb = faite(seances, 1, 1)
    expect(plafondsProgression(seances, fb, lundi3).size).toBe(0)
  })
})

describe('une sortie ne dépasse pas de 10 % la plus longue du mois', () => {
  it('après une longue coupée à 14, la suivante plafonne à 15 (15,4 arrondi en dessous)', () => {
    const seances = plan(3, 20)
    const fb = [
      ...faite(seances, 1, 0.7), // longue de 14, EF de 5,6 et 8,4
      ...faite(seances, 2, 1).filter((f) => f.day_index !== 0),
    ]
    // La longue de la semaine 2 n'est pas notée : elle ne compte pas.
    const p = plafondsProgression(seances, fb, addDays(S1, 14))
    expect(p.get('3-0-0')).toMatchObject({ km: 15, motif: 'plafond' })
  })
})
