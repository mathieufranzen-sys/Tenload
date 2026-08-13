/**
 * Traduit les lignes Supabase en `PainMap`, l'entrée du modèle d'indice.
 *
 * Règle posée par Mathieu : le carnet Notion sert d'historique, mais tout ce qui
 * arrive à partir de la mise en service vient des saisies faites dans l'app. Il
 * n'y a donc qu'une seule source de vérité, la table `daily_logs` — le carnet y
 * a été importé une fois pour toutes par supabase/seed.sql.
 *
 * Deux nuances subsistent, et elles sont datées :
 *
 * 1. La douleur à l'effort. À partir de la bascule, elle est le maximum des
 *    ressentis de séance du jour, parce que c'est là qu'elle se saisit vraiment.
 *    La colonne `pain_effort` ne sert plus que de repli, pour les jours
 *    d'historique et pour une saisie directe sans séance rattachée.
 * 2. Le protocole excentrique. Avant la bascule il était deviné du nom des
 *    activités Strava, faute de point de saisie. Depuis, la case cochée dans
 *    l'app fait foi, y compris quand elle est décochée : un Stanish fait dans le
 *    salon n'apparaît dans aucune activité.
 */
import type { PainDay, PainMap } from './tendonIndex'

/** Une ligne de `daily_logs`. Les numériques arrivent en `number` via PostgREST. */
export interface DailyLogRow {
  day: string
  pain_wake: number | null
  pain_effort: number | null
  pain_evening: number | null
  eccentric: boolean
  icing: boolean
  jumps: boolean
  stretching?: boolean
  hydration_l?: number | null
}

/** Une ligne de `session_feedback`. */
export interface FeedbackRow {
  week: number
  day_index: number
  slot: number
  day: string
  session_type: string
  pain: number
  rpe: number
  distance_km?: number | null
  note?: string | null
}

export interface BuildPainInput {
  logs: DailyLogRow[]
  feedback?: FeedbackRow[]
  /**
   * Premier jour où l'app est la source des saisies. Avant cette date, les
   * lignes viennent de l'import du carnet et se lisent telles quelles.
   */
  bascule?: string
  /** Repli d'historique : jours où une activité trahit un protocole excentrique. */
  eccentriqueDevine?: Set<string>
}

/** Date de mise en service : première ouverture de l'app avec Supabase branché. */
export const BASCULE_APP = '2026-08-11'

export function buildPain({
  logs,
  feedback = [],
  bascule = BASCULE_APP,
  eccentriqueDevine,
}: BuildPainInput): PainMap {
  // Maximum des ressentis de séance par jour : deux séances dans la journée, on
  // retient la plus douloureuse. Une moyenne lisserait précisément le signal
  // qu'on cherche à voir.
  const effortSeance: Record<string, number> = {}
  for (const f of feedback) {
    const v = Number(f.pain)
    if (!Number.isFinite(v)) continue
    const actuel = effortSeance[f.day]
    if (actuel === undefined || v > actuel) effortSeance[f.day] = v
  }

  const pain: PainMap = {}
  for (const l of logs) {
    const historique = l.day < bascule
    const direct = num(l.pain_effort)
    const seance = effortSeance[l.day]

    const jour: PainDay = {
      wake: num(l.pain_wake),
      evening: num(l.pain_evening),
      effort: historique ? direct : (seance ?? direct),
      icing: Boolean(l.icing),
      jumps: Boolean(l.jumps),
      eccentric: historique
        ? Boolean(l.eccentric) || Boolean(eccentriqueDevine?.has(l.day))
        : Boolean(l.eccentric),
    }
    pain[l.day] = jour
  }

  // Une séance notée un jour sans ligne de journal doit quand même compter :
  // sinon un ressenti saisi seul disparaît du modèle.
  for (const [day, v] of Object.entries(effortSeance)) {
    if (pain[day] || day < bascule) continue
    pain[day] = { wake: null, evening: null, effort: v }
  }

  return pain
}

/** PostgREST renvoie parfois les `numeric` en chaîne. */
function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
