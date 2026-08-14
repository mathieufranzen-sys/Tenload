/**
 * La VAP est un calcul maison : Strava l'affiche mais ne l'expose pas. Ces
 * tests verrouillent le sens et l'ordre de grandeur, pas la décimale.
 */
import { describe, expect, it } from 'vitest'
import { coutDuRelief, formatPace, vap, zoneHrRange } from './paces'

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
