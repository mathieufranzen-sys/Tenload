/**
 * La progression du volume de course : ce qui empêche le plan de reprendre là
 * où il en était quand le tendon, lui, a décroché.
 *
 * Le plan projette ses semaines telles qu'écrites. Après trois semaines de
 * crise tenues autour de 40 % du plan, la suivante reprenait à 100 % : la
 * charge doublait d'un coup (profil 2 du laboratoire, 29 septembre 2026).
 *
 * Deux plafonds, calculés d'une seule passe dans l'ordre du calendrier, parce
 * que chaque semaine plafonnée devient la référence de la suivante :
 *
 * 1. **Une sortie ne dépasse pas de plus de 10 % la plus longue des trente
 *    derniers jours** (Frandsen et al., BJSM 2025 : c'est le signal de risque
 *    le plus solide sur 5 200 coureurs). Le plan de référence le respecte
 *    partout, marathon excepté : ce plafond ne mord que quand la réalité s'en
 *    écarte.
 * 2. **Une semaine ne dépasse pas de plus de 15 % la part du plan tenue la
 *    semaine d'avant.** Plus de 30 % de hausse sur deux semaines s'accompagne
 *    de davantage de blessures (Nielsen 2014) ; 15 % par semaine en est la
 *    moitié. La hausse se compte en PART DU PLAN et non en kilomètres, sinon
 *    le retour d'une décharge prévue passerait pour un emballement. Le taux a
 *    été choisi par Mathieu le 29 septembre 2026.
 *
 * C'est proportionnel par construction : un épisode d'un jour laisse la
 * semaine à 90 % du plan, et la suivante revient à 100 %. Trois semaines à
 * 45 % demandent cinq semaines de remontée.
 *
 * Pour tenir le plafond, on raccourcit les courses faciles d'abord, jusqu'à
 * vingt minutes, puis la sortie longue. On ne retire aucune course : c'est
 * la fréquence qu'on garde, le volume qu'on baisse (Running Addict, et
 * l'ordre fréquence, volume, intensité). La qualité n'est pas raccourcie :
 * elle se lit en répétitions, pas en kilomètres.
 */
import type { FeedbackRow } from './buildPain'
import { addDays, mondayOf } from './dates'
import { cleEcart, TYPES_COURUS } from './overrides'
import type { SeanceArrangee } from './palier'

export const HAUSSE_SORTIE = 0.1
export const FENETRE_SORTIE = 30
export const HAUSSE_SEMAINE = 0.15
/** Une course facile raccourcie ne descend pas sous vingt minutes : la reprise de Running Addict partait de 15 à 20. */
export const EF_MINIMUM = 4

export interface Plafond {
  km: number
  motif: 'plafond' | 'progression'
  /** `plafond` : la sortie de référence. `progression` : la part du plan tenue la semaine d'avant. */
  reference: { km: number; jour: string } | null
  part: number | null
}

const arrondi = (km: number) => Math.floor(km * 2 + 1e-9) / 2
const COURSE: ReadonlyArray<string> = TYPES_COURUS
const PLAFONNABLES = ['long', 'ef']

export function plafondsProgression(
  seances: SeanceArrangee[],
  feedback: FeedbackRow[],
  now: string,
): Map<string, Plafond> {
  const notees = new Map(feedback.map((f) => [cleEcart(f.week, f.day_index, f.slot), f]))
  const out = new Map<string, Plafond>()

  // Les sorties réellement faites : un ressenti de course, sur sa distance.
  const sorties: Array<{ jour: string; km: number }> = []
  const kmFait = (s: SeanceArrangee): number | null => {
    const f = notees.get(cleEcart(s.week, s.jourOrigine, s.slot))
    if (!f || !COURSE.includes(f.session_type)) return null
    return f.distance_km ?? s.dist ?? null
  }

  // Semaine par semaine, du lundi de la semaine passée à la fin du plan.
  const semaines = new Map<string, SeanceArrangee[]>()
  for (const s of seances) {
    const lundi = mondayOf(s.day)
    semaines.set(lundi, [...(semaines.get(lundi) ?? []), s])
  }
  const lundis = [...semaines.keys()].sort()
  const courant = mondayOf(now)
  const prevu = (liste: SeanceArrangee[]) =>
    liste.filter((s) => COURSE.includes(s.type)).reduce((a, s) => a + (s.dist ?? 0), 0)

  let part = 1
  for (const lundi of lundis) {
    const liste = semaines.get(lundi)!
    if (lundi < courant) {
      // Le passé : ce qui a été fait. La part du plan de la DERNIÈRE semaine
      // écoulée sert de départ ; une semaine sans aucun ressenti ne dit rien
      // et ne dégrade pas la suivante.
      let fait = 0
      let notee = false
      for (const s of liste) {
        if (notees.has(cleEcart(s.week, s.jourOrigine, s.slot))) notee = true
        const km = kmFait(s)
        if (km) {
          fait += km
          sorties.push({ jour: s.day, km })
        }
      }
      const p = prevu(liste)
      part = notee && p > 0 ? fait / p : 1
      continue
    }

    // Aujourd'hui et l'avenir : ce qui est déjà fait cette semaine, plus la
    // projection, plafond de sortie compris.
    let dejaFait = 0
    const aVenir: Array<{ s: SeanceArrangee; km: number }> = []
    for (const s of liste) {
      if (s.saute || !COURSE.includes(s.type)) continue
      const f = kmFait(s)
      if (f != null) {
        dejaFait += f
        sorties.push({ jour: s.day, km: f })
        continue
      }
      if (s.day < now || notees.has(cleEcart(s.week, s.jourOrigine, s.slot))) continue
      let km = s.dist ?? 0
      if (km && PLAFONNABLES.includes(s.type)) {
        const debut = addDays(s.day, -FENETRE_SORTIE)
        const ref = sorties
          .filter((x) => x.jour >= debut && x.jour < s.day)
          .reduce((m, x) => (x.km > m.km ? x : m), { km: 0, jour: '' })
        const plafond = arrondi(ref.km * (1 + HAUSSE_SORTIE))
        if (ref.km > 0 && km > plafond) {
          km = plafond
          out.set(cleEcart(s.week, s.jourOrigine, s.slot), { km, motif: 'plafond', reference: ref, part: null })
        }
      }
      aVenir.push({ s, km })
      sorties.push({ jour: s.day, km })
    }

    const p = prevu(liste)
    if (p === 0) continue
    const permis = Math.min(1, part * (1 + HAUSSE_SEMAINE)) * p
    let exces = dejaFait + aVenir.reduce((a, x) => a + x.km, 0) - permis
    if (exces > 0.25) {
      // Les courses faciles d'abord, la plus longue en premier, puis la longue.
      const ordre = [
        ...aVenir.filter((x) => x.s.type === 'ef').sort((a, b) => b.km - a.km),
        ...aVenir.filter((x) => x.s.type === 'long'),
      ]
      for (const x of ordre) {
        if (exces <= 0.25) break
        const plancher = x.s.type === 'ef' ? EF_MINIMUM : 0
        const nouveau = Math.max(plancher, arrondi(x.km - exces))
        if (nouveau >= x.km) continue
        exces -= x.km - nouveau
        x.km = nouveau
        const sortie = sorties.find((y) => y.jour === x.s.day && y.km >= nouveau)
        if (sortie) sortie.km = nouveau
        out.set(cleEcart(x.s.week, x.s.jourOrigine, x.s.slot), {
          km: nouveau,
          motif: 'progression',
          reference: null,
          part: Math.round(part * 100) / 100,
        })
      }
    }
    const tenu = dejaFait + aVenir.reduce((a, x) => a + x.km, 0)
    part = tenu / p
  }
  return out
}
