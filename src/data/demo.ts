/**
 * Jeu de démonstration, pour faire tourner l'app sans compte.
 *
 * Aucune donnée de Mathieu ici : le carnet embarqué (`notion-seed.json`) est
 * son vrai suivi de tendinopathie, il n'a rien à faire sous les yeux d'un
 * visiteur. Ces valeurs décrivent un coureur fictif, plausible mais inventé.
 *
 * Tout est calculé par rapport au jour d'ouverture et par un tirage
 * déterministe : la démo raconte la même histoire à chaque visite, et elle
 * reste cohérente quelle que soit la date à laquelle on l'ouvre.
 */
import planJson from './plan.json'
import type { Plan, SessionType } from './types'
import type { DailyLogRow, FeedbackRow } from '../lib/buildPain'
import type { ActivityRow } from '../lib/load'
import { slotsParJour } from '../lib/overrides'
import { addDays } from '../lib/dates'
import { familleDe } from '../lib/insights'

const plan = planJson as unknown as Plan

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function tirage(graine: number): () => number {
  let a = graine
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Arrondit au demi-point, comme les curseurs de saisie. */
const demi = (v: number) => Math.round(v * 2) / 2

const HISTORIQUE_JOURS = 75

export interface JeuDemo {
  logs: DailyLogRow[]
  feedback: FeedbackRow[]
  activities: ActivityRow[]
}

/**
 * Construit le jeu complet à partir du jour courant.
 *
 * La douleur suit une trame lente — une gêne qui monte vers le milieu de la
 * période puis se calme — plutôt qu'un bruit blanc : un carnet crédible a une
 * histoire, et c'est ce que l'indice de charge sert à lire.
 */
export function construireDemo(now: string): JeuDemo {
  const rnd = tirage(20260810)

  const logs: DailyLogRow[] = []
  for (let k = HISTORIQUE_JOURS; k >= 0; k--) {
    const day = addDays(now, -k)
    // Vague sur la période : creux au début, pic aux deux tiers, retour au calme.
    const phase = (HISTORIQUE_JOURS - k) / HISTORIQUE_JOURS
    const vague = Math.sin(phase * Math.PI * 1.15) * 1.6

    const reveil = Math.max(0, Math.min(6, demi(0.6 + vague + (rnd() - 0.5))))
    const soir = Math.max(0, Math.min(7, demi(1.1 + vague * 1.2 + (rnd() - 0.5) * 1.4)))

    logs.push({
      day,
      pain_wake: reveil,
      pain_effort: null,
      pain_evening: soir,
      // Protocole tenu trois jours sur quatre : une observance parfaite ne
      // ressemblerait à aucun carnet réel.
      eccentric: rnd() > 0.28,
      icing: rnd() > 0.7,
      jumps: rnd() > 0.6,
      hydration_l: demi(1.2 + rnd() * 1.4),
    })
  }

  // Ressentis des séances déjà passées du plan. Le RPE suit le type de séance,
  // la douleur suit le carnet du jour : les deux courbes de l'écran Suivi
  // doivent se répondre, pas diverger.
  const douleurDuJour = new Map(logs.map((l) => [l.day, l.pain_evening ?? 0]))
  const feedback: FeedbackRow[] = []
  const activities: ActivityRow[] = []

  const RPE_TYPE: Partial<Record<SessionType, number>> = {
    long: 7,
    ef: 4,
    inter: 9,
    tempo: 8,
    test: 9,
    course: 8,
    race: 10,
    velo: 4,
    'muscu-bas': 6,
    'muscu-haut': 5,
    escalade: 7,
  }

  for (const w of plan.weeks) {
    const slots = slotsParJour(w.sessions)
    w.sessions.forEach((s, i) => {
      const day = addDays(w.monday, s.day)
      // Rien avant le début de l'historique, rien après-hier : la démo laisse
      // volontairement le jour même à noter, c'est l'état le plus parlant.
      if (day >= now || day < addDays(now, -HISTORIQUE_JOURS)) return
      if (!s.feedback) return
      // Une séance sur douze reste non notée : le tag « en retard » existe et
      // doit pouvoir se montrer.
      if (rnd() < 0.08) return

      const base = RPE_TYPE[s.type] ?? 5
      const rpe = Math.max(1, Math.min(10, Math.round(base + (rnd() - 0.5) * 2)))
      const pain = Math.max(0, Math.min(8, demi((douleurDuJour.get(day) ?? 1) * 0.8 + (rnd() - 0.4))))

      feedback.push({
        week: w.n,
        day_index: s.day,
        slot: slots[i],
        day,
        session_type: s.type,
        pain,
        rpe,
        // Le vélo n'a pas de distance au plan : on en invente une plausible
        // pour que le graphique de volume ait une série vélo à empiler.
        distance_km: s.dist ?? (s.type === 'velo' ? Math.round(18 + rnd() * 14) : null),
        note: null,
      })
    })
  }

  // Un historique de course avant le plan, pour que la charge chronique ait
  // de quoi se calculer et que les graphiques ne démarrent pas à vide.
  for (let k = HISTORIQUE_JOURS + 60; k > HISTORIQUE_JOURS; k--) {
    const day = addDays(now, -k)
    const d = new Date(`${day}T12:00:00Z`).getUTCDay()
    if (d === 0 || d === 3) continue // deux jours sans course par semaine
    const km = d === 1 ? 16 + rnd() * 8 : 7 + rnd() * 5
    activities.push({
      day,
      sport: 'Run',
      name: null,
      distance_m: Math.round(km * 1000),
      moving_s: Math.round(km * (300 + rnd() * 40)),
      elevation_m: Math.round(rnd() * 120),
      relative_effort: Math.round(km * 4),
    })
  }

  return { logs, feedback, activities }
}

/** Ce que la démo raconte, pour la bannière de l'app. */
export const NOTE_DEMO =
  'Démonstration : coureur fictif, données inventées. Les saisies ne sont pas conservées.'

/** Vrai quand `familleDe` compte la séance — utilisé par les tests de cohérence. */
export const compteDansLeVolume = (t: SessionType) => familleDe(t) != null
