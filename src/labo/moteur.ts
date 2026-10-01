/**
 * Le calcul de l'app, rejoué hors écran sur un jeu du laboratoire.
 *
 * Même chaîne que `Coquille` (App.tsx), dans le même ordre : ressentis et
 * carnet vers la douleur, écarts et ressentis vers la charge, puis l'indice et
 * ses effets. Le test des profils passe par ici, et c'est ce qui garantit que
 * « le profil 2 est jaune le 27 septembre » est un fait du modèle et non une
 * valeur recopiée à la main.
 */
import planJson from '../data/plan.json'
import type { Plan } from '../data/types'
import { buildPain } from '../lib/buildPain'
import { buildLoad, joursAttestes } from '../lib/load'
import { indexerEcarts } from '../lib/overrides'
import { adapt, construireContexte, formeProjetee, type AdaptResult } from '../lib/adapt'
import type { JeuLabo } from './scenarios'

const plan = planJson as unknown as Plan

/**
 * Les entrées du calcul, telles que l'app les construit : douleur, écarts,
 * contexte du plan, charge et jours attestés. Exposées pour la batterie de
 * scénarios (`batterie.ts`), qui doit pouvoir modifier une charge ou une
 * douleur et relancer l'indice sans repasser par toute la chaîne.
 */
export function entrees(jeu: JeuLabo, now: string) {
  const pain = buildPain({ logs: jeu.logs, feedback: jeu.feedback, bascule: '1970-01-01' })
  const completed = new Set(jeu.feedback.map((f) => `${f.week}-${f.day_index}-${f.slot}`))
  const ecarts = indexerEcarts(jeu.ecarts)
  const contexte = construireContexte(plan.weeks, jeu.feedback, pain, now, ecarts)
  const entree = {
    weeks: plan.weeks,
    activities: jeu.activities,
    completed,
    today: now,
    ecarts,
    feedback: jeu.feedback,
    projection: (s: Parameters<typeof formeProjetee>[0], prevue: Parameters<typeof formeProjetee>[1], cle: string, day: string) =>
      formeProjetee(s, prevue, cle, day, now, contexte),
  }
  return { pain, ecarts, contexte, load: buildLoad(entree), attestes: joursAttestes(entree) }
}

export function calculer(jeu: JeuLabo, now: string): AdaptResult {
  const { pain, load, attestes } = entrees(jeu, now)
  return adapt(load, pain, jeu.feedback, now, attestes)
}
