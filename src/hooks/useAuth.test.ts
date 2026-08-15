import { describe, expect, it } from 'vitest'
import { codeValide, messageErreur } from './useAuth'

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

  it('ne présente pas l’erreur ambiguë de Supabase comme une expiration', () => {
    // Supabase renvoie ce message pour un code faux, un code déjà consommé ET
    // un code périmé. Annoncer « expiré » envoyait chercher un problème
    // d'horloge alors que la cause la plus fréquente est le clic sur le lien
    // du même mail, qui consomme le code.
    const m = messageErreur('Token has expired or is invalid')
    expect(m).toContain('invalide ou expiré')
    expect(m).toContain('lien')
  })

  it('a un repli pour tout le reste', () => {
    expect(messageErreur('boom')).toContain("L'envoi a échoué")
  })
})

describe('codeValide', () => {
  it('accepte six chiffres, le défaut de Supabase', () => {
    expect(codeValide('482601')).toBe(true)
  })

  it('accepte huit chiffres', () => {
    // Le réglage Email OTP Length monte à 10, et rien dans le mail ne dit
    // laquelle est active. Imposer six bloquait le formulaire sans explication.
    expect(codeValide('48260173')).toBe(true)
  })

  it('accepte la borne haute de dix chiffres', () => {
    expect(codeValide('4826017391')).toBe(true)
  })

  it('refuse plus court que six', () => {
    expect(codeValide('48260')).toBe(false)
  })

  it('refuse plus long que dix', () => {
    expect(codeValide('48260173915')).toBe(false)
  })

  it('ignore les espaces d’un copier-coller', () => {
    expect(codeValide('482 601')).toBe(true)
  })
})
