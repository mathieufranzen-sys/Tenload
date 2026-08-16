/**
 * L'échelle de « Douleur au fil des jours ». Elle suit les données au lieu
 * d'aller au maximum théorique, sans jamais laisser sortir le seuil du cadre.
 */
import { describe, expect, it } from 'vitest'
import { echelle } from './PainChart'

describe('echelle', () => {
  it('se resserre quand la douleur reste basse', () => {
    // Le quotidien de Mathieu : 0,8 au réveil, 1,3 le soir. Sur un axe fixé à
    // 30, la somme des trois restait collée au sol.
    const { max } = echelle(3, 12, 30)
    expect(max).toBeLessThanOrEqual(15)
  })

  it('garde toujours le seuil dans le cadre', () => {
    for (const valeurMax of [0, 1, 2, 5, 11]) {
      expect(echelle(valeurMax, 12, 30).max).toBeGreaterThan(12)
      expect(echelle(valeurMax, 4, 10).max).toBeGreaterThan(4)
    }
  })

  it('laisse de la marge au-dessus du pic', () => {
    const { max } = echelle(22, 12, 30)
    expect(max).toBeGreaterThan(22)
  })

  it('ne dépasse jamais le maximum théorique de la vue', () => {
    expect(echelle(30, 12, 30).max).toBe(30)
    expect(echelle(10, 4, 10).max).toBe(10)
  })

  it('donne des graduations rondes, croissantes, de 0 au maximum', () => {
    for (const [v, s, p] of [[3, 12, 30], [22, 12, 30], [1, 4, 10], [9, 4, 10]] as const) {
      const { max, graduations } = echelle(v, s, p)
      expect(graduations[0]).toBe(0)
      expect(graduations[graduations.length - 1]).toBe(max)
      expect(graduations.length).toBeGreaterThanOrEqual(3)
      expect(graduations.length).toBeLessThanOrEqual(8)
      for (let i = 1; i < graduations.length; i++) {
        expect(graduations[i]).toBeGreaterThan(graduations[i - 1])
      }
    }
  })
})
