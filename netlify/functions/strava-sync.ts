/**
 * Rapatrie les nouvelles activités Strava dans la table `activities`.
 *
 *   POST /api/strava-sync            → depuis la dernière synchro
 *   POST /api/strava-sync { days:90 } → force une fenêtre en jours
 *   En-tête : Authorization: Bearer <jeton Supabase de l'utilisateur>
 *
 * Le jeton d'accès Strava expire toutes les six heures : la fonction le
 * rafraîchit d'elle-même à partir du `refresh_token` quand c'est nécessaire.
 */
import type { Context } from '@netlify/functions'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

interface StravaActivity {
  id: number
  name: string
  sport_type: string
  type: string
  start_date_local: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain?: number
  average_heartrate?: number
  max_heartrate?: number
  average_watts?: number
  suffer_score?: number
}

/** Renvoie un jeton d'accès valide, en le rafraîchissant si besoin. */
async function freshAccessToken(
  admin: SupabaseClient,
  userId: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const { data, error } = await admin
    .from('strava_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) throw new Error('Compte Strava non relié')

  // Marge d'une minute pour ne pas partir avec un jeton qui expire en vol.
  if (new Date(data.expires_at).getTime() - Date.now() > 60_000) return data.access_token

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: data.refresh_token,
    }),
  })
  if (!res.ok) throw new Error(`Rafraîchissement refusé par Strava (${res.status})`)

  const tok = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_at: number
  }

  await admin
    .from('strava_tokens')
    .update({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: new Date(tok.expires_at * 1000).toISOString(),
    })
    .eq('user_id', userId)

  return tok.access_token
}

/** Normalise un sport Strava vers les cinq familles que connaît l'indice. */
function normalizeSport(a: StravaActivity): string {
  const s = a.sport_type || a.type
  if (/^(Run|TrailRun|VirtualRun)$/i.test(s)) return 'Run'
  if (/^(Ride|VirtualRide|GravelRide|MountainBikeRide|EBikeRide)$/i.test(s)) return 'Ride'
  if (/^(WeightTraining|Workout|Crossfit)$/i.test(s)) return 'Weight'
  if (/^(Hike|Walk)$/i.test(s)) return 'Hike'
  if (/^(RockClimbing|Climbing)$/i.test(s)) return 'Climb'
  return s
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    STRAVA_CLIENT_ID,
    STRAVA_CLIENT_SECRET,
  } = process.env
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    return json({ error: "Variables d'environnement manquantes côté Netlify." }, 500)
  }

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!bearer) return json({ error: 'Jeton utilisateur absent' }, 401)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data: userData, error: userErr } = await admin.auth.getUser(bearer)
  if (userErr || !userData?.user) return json({ error: 'Jeton utilisateur invalide' }, 401)
  const userId = userData.user.id

  let days: number | undefined
  try {
    days = (await req.json())?.days
  } catch {
    /* corps vide : on repart de la dernière synchro */
  }

  let token: string
  try {
    token = await freshAccessToken(admin, userId, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET)
  } catch (e) {
    return json({ error: (e as Error).message }, 400)
  }

  // Point de départ : la dernière synchro, ou la fenêtre demandée, ou 90 jours.
  const { data: tokRow } = await admin
    .from('strava_tokens')
    .select('last_sync_at')
    .eq('user_id', userId)
    .single()

  const fallbackDays = days ?? 90
  const after = tokRow?.last_sync_at
    ? Math.floor(new Date(tokRow.last_sync_at).getTime() / 1000) - 3 * 86400 // recouvrement de 3 j
    : Math.floor((Date.now() - fallbackDays * 86400_000) / 1000)

  const collected: StravaActivity[] = []
  for (let page = 1; page <= 5; page++) {
    const url = new URL('https://www.strava.com/api/v3/athlete/activities')
    url.searchParams.set('after', String(after))
    url.searchParams.set('per_page', '100')
    url.searchParams.set('page', String(page))

    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
    if (res.status === 429) {
      return json({ error: 'Quota Strava atteint, réessaie dans un quart d’heure.' }, 429)
    }
    if (!res.ok) {
      return json({ error: `Strava a répondu ${res.status}` }, 502)
    }
    const batch = (await res.json()) as StravaActivity[]
    collected.push(...batch)
    if (batch.length < 100) break
  }

  const rows = collected.map((a) => ({
    user_id: userId,
    source: 'strava',
    external_id: String(a.id),
    day: a.start_date_local.slice(0, 10),
    started_at: a.start_date_local,
    sport: normalizeSport(a),
    name: a.name,
    distance_m: a.distance ?? 0,
    moving_s: a.moving_time ?? 0,
    elapsed_s: a.elapsed_time ?? null,
    elevation_m: a.total_elevation_gain ?? null,
    avg_hr: a.average_heartrate ?? null,
    max_hr: a.max_heartrate ?? null,
    avg_watts: a.average_watts ?? null,
    relative_effort: a.suffer_score ?? null,
  }))

  if (rows.length) {
    const { error } = await admin
      .from('activities')
      .upsert(rows, { onConflict: 'user_id,source,external_id' })
    if (error) return json({ error: 'Écriture impossible', detail: error.message }, 500)
  }

  await admin
    .from('strava_tokens')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('user_id', userId)

  return json({ ok: true, imported: rows.length })
}
