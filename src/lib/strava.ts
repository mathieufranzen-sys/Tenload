/**
 * Connexion Strava : autorisation OAuth, échange du code, synchro des
 * activités. Le `client_secret` ne quitte jamais le serveur — voir
 * netlify/functions/strava-callback.ts. Ce module ne manipule que ce qui est
 * sûr côté navigateur : l'identifiant public de l'app et le jeton Supabase de
 * la session en cours.
 *
 * L'état « connecté » vit dans `strava_tokens`, une table sans aucune
 * politique RLS — donc illisible depuis le navigateur, par construction. On ne
 * peut pas interroger « suis-je connecté ? » directement : on retient plutôt,
 * sur cet appareil, la dernière connexion et la dernière synchro réussies.
 * Ce n'est qu'un affichage ; la vérité vit côté serveur.
 */
import { accessToken } from './supabase'

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID as string | undefined

/** false si aucune clé publique Strava n'est configurée : le bouton reste inactif. */
export const stravaConfigure = Boolean(CLIENT_ID)

const CLE_CONNECTE = 'tendo.strava-connecte'
const CLE_DERNIERE_SYNC = 'tendo.strava-derniere-sync'

/** Lien vers la page d'autorisation Strava, avec retour sur l'app elle-même. */
export function urlAutorisation(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID ?? '',
    redirect_uri: `${window.location.origin}/`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

interface Resultat {
  ok: boolean
  erreur?: string
}

async function appeler(chemin: string): Promise<{ ok: boolean; erreur?: string; corps: Record<string, unknown> }> {
  const jeton = await accessToken()
  if (!jeton) return { ok: false, erreur: 'Pas de session.', corps: {} }
  try {
    const res = await fetch(chemin, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${jeton}` },
      body: '{}',
    })
    const corps = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, erreur: (corps.error as string) ?? `Erreur ${res.status}`, corps }
    return { ok: true, corps }
  } catch {
    return { ok: false, erreur: 'Réseau indisponible.', corps: {} }
  }
}

/** Échange le code reçu de Strava contre des jetons, rangés côté serveur. */
export async function echangerCode(code: string): Promise<Resultat> {
  const jeton = await accessToken()
  if (!jeton) return { ok: false, erreur: 'Pas de session.' }
  try {
    const res = await fetch('/api/strava-callback', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${jeton}` },
      body: JSON.stringify({ code }),
    })
    const corps = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, erreur: corps.error ?? `Erreur ${res.status}` }
    marquer(CLE_CONNECTE)
    return { ok: true }
  } catch {
    return { ok: false, erreur: 'Réseau indisponible.' }
  }
}

/** Rapatrie les nouvelles activités depuis la dernière synchro. */
export async function synchroniser(): Promise<Resultat & { importees?: number }> {
  const r = await appeler('/api/strava-sync')
  if (r.ok) marquer(CLE_DERNIERE_SYNC)
  return { ok: r.ok, erreur: r.erreur, importees: r.corps.imported as number | undefined }
}

function marquer(cle: string): void {
  try {
    localStorage.setItem(cle, new Date().toISOString())
  } catch {
    // Stockage indisponible : tant pis, ce n'est qu'un affichage.
  }
}

const lire = (cle: string): string | null => {
  try {
    return localStorage.getItem(cle)
  } catch {
    return null
  }
}

export const dejaConnecte = (): boolean => lire(CLE_CONNECTE) !== null
export const derniereSync = (): string | null => lire(CLE_DERNIERE_SYNC)
