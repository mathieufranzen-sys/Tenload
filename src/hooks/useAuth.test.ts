import { describe, expect, it } from 'vitest'
import { messageErreur } from './useAuth'

describe('messageErreur', () => {
  it('donne le nombre exact de secondes quand Supabase le fournit', () => {
    const m = messageErreur('For security purposes, you can only request this after 51 seconds.')
    expect(m).toContain('51 secondes')
  })

  it('accorde le singulier', () => {
    expect(messageErreur('you can only request this after 1 second.')).toContain('1 seconde ')
  })

  it('distingue le quota horaire du délai par adresse', () => {
    // Le piège : sur ce cas, attendre une minute ne sert à rien. L'ancien
    // message disait pourtant « attends une minute » et faisait marteler
    // le bouton pendant une heure.
    const m = messageErreur('email rate limit exceeded')
    expect(m).toContain('Quota')
    expect(m).not.toContain('une minute avant')
  })

  it('reste compréhensible sur une limite générique', () => {
    expect(messageErreur('Request rate limit reached')).toContain('minute')
  })

  it('signale une adresse invalide', () => {
    expect(messageErreur('Unable to validate email address: invalid format')).toContain('valide')
  })

  it('a un repli pour tout le reste', () => {
    expect(messageErreur('boom')).toContain("L'envoi a échoué")
  })
})
