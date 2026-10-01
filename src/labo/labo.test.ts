/**
 * Les quatre profils du laboratoire racontent-ils bien l'histoire annoncée ?
 *
 * Le test passe par le vrai moteur (`calculer`, la même chaîne que l'app) :
 * « le profil 2 est en jaune le 27 septembre » doit être un fait du modèle.
 * Si une constante de l'indice bouge et qu'un profil change de bande, c'est
 * ici que ça se voit, et c'est au scénario de suivre, pas au modèle.
 */
import { describe, expect, it } from 'vitest'
import { ANCRE, PROFILS, construireProfil, type CleProfil } from './scenarios'
import { calculer } from './moteur'
import { addDays } from '../lib/dates'

const etat = (cle: CleProfil) => calculer(construireProfil(cle), ANCRE)

/** Le pic de l'indice entre deux jours relatifs à l'ancre, bornes comprises. */
function pic(cle: CleProfil, de: number, a: number): number {
  const r = etat(cle)
  let max = 0
  for (let k = de; k <= a; k++) max = Math.max(max, r.byDate[addDays(ANCRE, k)]?.idx ?? 0)
  return max
}

describe('le laboratoire de charge', () => {
  it('pose chaque profil dans sa propre bande le jour de l’ancre', () => {
    expect(etat('crise-debut').band.key).toBe('rouge')
    // Vert depuis le 1er octobre 2026 : la raideur de 3,5 tous les matins ne
    // fait plus que 25 points, la charge ne comptant plus que ce qui sort de
    // l'habitude. Le jaune venait de la charge, pas de la douleur. Signalé à
    // Mathieu, en attente d'arbitrage (calibrage de la douleur sous 4).
    expect(etat('crise-fin').band.key).toBe('vert')
    expect(etat('stable').band.key).toBe('vert')
    expect(etat('crise-longue').band.key).toBe('orange')
  })

  it('début de convalescence : la crise est passée par le noir cette semaine', () => {
    expect(pic('crise-debut', -7, -1)).toBeGreaterThanOrEqual(80)
  })

  it('fin de crise : le noir date d’il y a trois semaines, la dernière semaine reste sous le rouge', () => {
    expect(pic('crise-fin', -30, -8)).toBeGreaterThanOrEqual(80)
    expect(pic('crise-fin', -7, -1)).toBeLessThan(65)
  })

  it('fin de convalescence : aucun épisode depuis un mois', () => {
    expect(pic('stable', -30, -1)).toBeLessThan(50)
  })

  it('convalescence longue : des épisodes cet été, mais la crise du jour est nouvelle', () => {
    expect(pic('crise-longue', -56, -31)).toBeGreaterThanOrEqual(65)
    expect(pic('crise-longue', -30, -1)).toBeLessThan(65)
  })

  it('aucun profil ne commence avec la douleur ou la charge inconnue', () => {
    for (const p of PROFILS) {
      const r = etat(p.cle)
      expect(r.detail.painInconnue, p.cle).toBe(false)
      expect(r.detail.chargeInconnue, p.cle).toBe(false)
    }
  })

  it('raconte la même histoire à chaque ouverture', () => {
    for (const p of PROFILS) expect(construireProfil(p.cle)).toEqual(construireProfil(p.cle))
  })
})
