/**
 * L'échelle du remplissage. Le plancher de largeur, nécessaire pour que le
 * chiffre tienne dans la barre à zéro, écrasait les premiers crans quand il
 * était appliqué par-dessus une échelle linéaire.
 */
import { describe, expect, it } from 'vitest'
import { largeurRemplissage } from './BarreRessenti'

/** La part de course extraite de l'expression `calc()`. */
const part = (css: string): number => Number(css.match(/\+ ([\d.]+) \* /)![1])

describe('largeurRemplissage', () => {
  it('part du plancher et va jusqu’au bord', () => {
    expect(part(largeurRemplissage(0))).toBe(0)
    expect(part(largeurRemplissage(10))).toBe(1)
    expect(largeurRemplissage(10)).toContain('100%')
  })

  it('donne le même écart à chaque cran', () => {
    const ecarts = Array.from({ length: 10 }, (_, i) =>
      part(largeurRemplissage(i + 1)) - part(largeurRemplissage(i)),
    )
    for (const e of ecarts) expect(e).toBeCloseTo(0.1, 10)
  })

  it('sépare les trois premières valeurs', () => {
    // 0, 1 et 2 tombaient tous les trois sur ou près du plancher de 46 px,
    // alors que c'est la zone où vit la douleur de Mathieu au quotidien.
    const [a, b, c] = [0, 1, 2].map((v) => part(largeurRemplissage(v)))
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(b)
  })

  it('borne les valeurs hors échelle', () => {
    expect(part(largeurRemplissage(-3))).toBe(0)
    expect(part(largeurRemplissage(42))).toBe(1)
  })
})
