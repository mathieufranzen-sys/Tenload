/**
 * Authentification : lien magique, ou code à six chiffres.
 *
 * Trois états seulement, parce que ce sont les trois qui existent vraiment :
 * l'app tourne sans configuration Supabase (mode instantanés), elle est
 * configurée mais personne n'est connecté, ou une session est ouverte.
 *
 * Le code existe pour une raison précise : sur iOS, une PWA installée sur
 * l'écran d'accueil a son propre stockage, séparé de Safari. Un lien magique
 * ouvre forcément un navigateur, donc il ouvre une session PARTOUT sauf dans
 * l'app installée, qui reste sur l'écran de connexion. Le code, lui, se saisit
 * sans jamais quitter l'app.
 */
import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isConfigured, supabase } from '../lib/supabase'

export type AuthState = 'unconfigured' | 'loading' | 'signedOut' | 'signedIn'

export interface Auth {
  state: AuthState
  user: User | null
  session: Session | null
  /** Envoie le lien et le code. Renvoie un message d'erreur, ou null si c'est parti. */
  envoyerLien: (email: string) => Promise<string | null>
  /** Valide le code à six chiffres reçu par mail. Même retour. */
  verifierCode: (email: string, code: string) => Promise<string | null>
  deconnexion: () => Promise<void>
}

/**
 * Traduit l'erreur d'envoi. Supabase répond en anglais et distingue deux
 * limites que l'ancien message confondait sous un vague « attends une minute » :
 *
 *  - un délai de sécurité par adresse, de l'ordre d'une minute, dont Supabase
 *    donne le nombre de secondes restantes ;
 *  - un quota horaire d'e-mails, qui est celui du serveur SMTP intégré. Sur le
 *    SMTP partagé de Supabase il tombe à quelques envois par heure, et aucune
 *    attente d'une minute n'y change quoi que ce soit. Le dire évite de
 *    marteler le bouton pour rien.
 */
export function messageErreur(brut: string): string {
  const secondes = brut.match(/after (\d+) seconds?/i)
  if (secondes) {
    const n = Number(secondes[1])
    return `Encore ${n} seconde${n > 1 ? 's' : ''} avant de pouvoir redemander un lien.`
  }
  if (/email rate limit|over_email_send_rate_limit/i.test(brut)) {
    return "Quota d'e-mails atteint pour cette heure. C'est la limite du serveur d'envoi, pas ton adresse : attendre une minute n'y suffira pas."
  }
  if (/rate limit|too many|429/i.test(brut)) {
    return 'Trop de tentatives rapprochées. Laisse passer une minute.'
  }
  // Supabase répond « Token has expired or is invalid » pour les deux cas à la
  // fois. Annoncer « expiré » tout court envoie chercher un problème d'horloge
  // alors que la cause la plus fréquente est un code déjà consommé, par un clic
  // sur le lien du même mail.
  if (/expired or is invalid|expired_token|otp_expired/i.test(brut)) {
    return 'Code invalide ou expiré. Si tu as cliqué le lien du mail, le code du même mail est consommé : redemande-en un.'
  }
  if (/expired/i.test(brut)) return 'Ce code a expiré. Demande-en un nouveau.'
  if (/invalid.*(token|otp)|otp.*invalid/i.test(brut))
    return 'Code incorrect. Vérifie les six chiffres du dernier mail reçu.'
  if (/invalid|malformed/i.test(brut)) return "Cette adresse n'est pas valide."
  return "L'envoi a échoué. Vérifie l'adresse et réessaie."
}

export function useAuth(): Auth {
  const [session, setSession] = useState<Session | null>(null)
  // On démarre en `loading` : Supabase relit la session persistée de façon
  // asynchrone, et afficher l'écran de connexion pendant ce temps ferait
  // clignoter la connexion à chaque rechargement.
  const [state, setState] = useState<AuthState>(isConfigured ? 'loading' : 'unconfigured')

  useEffect(() => {
    if (!supabase) return
    let vivant = true

    supabase.auth.getSession().then(({ data }) => {
      if (!vivant) return
      setSession(data.session)
      setState(data.session ? 'signedIn' : 'signedOut')
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setState(s ? 'signedIn' : 'signedOut')
    })

    return () => {
      vivant = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const envoyerLien = useCallback(async (email: string): Promise<string | null> => {
    if (!supabase) return "Supabase n'est pas configuré."
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    if (!error) return null
    return messageErreur(error.message)
  }, [])

  /**
   * Deux types essayés dans l'ordre.
   *
   * `signInWithOtp` émet un jeton de type `magiclink` pour un compte existant
   * et `signup` pour un compte neuf ; `email` couvre les deux selon les
   * versions. Vérifier avec le mauvais type renvoie exactement la même erreur
   * qu'un code périmé, « Token has expired or is invalid », ce qui rend le
   * diagnostic impossible depuis l'écran. Essayer les deux coûte un aller-retour
   * et supprime toute une classe de faux « code expiré ».
   */
  const verifierCode = useCallback(async (email: string, code: string): Promise<string | null> => {
    if (!supabase) return "Supabase n'est pas configuré."
    const adresse = email.trim()
    const token = code.replace(/\D/g, '')

    const types = ['email', 'magiclink'] as const
    let derniere = ''
    for (const type of types) {
      const { error } = await supabase.auth.verifyOtp({ email: adresse, token, type })
      if (!error) return null
      derniere = error.message
      // Un code réellement faux ou déjà consommé le sera pour les deux types :
      // seule l'erreur ambiguë vaut la peine d'être retentée.
      if (!/expired or is invalid/i.test(derniere)) break
    }
    return messageErreur(derniere)
  }, [])

  const deconnexion = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  return { state, user: session?.user ?? null, session, envoyerLien, verifierCode, deconnexion }
}
