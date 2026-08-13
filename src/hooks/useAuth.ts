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
    // Le message brut de Supabase est en anglais et parle de « OTP ».
    return /rate limit|too many/i.test(error.message)
      ? 'Trop de tentatives. Attends une minute avant de redemander un lien.'
      : "L'envoi a échoué. Vérifie l'adresse et réessaie."
  }, [])

  const deconnexion = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  return { state, user: session?.user ?? null, session, envoyerLien, deconnexion }
}
