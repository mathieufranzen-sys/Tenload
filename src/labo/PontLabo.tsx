/**
 * Le pont entre un téléphone du laboratoire et le banc d'essai.
 *
 * Il ne dessine rien. Dans un sens, il envoie au banc l'état du jour simulé :
 * l'indice, sa bande, le carnet et les séances du jour, pour que les commandes
 * du banc affichent la vraie valeur et non la dernière qu'on a cliquée. Dans
 * l'autre, il reçoit les commandes rapides et les écrit par les MÊMES chemins
 * que l'app : le carnet par `enregistrerLog`, une séance faite par un
 * ressenti, une séance sautée par un écart. Rien ici ne calcule la charge.
 */
import { useEffect, useRef } from 'react'
import planJson from '../data/plan.json'
import type { Plan } from '../data/types'
import type { ContexteLabo } from '../App'
import { useJournal } from '../hooks/DataProvider'
import { seancesDeLaSemaine, type SeancePlanifiee } from '../lib/adapt'
import { addDays } from '../lib/dates'
import { RPE_ATTENDU } from '../lib/forme'
import { SOURCE_LABO, type EtatLabo } from './messages'

const plan = planJson as unknown as Plan

export function PontLabo({ cle, ctx }: { cle: string; ctx: ContexteLabo }) {
  const { ligne, enregistrerLog } = useJournal()
  const { now, A, ecarts, contexte, feedback, onSaveFeedback, onSaveEcart } = ctx

  const semaine = plan.weeks.find((w) => now >= w.monday && now <= addDays(w.monday, 6))
  const duJour: SeancePlanifiee[] = semaine
    ? seancesDeLaSemaine(plan.weeks, semaine, now, A.byDate, ecarts, contexte).filter(
        (x) => x.day === now && x.s.type !== 'repos',
      )
    : []
  const notee = (x: SeancePlanifiee) =>
    feedback.some((f) => f.week === x.semaineOrigine && f.day_index === x.jourOrigine && f.slot === x.slot)
  const log = ligne(now)

  // L'état part à chaque rendu : c'est bon marché, et c'est la seule façon
  // d'être sûr que le banc ne montre jamais une valeur périmée.
  useEffect(() => {
    const etat: EtatLabo = {
      source: SOURCE_LABO,
      type: 'etat',
      cle,
      date: now,
      idx: A.idx,
      bande: A.band.key,
      douleurInconnue: A.detail.painInconnue,
      chargeInconnue: A.detail.chargeInconnue,
      reveil: log?.pain_wake ?? null,
      soir: log?.pain_evening ?? null,
      excentrique: log?.eccentric ?? false,
      seances: duJour.map((x) => ({
        titre: x.s.title,
        etat: x.s.saute ? 'sautee' : notee(x) ? 'faite' : 'afaire',
      })),
    }
    window.parent?.postMessage(etat, window.location.origin)
  })

  // Le gestionnaire lit toujours le dernier rendu : les séances du jour
  // changent dès qu'une saisie fait bouger l'indice.
  const surCommande = useRef<(m: Record<string, unknown>) => void>(() => {})
  surCommande.current = (m) => {
    if (m.type === 'saisie') {
      const valeur = m.valeur === null ? null : Number(m.valeur)
      enregistrerLog(now, m.champ === 'reveil' ? { pain_wake: valeur } : { pain_evening: valeur })
    }
    if (m.type === 'excentrique') enregistrerLog(now, { eccentric: Boolean(m.valeur) })
    if (m.type === 'seances') {
      // Une séance faite porte la douleur de la journée, un demi-point
      // dessous, et l'effort attendu pour son type : la convention des
      // scénarios. Le détail se règle ensuite dans la feuille de séance.
      const douleur = log?.pain_evening ?? log?.pain_wake ?? 0
      for (const x of duJour) {
        const patch = x.ecart?.patch ?? {}
        if (m.etat === 'sautees' && !notee(x)) {
          onSaveEcart?.(x.semaineOrigine, x.jourOrigine, x.slot, { ...patch, skipped: true }, 'Laboratoire')
        }
        if (m.etat === 'faites') {
          if (x.s.saute) onSaveEcart?.(x.semaineOrigine, x.jourOrigine, x.slot, { ...patch, skipped: undefined })
          onSaveFeedback?.({
            week: x.semaineOrigine,
            day_index: x.jourOrigine,
            slot: x.slot,
            day: now,
            session_type: x.s.type,
            pain: Math.max(0, Math.round((douleur - 0.5) * 2) / 2),
            rpe: RPE_ATTENDU[x.s.type] ?? 5,
            distance_km: x.s.dist ?? null,
            note: null,
          })
        }
      }
    }
  }

  useEffect(() => {
    const surMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.source !== SOURCE_LABO) return
      surCommande.current(e.data)
    }
    window.addEventListener('message', surMessage)
    return () => window.removeEventListener('message', surMessage)
  }, [])

  return null
}
