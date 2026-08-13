/**
 * Client Supabase.
 *
 * La clé « anon » est publique par construction : c'est le Row Level Security
 * défini dans supabase/schema.sql qui protège les données, pas le secret de la
 * clé. Ne jamais mettre la clé de service ici — elle contourne RLS et n'a rien
 * à faire dans le navigateur.
 */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Les valeurs d'exemple de .env.example ressemblent assez à de vraies clés pour
 * que l'app se croie configurée et parte demander un lien magique à un domaine
 * qui n'existe pas. On les traite comme une absence de configuration.
 */
const gabarit = (v: string | undefined) =>
  !v || v.includes('xxxx') || v.startsWith('eyJhbGciOi...')

/** true quand les variables sont présentes ET renseignées. */
export const isConfigured = !gabarit(url) && !gabarit(anon)

export const supabase = isConfigured
  ? createClient(url as string, anon as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

/** Jeton de la session courante, à passer aux fonctions Netlify. */
export async function accessToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
