import { describe, expect, it } from 'vitest'
import type { Session } from '../data/types'
import { repartitionZones } from './repartition'

const PACE = 277 // allure marathon objectif, 4:37/km

const seance = (p: Partial<Session>): Session => ({ day: 0, type: 'ef', cat: '', title: '', note: '', ...p }) as Session

describe('repartitionZones', () => {
  it('lit une séance décrite par sa structure', () => {
    const r = repartitionZones(seance({ struct: [{ km: 22, zone: 'ef' }] }), PACE)
    expect(r).toHaveLength(1)
    expect(r[0].zone).toBe('ef')
    expect(r[0].km).toBe(22)
    expect(r[0].part).toBe(1)
  })

  it('agrège échauffement, corps de séance et retour au calme', () => {
    const r = repartitionZones(
      seance({
        type: 'tempo',
        wu: [[2.5, 'ef']],
        main: [['2 x 2 km', 'seuil'], ['récup 3 min souple', '']],
        cd: [[2, 'recup']],
      }),
      PACE,
    )
    const zones = r.map((x) => x.zone)
    expect(zones).toContain('ef')
    expect(zones).toContain('seuil')
    expect(zones).toContain('recup')
    expect(r.find((x) => x.zone === 'seuil')!.km).toBe(4) // 2 x 2 km
    expect(r.find((x) => x.zone === 'ef')!.km).toBe(2.5)
  })

  it('ignore les étapes sans zone attribuable', () => {
    const r = repartitionZones(
      seance({
        type: 'inter',
        wu: [[2.5, 'ef']],
        main: [['6 x 45 s en côte modérée', 'effort 8/10, retour en marchant']],
        cd: [[2.5, 'recup']],
      }),
      PACE,
    )
    // Le corps de séance n'a pas de zone : seules ef et recup sont comptées.
    expect(r.map((x) => x.zone).sort()).toEqual(['ef', 'recup'])
  })

  it('convertit les mètres en kilomètres', () => {
    const r = repartitionZones(seance({ main: [['5 x 1000 m', 'vo2']] }), PACE)
    expect(r[0].km).toBe(5)
  })

  it('renvoie une liste vide quand rien n’est attribuable', () => {
    expect(repartitionZones(seance({ type: 'repos' }), PACE)).toEqual([])
    expect(repartitionZones(seance({ type: 'velo', dur: [40, 50] }), PACE)).toEqual([])
  })

  it('les parts somment à 1', () => {
    const r = repartitionZones(
      seance({ wu: [[2.5, 'ef']], main: [['2 x 2 km', 'seuil']], cd: [[2, 'recup']] }),
      PACE,
    )
    const somme = r.reduce((s, x) => s + x.part, 0)
    expect(somme).toBeCloseTo(1, 5)
  })

  it('classe la zone la plus longue en premier', () => {
    const r = repartitionZones(
      seance({ wu: [[2.5, 'ef']], main: [['2 x 2 km', 'seuil']], cd: [[2, 'recup']] }),
      PACE,
    )
    for (let i = 1; i < r.length; i++) expect(r[i - 1].secondes).toBeGreaterThanOrEqual(r[i].secondes)
  })
})
