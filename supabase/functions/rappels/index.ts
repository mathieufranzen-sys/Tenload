/**
 * Les deux rappels du carnet, envoyés en push.
 *
 * Appelée toutes les heures par pg_cron (voir supabase/notifications.sql).
 * C'est elle, et non le cron, qui décide s'il est l'heure : pg_cron raisonne
 * en UTC, et un rappel calé sur UTC glisserait d'une heure deux fois par an.
 *
 * Toute la décision vit dans `logique.ts`, qui est testé. Ce fichier-ci ne
 * fait que lire la base et envoyer.
 *
 * Trois envois : 8 h la raideur, 23 h le point du soir, et le dimanche à 20 h
 * le bilan de la semaine.
 *
 * Déploiement :
 *   supabase functions deploy rappels
 *   supabase secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:…
 */
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  HEURE_BILAN,
  HEURE_MATIN,
  HEURE_SOIR,
  ajouterJours,
  estDimanche,
  messageBilan,
  messageDuMoment,
  momentParis,
  semaineDuPlan,
  type Message,
} from './logique.ts'

Deno.serve(async () => {
  const { heure, jour } = momentParis(new Date())
  const json = (corps: unknown) =>
    new Response(JSON.stringify(corps), { headers: { 'Content-Type': 'application/json' } })

  const bilan = heure === HEURE_BILAN && estDimanche(jour)
  if (heure !== HEURE_MATIN && heure !== HEURE_SOIR && !bilan) return json({ ignore: true, heure })

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@tenload.app',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: abonnements } = await db.from('push_subscriptions').select('*')
  if (!abonnements?.length) return json({ heure, jour, envoyes: 0 })

  let envoyes = 0
  let ignores = 0

  for (const ab of abonnements) {
    const message = bilan ? await donneesBilan(db, ab.user_id, jour) : await rappel(db, ab.user_id, heure, jour)
    if (!message) {
      ignores++
      continue
    }

    try {
      await webpush.sendNotification(
        { endpoint: ab.endpoint, keys: { p256dh: ab.p256dh, auth: ab.auth } },
        JSON.stringify({ ...message, url: '/' }),
      )
      envoyes++
    } catch (e) {
      // 404 et 410 : l'appareil s'est désabonné sans nous le dire. La ligne
      // part, sinon la fonction retenterait cet endpoint mort toutes les heures.
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) {
        await db.from('push_subscriptions').delete().eq('endpoint', ab.endpoint)
      }
    }
  }

  return json({ heure, jour, envoyes, ignores })
})

type Base = ReturnType<typeof createClient>

async function rappel(db: Base, userId: string, heure: number, jour: string): Promise<Message | null> {
  const { data: journal } = await db
    .from('daily_logs')
    .select('pain_wake, pain_evening')
    .eq('user_id', userId)
    .eq('day', jour)
    .maybeSingle()

  // Le compte suffit : on cherche s'il existe un ressenti aujourd'hui, pas
  // lequel. `head: true` évite de rapatrier des lignes pour les jeter.
  const { count } = await db
    .from('session_feedback')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('day', jour)

  return messageDuMoment(heure, jour, journal ?? null, (count ?? 0) > 0)
}

async function donneesBilan(db: Base, userId: string, jour: string): Promise<Message | null> {
  const lundi = ajouterJours(jour, -6)
  const { count: notees } = await db
    .from('session_feedback')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('day', lundi)
    .lte('day', jour)

  // Les écarts sont clés sur la semaine du plan : c'est le plus proche qu'on
  // ait d'une semaine calendaire sans charger le plan ici.
  const { count: sautees } = await db
    .from('plan_overrides')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('week', semaineDuPlan(jour) ?? 0)
    .eq('patch->>skipped', 'true')

  const { data: releves } = await db
    .from('daily_logs')
    .select('day, pain_wake, eccentric')
    .eq('user_id', userId)
    .gte('day', ajouterJours(lundi, -7))
    .lte('day', jour)

  return messageBilan(jour, { notees: notees ?? 0, sautees: sautees ?? 0, releves: releves ?? [] })
}
