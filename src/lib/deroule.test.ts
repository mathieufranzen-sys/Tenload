import { describe, expect, it } from 'vitest'
import type { Session } from '../data/types'
import { deroulerSeance, dureeSegment, estRecup, hauteurSegment, lireRepetition, roleDe } from './deroule'

const AM = 277 // allure marathon objectif, 4:37/km

const seance = (extra: Partial<Session>): Session => ({
  day: 5,
  type: 'inter',
  title: 'Séance',
  cat: 'Intervalles',
  note: '',
  ...extra,
})

describe('lireRepetition', () => {
  it('sépare le nombre de tours du contenu', () => {
    expect(lireRepetition('6 x 1000 m')).toEqual({ reps: 6, reste: '1000 m' })
    expect(lireRepetition('8 x (1 min vif + 1 min souple)')).toEqual({
      reps: 8,
      reste: '(1 min vif + 1 min souple)',
    })
  })

  it('laisse passer un bloc continu', () => {
    expect(lireRepetition('20 min continu')).toEqual({ reps: 1, reste: '20 min continu' })
  })
})

describe('dureeSegment', () => {
  it('convertit une distance par l’allure de sa zone', () => {
    // 1 km au seuil = allure marathon − 20 s.
    expect(dureeSegment('1 km', 'seuil', AM)).toBe(257)
    expect(dureeSegment('1000 m', 'seuil', AM)).toBe(257)
  })

  it('distingue deux zones sur la même distance', () => {
    // C'est tout l'intérêt : un 1000 m en VO2 est plus court qu'en endurance.
    const vo2 = dureeSegment('1000 m', 'vo2', AM)!
    const ef = dureeSegment('1000 m', 'ef', AM)!
    expect(vo2).toBeLessThan(ef)
  })

  it('lit le temps tel quel', () => {
    expect(dureeSegment('90 s', null, AM)).toBe(90)
    expect(dureeSegment('3 min', null, AM)).toBe(180)
  })

  it('somme les termes d’un tour entre parenthèses', () => {
    expect(dureeSegment('(1 min vif + 1 min souple)', null, AM)).toBe(120)
  })

  it('ne devine pas une distance sans zone', () => {
    expect(dureeSegment('2 km', null, AM)).toBeNull()
  })

  it('accepte la virgule décimale du plan', () => {
    expect(dureeSegment('21,1 km', 'seuil', AM)).toBeCloseTo(21.1 * 257, 5)
  })
})

describe('estRecup', () => {
  it('reconnaît une récupération, accentuée ou non', () => {
    expect(estRecup('récup 90 s')).toBe(true)
    expect(estRecup('recup 3 min souple')).toBe(true)
    expect(estRecup('6 x 1000 m')).toBe(false)
  })
})

describe('deroulerSeance', () => {
  it('rattache la récupération à la répétition qui la précède', () => {
    const b = deroulerSeance(
      seance({
        wu: [[2.5, 'ef']],
        main: [
          ['6 x 1000 m', 'vo2'],
          ['récup 90 s', ''],
        ],
        cd: [[2, 'recup']],
      }),
      AM,
    )
    expect(b).toHaveLength(3)
    expect(b[1].phase).toBe('main')
    expect(b[1].reps).toBe(6)
    expect(b[1].effort.quantite).toBe('1000 m')
    expect(b[1].recup?.secondes).toBe(90)
  })

  it('ne rattache rien à un bloc continu', () => {
    // « 20 min continu » puis une récup : la récup est un bloc à part entière,
    // sans quoi elle se répéterait autant de fois que le bloc, c'est-à-dire
    // une seule, et disparaîtrait de la lecture.
    const b = deroulerSeance(
      seance({ main: [['20 min continu', 'seuil'], ['récup 3 min', '']] }),
      AM,
    )
    expect(b).toHaveLength(2)
    expect(b[0].recup).toBeUndefined()
    expect(b[1].effort.quantite).toBe('3 min')
  })

  it('déroule une sortie longue segment par segment', () => {
    const b = deroulerSeance(
      seance({ type: 'long', struct: [{ km: 12, zone: 'ef' }, { km: 6, zone: 'am' }] }),
      AM,
    )
    expect(b).toHaveLength(2)
    expect(b.every((x) => x.reps === 1)).toBe(true)
    expect(b[1].effort.quantite).toBe('6 km')
  })

  it('promeut la consigne libre en libellé, sans la répéter', () => {
    const b = deroulerSeance(
      seance({ main: [['6 x 45 s en côte modérée', 'effort 8/10, retour en marchant']] }),
      AM,
    )
    expect(b[0].reps).toBe(6)
    expect(b[0].effort.libelle).toBe('effort 8/10, retour en marchant')
    expect(b[0].effort.quantite).toBe('45 s en côte modérée')
    expect(b[0].effort.zone).toBeNull()
  })

  it('lit un pas écrit en nombre comme des kilomètres', () => {
    const b = deroulerSeance(seance({ wu: [[2.5, 'ef']], main: [['20 min continu', 'seuil']] }), AM)
    expect(b[0].effort.quantite).toBe('2,5 km')
    expect(b[0].effort.secondes).toBeCloseTo(2.5 * (AM + 50), 5)
  })
})

describe('roleDe et hauteurSegment', () => {
  const seg = (zone: 'ef' | 'seuil' | 'rep') => ({
    libelle: '',
    quantite: '',
    zone,
    secondes: 60,
  })

  it('range l’endurance en facile et le seuil en effort', () => {
    expect(roleDe(seg('ef'), false)).toBe('facile')
    expect(roleDe(seg('seuil'), false)).toBe('effort')
  })

  it('sans zone, la phase tranche', () => {
    const libre = { libelle: '', quantite: '', zone: null, secondes: 45 }
    expect(roleDe(libre, false, 'main')).toBe('effort')
    expect(roleDe(libre, false, 'wu')).toBe('facile')
    expect(hauteurSegment(libre, false, 'main')).toBeGreaterThan(
      hauteurSegment(libre, false, 'wu'),
    )
  })

  it('la récupération prime sur la zone', () => {
    expect(roleDe(seg('seuil'), true)).toBe('recup')
  })

  it('monte avec l’intensité, sauf en récupération', () => {
    expect(hauteurSegment(seg('rep'), false)).toBeGreaterThan(hauteurSegment(seg('ef'), false))
    expect(hauteurSegment(seg('rep'), true)).toBeLessThan(hauteurSegment(seg('ef'), false))
  })
})
