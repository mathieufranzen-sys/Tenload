/**
 * Le clavier numérique du téléphone n'a pas de « : ». Ces cas verrouillent le
 * formatage automatique, qui est la seule façon de remplir le champ sur mobile.
 */
import { describe, expect, it } from 'vitest'
import { formaterChrono } from './PaceSettings'

describe('formaterChrono', () => {
  it('laisse passer les deux premiers chiffres tels quels', () => {
    expect(formaterChrono('1')).toBe('1')
    expect(formaterChrono('12')).toBe('12')
  })

  it('pose le deux-points dès le troisième chiffre', () => {
    expect(formaterChrono('120')).toBe('1:20')
    expect(formaterChrono('1202')).toBe('12:02')
  })

  it('reformate sans le doubler quand la valeur en contient déjà un', () => {
    expect(formaterChrono('12:02')).toBe('12:02')
    expect(formaterChrono('12:0')).toBe('1:20')
  })

  it('ignore tout ce qui n’est pas un chiffre', () => {
    expect(formaterChrono('12h02')).toBe('12:02')
    expect(formaterChrono('ab')).toBe('')
  })

  it('s’arrête à quatre chiffres', () => {
    expect(formaterChrono('120234')).toBe('12:02')
  })

  it('se vide complètement quand on efface', () => {
    expect(formaterChrono('')).toBe('')
  })
})
