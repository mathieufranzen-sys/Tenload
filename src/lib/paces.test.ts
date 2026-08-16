/**
 * La VAP est un calcul maison : Strava l'affiche mais ne l'expose pas. Ces
 * tests verrouillent le sens et l'ordre de grandeur, pas la décimale.
 */
import { describe, expect, it } from 'vitest'
import type { Session } from '../data/types'
import {
  allureUnique,
  coutDuRelief,
  estimateDuration,
  formatPace,
  lireRepetitions,
  vap,
  zoneHrRange,
} from './paces'

const PACE = 277 // allure marathon objectif, 4:37/km
const seance = (p: Partial<Session>): Session =>
  ({ day: 0, type: 'inter', cat: '', title: '', note: '', ...p }) as Session

describe('coût du relief', () => {
  it('vaut 1 sur le plat', () => {
    expect(coutDuRelief(10000, 0)).toBe(1)
  })

  it('croît avec le dénivelé', () => {
    const plat = coutDuRelief(10000, 20)
    const vallonne = coutDuRelief(10000, 200)
    const montagne = coutDuRelief(10000, 600)
    expect(plat).toBeLessThan(vallonne)
    expect(vallonne).toBeLessThan(montagne)
  })

  it('reste modeste sur une route peu vallonnée', () => {
    // 25 km avec 236 m D+ : le profil réel d'une de ses sorties longues.
    const c = coutDuRelief(25000, 236)
    expect(c).toBeGreaterThan(1)
    expect(c).toBeLessThan(1.03)
  })
})

describe('VAP', () => {
  it("ne renvoie rien quand le dénivelé n'est pas connu", () => {
    expect(vap(10000, 3000, null)).toBeNull()
    expect(vap(10000, 3000, undefined)).toBeNull()
  })

  it('égale l’allure réelle sur le plat', () => {
    // 10 km en 50 min = 300 s/km
    expect(vap(10000, 3000, 0)).toBe(300)
  })

  it('est plus rapide que l’allure réelle dès qu’il y a du dénivelé', () => {
    const reelle = 3000 / 10
    const v = vap(10000, 3000, 300)!
    expect(v).toBeLessThan(reelle)
  })

  it('reste dans un ordre de grandeur plausible sur un gros dénivelé', () => {
    // 10 km, 500 m D+, 1 h : la VAP ne doit pas devenir absurde.
    const v = vap(10000, 3600, 500)!
    expect(v).toBeGreaterThan(240)
    expect(v).toBeLessThan(360)
  })
})

describe('zones de FC', () => {
  it('décale le vélo de 20 bpm vers le bas', () => {
    const [loCourse, hiCourse] = zoneHrRange('ef', 'course')
    const [loVelo, hiVelo] = zoneHrRange('ef', 'velo')
    expect(loCourse - loVelo).toBe(20)
    expect(hiCourse - hiVelo).toBe(20)
  })

  it('ne descend jamais sous zéro', () => {
    const [lo] = zoneHrRange('recup', 'velo')
    expect(lo).toBeGreaterThanOrEqual(0)
  })
})

describe('formatPace', () => {
  it('formate en m:ss', () => {
    expect(formatPace(277)).toBe('4:37')
    expect(formatPace(300)).toBe('5:00')
  })
})

describe('lireRepetitions', () => {
  it('lit une série en mètres', () => {
    expect(lireRepetitions('5 x 1000 m')).toEqual({ n: 5, km: 1, secondes: null })
  })

  it('lit une série en kilomètres', () => {
    expect(lireRepetitions('3 x 2 km')).toEqual({ n: 3, km: 2, secondes: null })
  })

  it('lit une série au chronomètre en secondes', () => {
    expect(lireRepetitions('6 x 45 s en côte modérée')).toEqual({ n: 6, km: null, secondes: 45 })
  })

  it('lit une série au chronomètre en minutes', () => {
    // Le `m` de « min » était capturé comme l'unité mètre : 8 mètres au lieu
    // de 8 minutes, et la séance de seuil ne pesait plus rien.
    expect(lireRepetitions('2 x 8 min')).toEqual({ n: 2, km: null, secondes: 480 })
  })

  it("tranche l'unité manquante sur l'ordre de grandeur", () => {
    expect(lireRepetitions('8 x 400')).toEqual({ n: 8, km: 0.4, secondes: null })
    expect(lireRepetitions('3 x 2')).toEqual({ n: 3, km: 2, secondes: null })
  })

  it('ignore un libellé qui ne décrit pas une série', () => {
    expect(lireRepetitions('récup 90 s marche/trot')).toBeNull()
    expect(lireRepetitions(12)).toBeNull()
  })
})

describe('estimateDuration', () => {
  it('compte des côtes de 45 s comme des secondes, pas des kilomètres', () => {
    // 45 lus en km donnaient 6 x 45 km, soit une séance de 19 h affichée sur
    // le programme du 22 août.
    const [lo, hi] = estimateDuration(
      seance({
        dist: 9,
        wu: [[3, 'ef']],
        main: [['6 x 45 s en côte modérée', 'vo2']],
        cd: [[2, 'recup']],
      }),
      PACE,
    )
    expect(lo).toBeGreaterThan(25)
    expect(hi).toBeLessThan(70)
  })

  it('compte 8 min comme huit minutes, pas huit mètres', () => {
    const court = estimateDuration(seance({ main: [['2 x 2 min', 'seuil']] }), PACE)[0]
    const long = estimateDuration(seance({ main: [['2 x 8 min', 'seuil']] }), PACE)[0]
    expect(long - court).toBeGreaterThanOrEqual(10)
  })
})

describe('allureUnique', () => {
  it("donne l'allure quand toute la séance se court à la même", () => {
    const v = allureUnique(seance({ type: 'long', struct: [{ km: 22, zone: 'ef' }] }), PACE)
    expect(v).toBe(PACE + 50)
  })

  it('ne donne rien quand la séance change d’allure en route', () => {
    // Les 5 x 1000 m du 12 septembre : échauffement, vo2, retour au calme.
    // Une seule allure à côté des 10 km et des 55-60 min totaux se contredit.
    const v = allureUnique(
      seance({
        dist: 10,
        wu: [[2.5, 'ef']],
        main: [['5 x 1000 m', 'vo2']],
        cd: [[2, 'recup']],
      }),
      PACE,
    )
    expect(v).toBeNull()
  })

  it('ne donne rien quand aucune zone n’est fixée', () => {
    expect(allureUnique(seance({ type: 'velo', dur: [50, 60] }), PACE)).toBeNull()
  })
})
