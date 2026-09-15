import { describe, expect, it } from 'vitest'
import { chronoPlausible, projectFrom3k, projeterMarathon, vdot } from './paces'
import { formaterChronoLong, lireChrono, recalageSurCourse } from '../components/ChronoCourse'

describe('projeterMarathon', () => {
  it('prend la suite du test de 3 km sans rupture', () => {
    // 12:02 le 8 août : un recalage sur course ne doit pas fabriquer d'écart.
    expect(projeterMarathon(3, 722)).toBe(projectFrom3k(722))
  })

  it('projette un 10 km en 40:12 autour de 3 h 10', () => {
    const allure = projeterMarathon(10, 40 * 60 + 12)
    expect(allure).toBeGreaterThanOrEqual(265)
    expect(allure).toBeLessThanOrEqual(275)
  })

  it('un chrono plus lent donne une forme plus lente', () => {
    expect(projeterMarathon(10, 42 * 60)).toBeGreaterThan(projeterMarathon(10, 40 * 60))
  })

  it('la prudence s’annule sur la distance marathon', () => {
    const t = 3 * 3600 + 15 * 60
    expect(projeterMarathon(42.195, t)).toBe(Math.round(t / 42.195))
  })

  it('à niveau égal, un semi garde moins de prudence qu’un 10 km', () => {
    // Le semi au même VDOT qu'un 10 km en 40:00 : même niveau, seule la
    // prudence change, et elle doit être plus faible sur la distance longue.
    const cible = vdot(10000, 40 * 60)
    let bas = 60 * 60
    let haut = 150 * 60
    for (let i = 0; i < 60; i++) {
      const m = (bas + haut) / 2
      if (vdot(21100, m) > cible) bas = m
      else haut = m
    }
    expect(projeterMarathon(21.1, (bas + haut) / 2)).toBeLessThan(projeterMarathon(10, 40 * 60))
  })

  it('refuse un chrono impossible', () => {
    expect(chronoPlausible(10, 20 * 60)).toBe(false)
    expect(chronoPlausible(10, 40 * 60)).toBe(true)
  })
})

describe('la saisie du chrono', () => {
  it('pose les deux-points toute seule', () => {
    expect(formaterChronoLong('4012')).toBe('40:12')
    expect(formaterChronoLong('13040')).toBe('1:30:40')
  })

  it('lit mm:ss et h:mm:ss', () => {
    expect(lireChrono('40:12')).toBe(2412)
    expect(lireChrono('1:30:40')).toBe(5440)
    expect(lireChrono('40:72')).toBeNull()
  })

  it('ne recale que sur les courses de 10 km à 39 km', () => {
    const base = { day: 6, title: '', cat: '', note: '' }
    expect(recalageSurCourse({ ...base, type: 'course', dist: 10 })).toBe(true)
    expect(recalageSurCourse({ ...base, type: 'course', dist: 21.1 })).toBe(true)
    expect(recalageSurCourse({ ...base, type: 'race', dist: 42.195 })).toBe(false)
    expect(recalageSurCourse({ ...base, type: 'tempo', dist: 10 })).toBe(false)
  })
})
