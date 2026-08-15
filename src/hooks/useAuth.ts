/**
 * Authentification par lien magique.
 *
 * Trois états seulement, parce que ce sont les trois qui existent vraiment :
 * l'app tourne sans configuration Supabase (mode instantanés), elle est
 * configurée mais personne n'est connecté, ou une session est ouverte.
 */
import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isConfigured, supabase } from '../lib/supabase'

export type AuthState = 'unconfigured' | 'loading' | 'signedOut' | 'signedIn'

export interface Auth {
  state: AuthState
  user: User | null
  session: Session | null
  /** Envoie le lien de connexion. Renvoie un message d'erreur, ou null si c'est parti. */
  envoyerLien: (email: string) => Promise<string | null>
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

  const deconnexion = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  return { state, user: session?.user ?? null, session, envoyerLien, deconnexion }
}
