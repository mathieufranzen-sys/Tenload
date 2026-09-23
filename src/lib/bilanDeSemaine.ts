/**
 * Les faits d'un bilan de semaine, lus à une date donnée.
 *
 * Sorti de l'écran Aujourd'hui le 22 septembre 2026, quand Mathieu a demandé
 * à relire les bilans passés depuis Profil : le même calcul doit servir le
 * bilan du dimanche et celui d'une semaine d'août, sinon les deux finiraient
 * par ne plus dire la même chose de la même semaine.
 *
 * `ref` est le jour où le bilan se lit. Pour le bilan courant, c'est
 * aujourd'hui ; pour une semaine passée, le lundi qui la suit, c'est-à-dire
 * le jour où l'écran Aujourd'hui l'a montrée. Les compteurs (jours sans
 * douleur, série d'excentrique, échéances) se comptent depuis `ref`, jamais
 * depuis aujourd'hui : relire août ne doit pas parler de septembre.
 */
import type { Plan, Week } from '../data/types'
import type { SeancePlanifiee } from './adapt'
import { bilanSemaine, type BilanSemaine, type FaitsBilan, type SeanceBilan } from './bilan'
import type { FeedbackRow } from './buildPain'
import { addDays, daysBetween } from './dates'
import type { AjustementForme } from './forme'
import { slotsParJour } from './overrides'
import type { IndexBreakdown, PainMap } from './tendonIndex'

/** Le 10 km Hoka, l'objectif de l'automne. */
const DIX_KM = '2026-11-15'

export function construireBilan({
  plan,
  bilanee,
  suivante,
  ref,
  seancesDe,
  indices,
  feedback,
  pain,
  attestes,
  forme,
}: {
  plan: Plan
  bilanee: Week
  suivante?: Week
  ref: string
  /** Les séances d'une semaine, écarts et adaptations appliqués. */
  seancesDe: (w: Week) => SeancePlanifiee[]
  /** L'indice par jour, calculé autour de `ref`. */
  indices: Record<string, IndexBreakdown & { load: number }>
  feedback: FeedbackRow[]
  pain: PainMap
  attestes?: Set<string>
  /** La forme du jour : absente pour une semaine passée, elle ne vaudrait que pour aujourd'hui. */
  forme?: AjustementForme | null
}): BilanSemaine {
  const feedbackDe = ({ semaineOrigine, jourOrigine, slot }: SeancePlanifiee) =>
    feedback.find((f) => f.week === semaineOrigine && f.day_index === jourOrigine && f.slot === slot) ?? null

  const versBilan = (w: Week): SeanceBilan[] =>
    seancesDe(w).map((x) => {
      const reference = plan.weeks.find((y) => y.n === x.semaineOrigine)
      const slots = reference ? slotsParJour(reference.sessions) : []
      const f = feedbackDe(x)
      return {
        s: x.s,
        typePlan: x.typePlan,
        day: x.day,
        faite: Boolean(f),
        rpe: f?.rpe ?? null,
        douleur: f?.pain ?? null,
        reference: reference?.sessions.find((s, k) => s.day === x.jourOrigine && slots[k] === x.slot) ?? null,
      }
    })

  // Les quatre semaines qui précèdent, pour le volume et le dosage : ce sont
  // les deux chiffres que Maxime regarde avant ceux de la semaine.
  const quatreSemaines = plan.weeks
    .filter((w) => w.monday >= addDays(bilanee.monday, -21) && w.monday <= bilanee.monday)
    .flatMap(versBilan)
    .filter((x) => x.faite && !x.s.saute && x.day > addDays(ref, -28) && x.day <= ref)
  const volume28 = quatreSemaines.reduce((acc, x) => acc + (x.s.dist ?? 0), 0)
  const dosage = {
    seuil: quatreSemaines.filter((x) => x.s.qualite === 'seuil').length,
    vitesse: quatreSemaines.filter((x) => x.s.qualite === 'vitesse' || x.s.qualite === 'specifique').length,
  }

  // Jours sans douleur au-dessus de 2, et relevés dans la fenêtre : le
  // compteur qui ouvre les paliers de volume. Il s'arrête au premier jour du
  // carnet, sinon un carnet de vingt jours s'annoncerait comme soixante.
  const douleurMax = (d: string) => {
    const p = pain[d]
    const vs = [p?.wake, p?.evening, p?.effort].filter((v): v is number => v != null)
    return vs.length ? Math.max(...vs) : null
  }
  let derniereForte: number | null = null
  let premierReleve = 0
  for (let k = 0; k < 90; k++) {
    const m = douleurMax(addDays(ref, -k))
    if (m == null) continue
    premierReleve = k
    if (m > 2) {
      derniereForte = k
      break
    }
  }
  const joursSansDouleur = derniereForte ?? premierReleve + 1
  let relevesSansDouleur = 0
  for (let k = 0; k < joursSansDouleur; k++) if (douleurMax(addDays(ref, -k)) != null) relevesSansDouleur++

  let excentriqueSerie = 0
  for (let k = pain[ref]?.eccentric ? 0 : 1; k < 90; k++) {
    if (!pain[addDays(ref, -k)]?.eccentric) break
    excentriqueSerie++
  }

  // Semaines d'affilée avec au moins une séance notée : « ce qui compte,
  // c'est l'accumulation », et une interruption remet le compteur à zéro.
  const i = Math.max(
    0,
    plan.weeks.findIndex((w) => ref >= w.monday && ref <= addDays(w.monday, 6)),
  )
  let semainesDAffilee = 0
  for (let k = 0; k < plan.weeks.length; k++) {
    const w = plan.weeks[i - k]
    if (!w || w.monday > ref) continue
    const notees = feedback.some((f) => f.day >= w.monday && f.day <= addDays(w.monday, 6))
    if (!notees) break
    semainesDAffilee++
  }

  const jours: string[] = []
  for (let k = 0; k < 7; k++) {
    const d = addDays(bilanee.monday, k)
    if (d <= ref) jours.push(d)
  }
  const idx = jours.map((d) => indices[d]?.idx).filter((v): v is number => v != null)
  const detail = indices[ref]
  const faits: FaitsBilan = {
    volume28: Math.round(volume28 * 10) / 10,
    attestes: attestes ? jours.filter((d) => attestes.has(d)).length : jours.length,
    sansDouleur: { jours: joursSansDouleur, releves: relevesSansDouleur },
    excentriqueSerie,
    semainesDAffilee,
    indice: {
      moyen: idx.length ? Math.round(idx.reduce((a, b) => a + b, 0) / idx.length) : null,
      pic: idx.length ? Math.max(...idx) : null,
      emballement: detail?.ratio ?? 0,
      monotonie: detail?.monotony ?? 0,
    },
    forme: forme ? { allure: forme.allure, ecart: forme.ecart, seances: forme.seances } : null,
    echeances: {
      dixKm: daysBetween(ref, DIX_KM) > 0 ? daysBetween(ref, DIX_KM) : null,
      marathon: daysBetween(ref, plan.meta.raceDate),
    },
    dosage,
  }

  return bilanSemaine({
    semaine: bilanee,
    seances: versBilan(bilanee),
    pain,
    charge: Object.fromEntries(Object.entries(indices).map(([d, r]) => [d, r.load])),
    now: ref,
    faits,
    suivante: suivante ? { semaine: suivante, seances: versBilan(suivante) } : undefined,
  })
}
