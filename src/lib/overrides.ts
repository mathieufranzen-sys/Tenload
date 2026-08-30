/**
 * Écarts volontaires au plan.
 *
 * Le plan des 35 semaines est une donnée de référence : versionnée dans le
 * code, validée sur ses six contraintes par reference/check_plan.py. Rien ici
 * ne le modifie. Un écart est une ligne de `plan_overrides` appliquée au
 * rendu, à la volée. C'est la condition pour que le fichier validé reste le
 * fichier exécuté — réécrire plan.json ferait passer check_plan.py sur un
 * fichier qui n'est plus la référence de personne.
 *
 * Ordre d'application : plan.json → l'écart volontaire → `applyFx` du moteur
 * d'adaptation. La décision de Mathieu passe d'abord, la protection du tendon
 * s'applique par-dessus. Jamais l'inverse : sinon déplacer une séance
 * garderait l'adaptation calculée pour son ancien jour.
 */
import type { Session, SessionType, Week } from '../data/types'

/** Ce qu'un écart a le droit de changer sur une séance. */
export interface EcartPatch {
  /** Séance non faite. Elle reste visible, barrée, et vaut zéro dans la charge. */
  skipped?: boolean
  /** Remplacement par une autre discipline. */
  type?: SessionType
  /** Jour de destination dans la semaine d'accueil, 0 = lundi … 6 = dimanche. */
  day?: number
  /**
   * Semaines d'écart par rapport à la semaine d'origine : −1, 0 ou +1.
   *
   * La clé Supabase reste celle de la séance dans le plan de référence
   * (semaine, jour, slot). Déplacer une séance ne la change donc jamais de
   * ligne, elle porte seulement l'offset de sa nouvelle date. C'est ce qui
   * garde toutes les écritures idempotentes, et ce qui permet de revenir au
   * plan en vidant le patch.
   */
  semaines?: number
  /** Distance réellement parcourue, en kilomètres. */
  dist?: number | null
  /** Durée réelle, en minutes. Une seule valeur, pas une fourchette. */
  durMin?: number | null
}

/** Une ligne de `plan_overrides`. La clé pointe la séance dans le plan de référence. */
export interface EcartRow {
  week: number
  day_index: number
  slot: number
  patch: EcartPatch
  reason: string | null
}

/**
 * Identité d'une séance dans le plan de référence : semaine, jour d'ORIGINE,
 * rang dans la journée. Un déplacement ne change pas cette clé, sinon l'écart
 * et le ressenti déjà enregistrés se retrouveraient orphelins.
 */
export const cleEcart = (week: number, dayIndex: number, slot: number): string =>
  `${week}-${dayIndex}-${slot}`

export function indexerEcarts(rows: EcartRow[]): Map<string, EcartRow> {
  return new Map(rows.map((e) => [cleEcart(e.week, e.day_index, e.slot), e]))
}

/**
 * Rang de chaque séance parmi celles du MÊME JOUR — la colonne `slot` du
 * schéma Supabase. Renvoie un tableau parallèle à `sessions`.
 *
 * À ne pas confondre avec l'index dans le tableau de la semaine : une semaine
 * est une liste à plat de neuf séances, donc le renfo du jeudi y est en
 * position 4 alors que son slot vaut 0. Confondre les deux fait chercher des
 * ressentis et des écarts sous des clés qui n'existent pas.
 */
export function slotsParJour(sessions: Session[]): number[] {
  const vus = new Map<number, number>()
  return sessions.map((s) => {
    const n = vus.get(s.day) ?? 0
    vus.set(s.day, n + 1)
    return n
  })
}

/** Les remplacements proposés, avec le libellé de catégorie du plan. */
export const TYPES_REMPLACEMENT: ReadonlyArray<{ type: SessionType; label: string; cat: string }> = [
  { type: 'ef', label: 'Course facile', cat: 'Course facile' },
  { type: 'velo', label: 'Vélo', cat: 'Vélo' },
  // La marche est le repli quand courir n'est plus possible mais bouger l'est
  // encore : elle charge le tendon deux fois moins au kilomètre.
  { type: 'marche', label: 'Marche', cat: 'Marche' },
  { type: 'muscu-haut', label: 'Renfo haut du corps', cat: 'Renforcement haut du corps' },
  { type: 'muscu-bas', label: 'Renfo bas du corps', cat: 'Renforcement bas du corps' },
  { type: 'escalade', label: 'Escalade', cat: 'Escalade' },
  { type: 'repos', label: 'Repos', cat: 'Repos' },
]

const CAT_PAR_TYPE = new Map(TYPES_REMPLACEMENT.map((r) => [r.type, r.cat]))
const LABEL_PAR_TYPE = new Map(TYPES_REMPLACEMENT.map((r) => [r.type, r.label]))

/** Libellé lisible d'un type, pour les phrases d'écart. */
export const labelType = (t: SessionType): string => LABEL_PAR_TYPE.get(t) ?? t

/**
 * Change la discipline d'une séance. Tout ce qui décrivait l'ancienne — les
 * segments d'allure, les blocs de fractionné, les exercices, le kilométrage —
 * disparaît : garder la distance d'une sortie longue sur un vélo afficherait
 * « Vélo · 26 km », ce qui n'a aucun sens. Même précaution que `applyFx`.
 */
function versType(s: Session, type: SessionType): Session {
  if (type === s.type) return s
  return {
    ...s,
    type,
    cat: CAT_PAR_TYPE.get(type) ?? s.cat,
    title: labelType(type),
    dist: undefined,
    dur: type === 'repos' ? null : s.dur,
    struct: null,
    wu: null,
    main: null,
    cd: null,
    ex: null,
  }
}

/**
 * Applique un écart à une séance. Ne mute pas l'original.
 *
 * Une séance sautée garde son apparence : c'est le drapeau `saute` qui la
 * barre à l'écran et l'annule dans la charge. La montrer telle qu'elle était
 * prévue vaut mieux que de la faire disparaître, sinon la semaine ne raconte
 * plus rien.
 */
export function appliquerEcart(s: Session, e: EcartPatch): Session {
  const out: Session = e.type ? versType(s, e.type) : { ...s }

  if (e.dist != null) {
    // `sessionLoad` lit les segments d'abord : changer la distance sans les
    // suivre laisserait la charge d'une sortie longue de 28 km sur une sortie
    // écourtée à 14. On redimensionne au prorata, ce qui garde le mélange de
    // zones — c'est le moins inventé de tous les choix possibles.
    if (out.struct?.length && out.dist) {
      const facteur = e.dist / out.dist
      out.struct = out.struct.map((seg) => ({ ...seg, km: Math.round(seg.km * facteur * 10) / 10 }))
    }
    out.title = titreAvecDistance(out.title, out.dist, e.dist)
    out.dist = e.dist
  }
  if (e.durMin != null) out.dur = [e.durMin, e.durMin]
  if (e.day != null) out.day = e.day
  if (e.semaines) out.semaines = e.semaines
  if (e.skipped) out.saute = true

  // Le badge dit ce que la séance ÉTAIT, pas ce qu'elle est devenue : ce
  // qu'elle est devenue, la carte l'affiche déjà en grand juste à côté.
  const parts: string[] = []
  if (e.skipped) parts.push('non faite')
  if (e.type) parts.push(`initialement ${s.cat.toLowerCase()}`)
  if ((e.day != null && e.day !== s.day) || e.semaines) {
    // Le badge se lit depuis l'endroit où la séance se trouve MAINTENANT :
    // une séance poussée d'une semaine vient donc de la semaine d'avant.
    const semaine = !e.semaines ? '' : e.semaines > 0 ? ', semaine d’avant' : ', semaine d’après'
    parts.push(`initialement ${JOURS[s.day]}${semaine}`)
  }
  if (e.dist != null && s.dist != null) parts.push(`initialement ${s.dist} km`)
  if (e.durMin != null && s.dur) parts.push(`initialement ${s.dur[0]} min`)
  if (parts.length) out.ecart = parts.join(' · ')

  return out
}

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

/**
 * Le titre porte la distance : « Sortie longue de 24 km ». Corriger les
 * kilomètres sans corriger le titre laissait la feuille se contredire d'une
 * ligne à l'autre, 24 en titre et 20 en chiffre juste en dessous.
 *
 * Le remplacement ne se fait que si le titre annonce bien l'ANCIENNE distance :
 * sinon le nombre trouvé désigne autre chose — « 6 x 400 m », « 2 x 2 km » —
 * et le réécrire inventerait une séance.
 */
export function titreAvecDistance(titre: string, avant: number | undefined, apres: number): string {
  if (avant == null) return titre
  const motif = new RegExp(`\\b${String(avant).replace('.', '[.,]')}\\s*km\\b`)
  if (!motif.test(titre)) return titre
  return titre.replace(motif, `${formatKm(apres)} km`)
}

const formatKm = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')

// ─────────────────────────────────────────────── contrôle des six contraintes

const TYPES_COURSE: SessionType[] = ['long', 'ef', 'inter', 'tempo', 'test', 'course', 'race']
const TYPES_QUALITE: SessionType[] = ['inter', 'tempo', 'test', 'course', 'race']
const TYPES_JAMBES: SessionType[] = [
  'long', 'ef', 'inter', 'tempo', 'test', 'course', 'race', 'velo', 'marche', 'muscu-bas', 'escalade',
]

export interface Alerte {
  /** Le numéro de la contrainte dans le CLAUDE.md, de 1 à 6. */
  contrainte: number
  texte: string
}

/**
 * Vérifie la semaine telle qu'elle sera réellement vécue, écarts appliqués.
 *
 * Quatre des six contraintes se lisent sur la disposition d'une semaine. La 1
 * (sortie longue à +2 km maximum) et la 5 (deux vélos qui portent le volume)
 * portent sur la progression du plan de référence, que les écarts ne touchent
 * pas : check_plan.py reste seul juge de celles-là.
 *
 * L'appelant AVERTIT, il ne bloque pas. C'est son tendon et son emploi du
 * temps ; refuser un déplacement le pousserait juste à ne rien saisir, et on
 * perdrait l'information au lieu de la garder.
 */
export function verifierContraintes(seances: Session[]): Alerte[] {
  const alertes: Alerte[] = []
  const actives = seances.filter((s) => !s.saute)
  const jour = (d: number) => actives.filter((s) => s.day === d)
  const porte = (d: number, types: SessionType[]) => jour(d).some((s) => types.includes(s.type))

  // C2 — le jour de l'escalade lui appartient : avant-bras et épaules
  // travaillent déjà. La contrainte vise LA SÉANCE, pas le mercredi : déplacer
  // l'escalade au mardi doit protéger le mardi. Codée sur le mercredi, elle
  // signalait qu'on pose un renfo haut sur l'escalade, mais restait muette
  // quand on posait l'escalade sur le renfo haut — la même collision, dans
  // l'autre sens.
  for (const esc of actives.filter((s) => s.type === 'escalade')) {
    if (porte(esc.day, TYPES_COURSE))
      alertes.push({
        contrainte: 2,
        texte: `Une course tombe le jour de l’escalade (${JOURS[esc.day]}).`,
      })
    if (porte(esc.day, ['muscu-haut']))
      alertes.push({
        contrainte: 2,
        texte: `Un renfo haut du corps tombe le jour de l’escalade (${JOURS[esc.day]}) : l’escalade le fait déjà.`,
      })
  }

  // C3 — rien de dur collé à la sortie longue, ni le jour même, ni la veille,
  // ni le lendemain. Le jour même manquait : c'est pourtant le pire des trois.
  for (const sl of actives.filter((s) => s.type === 'long')) {
    for (const d of [sl.day - 1, sl.day, sl.day + 1]) {
      if (d < 0 || d > 6) continue
      const ou = d === sl.day ? 'le jour même' : JOURS[d]
      if (porte(d, TYPES_QUALITE))
        alertes.push({
          contrainte: 3,
          texte: `Une séance de qualité est accolée à la sortie longue (${ou}).`,
        })
      if (porte(d, ['muscu-bas']))
        alertes.push({
          contrainte: 3,
          texte: `Un renfo bas du corps est accolé à la sortie longue (${ou}).`,
        })
    }
  }

  // C4 — le jour de repos est un jour vide, et il en faut un par semaine.
  //
  // Deux vérifications, parce que ce sont deux choses. La première porte sur
  // la séance de repos : rien ne se pose dessus, pas même un renfo haut du
  // corps, sinon ce n'est plus un jour de repos. La seconde porte sur la
  // semaine : elle tolère que le repos change de place — quand une course
  // tombe le dimanche, c'est le samedi qui le porte — mais pas qu'il
  // disparaisse.
  for (const repos of actives.filter((s) => s.type === 'repos')) {
    if (jour(repos.day).some((s) => s.type !== 'repos'))
      alertes.push({
        contrainte: 4,
        texte: `Une séance tombe sur le jour de repos (${JOURS[repos.day]}).`,
      })
  }
  const repose = (d: number) => !jour(d).some((s) => TYPES_JAMBES.includes(s.type))
  if (![0, 1, 2, 3, 4, 5, 6].some(repose))
    alertes.push({
      contrainte: 4,
      texte: 'Aucun jour de repos jambes complet dans la semaine.',
    })

  // C6 — jamais deux jours de course d'affilée, sauf lundi-mardi où le mardi
  // est une récupération très lente prévue pour ça. Et jamais deux courses le
  // même jour : ce n'est pas dans les six contraintes parce que le plan de
  // référence ne peut pas le produire, mais un déplacement le peut, et
  // doubler une séance de course est pire que deux jours d'affilée.
  for (let d = 0; d <= 6; d++) {
    if (jour(d).filter((s) => TYPES_COURSE.includes(s.type)).length > 1)
      alertes.push({
        contrainte: 6,
        texte: `Deux séances de course le même jour (${JOURS[d]}).`,
      })
  }
  for (let d = 0; d < 6; d++) {
    if (d === 0) continue
    if (porte(d, TYPES_COURSE) && porte(d + 1, TYPES_COURSE))
      alertes.push({
        contrainte: 6,
        texte: `Deux jours de course consécutifs (${JOURS[d]} et ${JOURS[d + 1]}).`,
      })
  }

  return alertes
}

/**
 * Les alertes qu'un écart ferait APPARAÎTRE, en ignorant celles que la semaine
 * portait déjà. Sans ce filtre, une semaine déjà limite ferait crier à chaque
 * modification sans rapport, et l'avertissement perdrait tout son sens.
 */
export function alertesAjoutees(avant: Session[], apres: Session[]): Alerte[] {
  const deja = new Set(verifierContraintes(avant).map((a) => a.texte))
  return verifierContraintes(apres).filter((a) => !deja.has(a.texte))
}

/** Les séances d'une semaine, écarts appliqués, sans adaptation. */
/**
 * La disposition RÉELLE d'une semaine de calendrier : ce qui y tombe une fois
 * les écarts appliqués, y compris les séances venues de la semaine d'avant ou
 * d'après, et sans celles qui l'ont quittée.
 *
 * `seancesAvecEcarts` ne connaît que les séances déclarées dans la semaine :
 * elle suffisait tant qu'un écart ne pouvait pas franchir le dimanche. Depuis,
 * contrôler les contraintes sur elle seule regardait une semaine qui n'existe
 * plus — une sortie longue posée le dimanche depuis la semaine suivante y était
 * invisible, et deux jours de course d'affilée passaient sans un mot.
 *
 * Le `day` renvoyé est le rang dans la semaine DEMANDÉE, ce qu'attend
 * `verifierContraintes`.
 */
export function dispositionSemaine(
  weeks: Week[],
  semaine: Week,
  ecarts: Map<string, EcartRow>,
): Session[] {
  const i = weeks.findIndex((w) => w.n === semaine.n)
  const out: Session[] = []
  for (const k of [i - 1, i, i + 1]) {
    const w = weeks[k]
    if (!w) continue
    seancesAvecEcarts(w, ecarts).forEach((s) => {
      // `semaines` porte le franchissement du dimanche : sans lui, une séance
      // déplacée d'une semaine resterait comptée dans la sienne.
      const decalage = (k - i) * 7 + s.day + 7 * (s.semaines ?? 0)
      if (decalage < 0 || decalage > 6) return
      out.push({ ...s, day: decalage })
    })
  }
  return out
}

export function seancesAvecEcarts(week: Week, ecarts: Map<string, EcartRow>): Session[] {
  const slots = slotsParJour(week.sessions)
  return week.sessions.map((s, i) => {
    const e = ecarts.get(cleEcart(week.n, s.day, slots[i]))
    return e ? appliquerEcart(s, e.patch) : s
  })
}
