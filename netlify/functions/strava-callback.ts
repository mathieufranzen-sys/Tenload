/**
 * Échange le code d'autorisation Strava contre des jetons, et les range en base.
 *
 * Pourquoi une fonction serveur : le `client_secret` Strava ne doit JAMAIS se
 * trouver dans le code du navigateur, sinon n'importe qui peut l'y lire et
 * agir au nom de l'application. Cette fonction est le seul endroit qui le
 * manipule, et elle écrit dans `strava_tokens`, table volontairement privée
 * de toute politique RLS — donc inaccessible depuis le front.
 *
 * Appelée par le front après le retour de Strava :
 *   POST /api/strava-callback  { code }
 *   En-tête : Authorization: Bearer <jeton Supabase de l'utilisateur>
 */
import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  scope?: string
  athlete?: { id: number }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    STRAVA_CLIENT_ID,
    STRAVA_CLIENT_SECRET,
  } = process.env

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    return json(
      { error: "Variables d'environnement manquantes côté Netlify. Voir l'étape 5 du README." },
      500,
    )
  }

  // Qui appelle ? On vérifie le jeton Supabase plutôt que de faire confiance
  // à un identifiant envoyé par le client.
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!bearer) return json({ error: 'Jeton utilisateur absent' }, 401)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data: userData, error: userErr } = await admin.auth.getUser(bearer)
  if (userErr || !userData?.user) return json({ error: 'Jeton utilisateur invalide' }, 401)
  const userId = userData.user.id

  let code: string | undefined
  try {
    code = (await req.json())?.code
  } catch {
    return json({ error: 'Corps de requête illisible' }, 400)
  }
  if (!code) return json({ error: 'Paramètre `code` absent' }, 400)

  // Échange auprès de Strava.
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    return json({ error: 'Strava a refusé le code', detail: detail.slice(0, 400) }, 502)
  }

  const tok = (await res.json()) as StravaTokenResponse

  const { error } = await admin.from('strava_tokens').upsert(
    {
      user_id: userId,
      athlete_id: tok.athlete?.id ?? null,
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: new Date(tok.expires_at * 1000).toISOString(),
      scope: tok.scope ?? null,
    },
    { onConflict: 'user_id' },
  )

  if (error) return json({ error: 'Écriture des jetons impossible', detail: error.message }, 500)

  // On ne renvoie jamais les jetons au navigateur.
  return json({ ok: true, athleteId: tok.athlete?.id ?? null })
}
