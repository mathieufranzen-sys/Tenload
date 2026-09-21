/**
 * Les dossards : ceux du plan, et ceux que Mathieu ajoute.
 *
 * Demandé le 21 septembre 2026 avec la refonte : l'écran Allures devient
 * Objectif et gagne une section où chaque course a sa date, son objectif,
 * son chrono et le mot du coach qui va avec.
 *
 * Deux règles tiennent tout le module :
 *
 * 1. **Un dossard ajouté ne touche pas au plan.** Il n'entre ni dans la
 *    charge, ni dans le programme, ni dans les contraintes. Mathieu l'a
 *    demandé en ces termes : aucun changement de programme ni de calcul.
 * 2. **Une valeur, une source.** Le chrono d'une course du plan qui recale la
 *    forme (10 à 39 km, `recalageSurCourse`) vit déjà dans `plan_overrides`,
 *    comme durée réelle de la course : il se saisit par la même voie, et la
 *    ligne `dossards` n'en garde pas de copie. Le marathon ne recale rien ;
 *    son chrono va dans la ligne `dossards`, qui n'entre dans aucun calcul.
 *
 * Le mot du coach ne cite que des chiffres calculés ici, à partir du chrono,
 * de l'objectif et de la forme projetée. Même règle que `coach.ts`.
 */
import type { Plan, Session } from '../data/types'
import { addDays, daysBetween } from './dates'
import { cleEcart, slotsParJour, type EcartRow } from './overrides'
import { MARATHON_KM, formatPace, projeterMarathon } from './paces'

/** Une ligne de la table `dossards`. */
export interface DossardRow {
  id: string
  nom: string
  day: string
  distance_km: number
  objectif_s: number | null
  chrono_s: number | null
  supprime: boolean
}

export interface Dossard {
  id: string
  nom: string
  day: string
  km: number
  objectifS: number | null
  chronoS: number | null
  /** Dossard du plan de référence : ni supprimable, ni déplaçable d'ici. */
  duPlan: boolean
  /** Pour un dossard du plan : son identité, où vit son chrono. */
  seance?: { semaine: number; jour: number; slot: number }
  /**
   * Son chrono recale la forme projetée (`recalageSurCourse`) : il se saisit
   * alors comme durée réelle de la course, et nulle part ailleurs.
   */
  recale?: boolean
}

const estDossard = (s: Session) => s.type === 'course' || s.type === 'race'

/** L'id d'un dossard du plan : stable, dérivé de sa place dans le plan. */
export const idDossardPlan = (semaine: number, jour: number, slot: number) =>
  `plan-${semaine}-${jour}-${slot}`

/**
 * Tous les dossards, du plus proche au plus lointain, puis les passés du plus
 * récent au plus ancien. Un dossard supprimé n'apparaît plus.
 */
export function listerDossards(
  plan: Plan,
  lignes: DossardRow[],
  ecarts: Map<string, EcartRow> | undefined,
  now: string,
): Dossard[] {
  const parId = new Map(lignes.map((l) => [l.id, l]))
  const out: Dossard[] = []

  for (const w of plan.weeks) {
    const slots = slotsParJour(w.sessions)
    w.sessions.forEach((s, i) => {
      if (!estDossard(s) || !s.dist) return
      const id = idDossardPlan(w.n, s.day, slots[i])
      const ecart = ecarts?.get(cleEcart(w.n, s.day, slots[i]))
      // Un dossard du plan sauté n'est plus couru : il sort de la liste
      // plutôt que d'afficher un objectif pour une course qui n'aura pas lieu.
      if (ecart?.patch.skipped) return
      const decalage = (ecart?.patch.day ?? s.day) + 7 * (ecart?.patch.semaines ?? 0)
      const durMin = ecart?.patch.durMin
      out.push({
        id,
        nom: s.title,
        day: addDays(w.monday, decalage),
        km: s.dist,
        objectifS: parId.get(id)?.objectif_s ?? null,
        chronoS: durMin != null ? Math.round(durMin * 60) : (parId.get(id)?.chrono_s ?? null),
        recale: s.type === 'course' && s.dist >= 10 && s.dist < 40,
        duPlan: true,
        seance: { semaine: w.n, jour: s.day, slot: slots[i] },
      })
    })
  }

  for (const l of lignes) {
    if (l.id.startsWith('plan-') || l.supprime) continue
    out.push({
      id: l.id,
      nom: l.nom,
      day: l.day,
      km: Number(l.distance_km),
      objectifS: l.objectif_s,
      chronoS: l.chrono_s,
      duPlan: false,
    })
  }

  const avenir = out.filter((d) => d.day >= now).sort((a, b) => (a.day < b.day ? -1 : 1))
  const passes = out.filter((d) => d.day < now).sort((a, b) => (a.day < b.day ? 1 : -1))
  return [...avenir, ...passes]
}

/**
 * Le chrono que la forme projetée donne sur une distance.
 *
 * C'est l'inverse de `projeterMarathon`, trouvé par dichotomie : on cherche le
 * temps sur `km` qui projetterait exactement cette allure marathon. Utiliser
 * la même fonction dans les deux sens garantit qu'un chrono saisi puis
 * reprojeté retombe sur lui-même, prudence comprise.
 */
export function chronoEquivalent(km: number, allureMarathon: number): number {
  if (Math.abs(km - MARATHON_KM) < 0.01) return Math.round(allureMarathon * MARATHON_KM)
  let bas = km * 150
  let haut = km * 480
  for (let k = 0; k < 40; k++) {
    const milieu = (bas + haut) / 2
    if (projeterMarathon(km, milieu) < allureMarathon) bas = milieu
    else haut = milieu
  }
  return Math.round((bas + haut) / 2)
}

/** « 40:30 » ou « 3:15:00 ». */
export function formatChrono(secondes: number): string {
  const s = Math.round(secondes)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mmss = `${String(m).padStart(h ? 2 : 1, '0')}:${String(r).padStart(2, '0')}`
  return h ? `${h}:${mmss}` : mmss
}

/** « 1 min 12 s », « 38 s » : un écart se lit en durée, pas en chrono. */
export function formatEcart(secondes: number): string {
  const s = Math.abs(Math.round(secondes))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m} min ${String(r).padStart(2, '0')} s` : `${m} min`
}

export interface MotDossard {
  /** Où en est la course par rapport à l'objectif et à la forme. */
  constat: string
  /** Ce qu'il y a à faire, ou à retenir. */
  conseil: string
}

/**
 * Le mot du coach pour un dossard.
 *
 * Avant la course, il compare l'objectif à ce que la forme projetée donne sur
 * la distance ; après, le chrono à l'objectif puis à la forme. Le conseil
 * suit la distance au jour J, dans l'esprit de Maxime : rien ne se gagne la
 * dernière semaine, tout peut s'y perdre.
 */
export function motDuDossard(d: Dossard, formeMarathon: number, now: string): MotDossard {
  const jours = daysBetween(now, d.day)
  const projete = chronoEquivalent(d.km, formeMarathon)

  if (jours < 0) {
    if (d.chronoS == null) {
      return {
        constat: `Course passée, chrono non saisi. Ta forme projetée te donnait ${formatChrono(projete)} sur la distance.`,
        conseil:
          "Saisis ton chrono, même raté : une course à fond est la mesure la plus fiable qu'on ait de ta forme, bien plus que n'importe quelle séance.",
      }
    }
    const vsForme = d.chronoS - projete
    const allureMarathon = projeterMarathon(d.km, d.chronoS)
    const vsObjectif = d.objectifS != null ? d.chronoS - d.objectifS : null
    const partObjectif =
      vsObjectif == null
        ? ''
        : vsObjectif <= 0
          ? `Objectif tenu, ${formatEcart(vsObjectif)} ${vsObjectif === 0 ? 'pile' : 'sous la barre'}. `
          : `Objectif manqué de ${formatEcart(vsObjectif)}. `
    const partForme =
      Math.abs(vsForme) < 15
        ? `Pile ce que ta forme projetée annonçait.`
        : vsForme < 0
          ? `${formatEcart(vsForme)} plus vite que ta forme projetée : tu étais meilleur que ce que l'app croyait.`
          : `${formatEcart(vsForme)} plus lent que ta forme projetée.`
    return {
      constat: `${partObjectif}${partForme}`,
      conseil:
        d.km >= 10 && d.km < 40
          ? `Ce chrono projette un marathon à ${formatPace(allureMarathon)}/km, soit ${formatChrono(allureMarathon * MARATHON_KM)}. ${
              vsForme > 15
                ? "Une course ratée n'est pas une forme perdue : cherche les signaux des trois semaines d'avant, sommeil, douleur, séances manquées, avant de conclure."
                : 'Garde la même régularité : c\'est elle qui a produit ce chrono, pas la dernière semaine.'
            }`
          : vsForme > 15
            ? "Une course ratée n'est pas une forme perdue : cherche les signaux des trois semaines d'avant avant de conclure."
            : 'Deux jours sans intensité derrière, le temps que les jambes rendent ce que la course a pris.',
    }
  }

  const constat =
    d.objectifS == null
      ? `Ta forme projetée te donne ${formatChrono(projete)}, soit ${formatPace(projete / d.km)}/km. Fixe un objectif pour savoir ce qu'il reste à aller chercher.`
      : (() => {
          const ecart = d.objectifS - projete
          const allureVisee = formatPace(d.objectifS / d.km)
          if (Math.abs(ecart) < 15)
            return `Ton objectif de ${formatChrono(d.objectifS)} demande ${allureVisee}/km, et c'est exactement ce que ta forme projetée annonce.`
          return ecart < 0
            ? `Ton objectif de ${formatChrono(d.objectifS)} demande ${allureVisee}/km. Ta forme projetée te donne ${formatChrono(projete)} : il manque ${formatEcart(ecart)}.`
            : `Ton objectif de ${formatChrono(d.objectifS)} demande ${allureVisee}/km. Ta forme projetée te donne déjà ${formatChrono(projete)}, ${formatEcart(ecart)} de marge.`
        })()

  const conseil =
    jours === 0
      ? "C'est aujourd'hui. Pars à l'allure visée, pas plus vite : le premier kilomètre doit te paraître trop facile. Le 10 sur 10, c'est pour la fin."
      : jours <= 7
        ? `J-${jours}. La dernière semaine ne fait rien gagner, elle peut seulement faire perdre : dors, ne teste rien de nouveau, garde tes séances courtes.`
        : jours <= 21
          ? `J-${jours}. C'est le moment des séances à l'allure de la course : elles installent le rythme dans les jambes, plus que n'importe quel volume en plus.`
          : `J-${jours}. Rien ne se joue encore sur ce dossard : il se prépare dans la régularité des semaines qui viennent, pas dans une séance héroïque.`

  return { constat, conseil }
}

/** Un nouvel id de dossard ajouté à la main. */
export const nouvelIdDossard = (): string =>
  `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
