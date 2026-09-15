/**
 * Les rappels du carnet, en notifications web.
 *
 * Deux rappels seulement, et tous deux réparent un angle mort du modèle
 * plutôt que d'ajouter du bruit :
 *
 * - **8 h, la raideur au réveil.** Elle pèse 45 % du terme de douleur, et au
 *   bout de trois jours sans saisie `painInconnue` passe à vrai : l'app cesse
 *   de savoir et bloque toute hausse de volume. C'est la seule mesure dont
 *   l'absence casse le produit.
 * - **23 h, la fin de journée.** Douleur du soir, plus l'effort et la douleur
 *   de la séance si elle n'a pas été notée.
 *
 * Ce qui est envoyé, quand, et à qui vit dans l'Edge Function `rappels` :
 * un navigateur endormi ne peut pas se réveiller tout seul. Ici on ne fait que
 * demander la permission, s'abonner, et ranger l'abonnement en base.
 *
 * **Sur iPhone, rien de tout cela ne marche depuis un onglet Safari.** La PWA
 * doit être installée sur l'écran d'accueil, et la permission demandée depuis
 * un geste de l'utilisateur à l'intérieur de l'app installée.
 */
import { supabase } from './supabase'

/**
 * La clé publique VAPID, qui identifie l'expéditeur auprès du service de push
 * du navigateur. Publique par construction : elle part dans chaque abonnement.
 * La clé privée, elle, ne vit que dans les secrets de l'Edge Function.
 */
const CLE_PUBLIQUE = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type EtatRappels = 'indisponible' | 'refuse' | 'inactif' | 'actif'

/**
 * La clé est lue au BUILD, pas à l'exécution : absente des variables de
 * l'hébergeur, elle manque au site en ligne même si `.env.local` la porte.
 * `indisponible` confondait ce cas avec un navigateur incapable, et les deux
 * ne se réparent pas du tout au même endroit.
 */
export const cleConfiguree = (): boolean => Boolean(CLE_PUBLIQUE)

/**
 * `Notification` existe dans Safari iOS même hors PWA installée, mais
 * `serviceWorker` et `PushManager` ne suffisent pas non plus à garantir la
 * délivrance : c'est le mode standalone qui décide. On teste les trois.
 */
export function estInstallee(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari iOS n'implémente pas display-mode et expose ce booléen à la place.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function estSupporte(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(CLE_PUBLIQUE)
  )
}

/**
 * La clé VAPID voyage en base64url ; `PushManager.subscribe` veut des octets.
 * Le remplacement des deux caractères propres à base64url et le rembourrage
 * sont les deux seules différences avec un base64 ordinaire.
 */
export function base64UrlVersOctets(base64: string): Uint8Array {
  const rembourrage = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalise = (base64 + rembourrage).replace(/-/g, '+').replace(/_/g, '/')
  const brut = atob(normalise)
  const octets = new Uint8Array(brut.length)
  for (let i = 0; i < brut.length; i++) octets[i] = brut.charCodeAt(i)
  return octets
}

/** Les clés d'un abonnement, mises à plat pour la base. */
export interface AbonnementPlat {
  endpoint: string
  p256dh: string
  auth: string
}

/** `PushSubscription.toJSON()` typé, plutôt qu'un accès direct aux getters. */
export function aplatir(sub: PushSubscription): AbonnementPlat | null {
  const brut = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  if (!brut.endpoint || !brut.keys?.p256dh || !brut.keys?.auth) return null
  return { endpoint: brut.endpoint, p256dh: brut.keys.p256dh, auth: brut.keys.auth }
}

async function abonnementCourant(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function etatRappels(): Promise<EtatRappels> {
  if (!estSupporte()) return 'indisponible'
  if (Notification.permission === 'denied') return 'refuse'
  const sub = await abonnementCourant()
  return sub ? 'actif' : 'inactif'
}

/**
 * Doit être appelé depuis un geste de l'utilisateur : iOS refuse
 * `requestPermission` autrement, sans message d'erreur exploitable.
 */
export async function activerRappels(userId: string): Promise<EtatRappels> {
  if (!estSupporte()) return 'indisponible'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'refuse' : 'inactif'

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      // Sans `userVisibleOnly`, Chrome refuse l'abonnement. C'est une promesse :
      // chaque push envoyé affichera bien une notification.
      userVisibleOnly: true,
      applicationServerKey: base64UrlVersOctets(CLE_PUBLIQUE!) as BufferSource,
    }))

  const plat = aplatir(sub)
  if (!plat || !supabase) return 'inactif'

  // Upsert sur l'endpoint, comme toutes les écritures de l'app : réactiver
  // deux fois de suite ne doit pas créer deux abonnements pour un seul appareil.
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: plat.endpoint,
      p256dh: plat.p256dh,
      auth: plat.auth,
      user_agent: navigator.userAgent.slice(0, 300),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )
  if (error) return 'inactif'
  return 'actif'
}

export async function desactiverRappels(): Promise<EtatRappels> {
  const sub = await abonnementCourant()
  if (!sub) return 'inactif'
  const plat = aplatir(sub)
  await sub.unsubscribe()
  // La ligne part aussi : un endpoint désabonné renvoie 410 à l'envoi, autant
  // ne pas laisser la fonction le découvrir chaque matin.
  if (plat && supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', plat.endpoint)
  return 'inactif'
}
