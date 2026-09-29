/**
 * Écarts volontaires au plan.
 *
 * Le plan des 34 semaines est une donnée de référence : versionnée dans le
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
import planJson from '../data/plan.json'
import type { Exercise, Plan, Session, SessionType, Week } from '../data/types'
import { ZONE_OFFSETS, estimateDuration } from './paces'

const plan = planJson as unknown as Plan

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
  /**
   * Séance de qualité installée à la place de celle du plan.
   *
   * Changer de discipline ne suffisait pas : une séance spécifique n'est pas
   * une discipline, c'est un contenu. `versType` efface les allures avec le
   * reste, si bien qu'on pouvait transformer une sortie longue en course
   * facile mais jamais composer un 5 x 1000 m au seuil.
   */
  qualite?: Qualite
}

/** Les trois zones où se travaille une séance de qualité. */
export type ZoneQualite = 'am' | 'seuil' | 'vo2'

/**
 * Une séance de qualité composée à la main, dans sa forme la plus simple :
 * un nombre de répétitions, leur longueur, leur zone. Tout le reste se déduit,
 * y compris le coût tendineux, qui lit les segments.
 */
export interface Qualite {
  /** Nombre de répétitions. 1 vaut un bloc continu. */
  reps: number
  /** Longueur d'une répétition, en kilomètres. */
  km: number
  zone: ZoneQualite
}

const LIBELLE_ZONE: Record<ZoneQualite, string> = {
  am: 'à allure marathon',
  seuil: 'au seuil',
  vo2: 'en VO2max',
}

/** Le type de séance que porte la zone : la VO2 est de l'intervalle, le reste du tempo. */
const TYPE_ZONE: Record<ZoneQualite, SessionType> = { am: 'tempo', seuil: 'tempo', vo2: 'inter' }

/** « 400 m » sous le kilomètre, « 1,5 km » au-dessus : c'est ainsi qu'on les nomme. */
const longueur = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${formatKm(km)} km`

/** Le titre d'une séance composée, tel qu'un plan l'écrirait. */
export function titreQualite(q: Qualite): string {
  const corps = q.reps > 1 ? `${q.reps} x ${longueur(q.km)}` : longueur(q.km)
  return `${corps} ${LIBELLE_ZONE[q.zone]}`
}

/** Échauffement et retour au calme, invariants : ils encadrent toute séance de qualité. */
const ECHAUFFEMENT = 2.5
const RETOUR_AU_CALME = 2

/**
 * Installe la séance composée. Les segments sont posés pour de vrai, pas
 * seulement le titre : c'est `struct` que lit le coût tendineux, et une séance
 * de qualité dont le modèle ignorerait la zone coûterait le prix d'une sortie
 * facile.
 */
function versQualite(s: Session, q: Qualite): Session {
  const travail = Math.round(q.reps * q.km * 10) / 10
  return {
    ...s,
    type: TYPE_ZONE[q.zone],
    cat: q.zone === 'vo2' ? 'Intervalles' : 'Tempo',
    title: titreQualite(q),
    dist: Math.round((ECHAUFFEMENT + travail + RETOUR_AU_CALME) * 10) / 10,
    dur: null,
    struct: [
      { km: ECHAUFFEMENT, zone: 'ef' },
      { km: travail, zone: q.zone },
      { km: RETOUR_AU_CALME, zone: 'recup' },
    ],
    wu: [[ECHAUFFEMENT, 'ef']],
    main: [[titreQualite(q), q.zone]],
    cd: [[RETOUR_AU_CALME, 'recup']],
    ex: null,
    specifique: undefined,
    note:
      'Séance composée à la main. Échauffement et retour au calme compris dans la distance. ' +
      'Le contrôle des contraintes la traite comme une séance de vitesse : elle ne se pose ni ' +
      'la veille ni le lendemain de la sortie longue.',
  }
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

/** Les disciplines qui se courent, et qui ont donc une distance. */
export const TYPES_COURUS: ReadonlyArray<SessionType> = ['long', 'ef', 'inter', 'tempo', 'test', 'course', 'race']

/**
 * Le mot du coach d'une séance mise à la place d'une autre.
 *
 * Le remplacement gardait la note de la séance d'origine : un vélo mis à la
 * place de la sortie longue s'ouvrait sur « elle accélère jusqu'au bout, allure
 * semi puis seuil » (retour du laboratoire, 28 septembre 2026). La feuille
 * disait « Vélo » en titre et parlait d'une course juste en dessous.
 */
const NOTE_REMPLACEMENT: Partial<Record<SessionType, string>> = {
  ef: "Course facile, à allure de conversation du début à la fin. Si tu ne peux plus parler en phrases complètes, ralentis : c'est l'allure qui fait la séance, pas la distance.",
  velo: 'Vélo souple, cadence haute, sans résistance. C’est du volume aérobie sans impact au sol : il entretient le moteur sans charger le tendon.',
  marche:
    'Marche active, sur du plat. Au kilomètre, elle charge le tendon deux fois moins que la course : c’est le repli quand courir n’est pas raisonnable.',
  'muscu-bas':
    'Le protocole excentrique passe en premier : c’est le traitement du tendon, et il fait baisser ton indice le lendemain. Charge progressive, descente lente.',
  'muscu-haut':
    'Le haut du corps ne charge pas le tendon. Le Stanish reste : c’est un traitement, pas un complément.',
  escalade:
    'Escalade à la place de la séance prévue. Elle compte dans la charge des jambes : garde-la tranquille si le tendon a parlé ces derniers jours.',
  repos: 'Repos des jambes. Mobilité de cheville, étirements doux : c’est ce jour-là que le tendon se répare.',
}

/**
 * Les exercices du renfo, repris du plan. Un renfo mis à la place d'un vélo
 * n'avait AUCUN exercice : le remplacement effaçait la liste de l'ancienne
 * séance sans en poser une nouvelle.
 */
const EXERCICES_PAR_TYPE: Partial<Record<SessionType, Exercise[]>> = (() => {
  const out: Partial<Record<SessionType, Exercise[]>> = {}
  for (const w of plan.weeks) {
    for (const s of w.sessions) if (s.ex?.length && !out[s.type]) out[s.type] = s.ex
  }
  return out
})()

/** Allure de l'endurance facile, en secondes par kilomètre : celle qui convertit une durée en distance. */
const ALLURE_EF = plan.meta.targetMarathonPace + ZONE_OFFSETS.ef

/**
 * Change la discipline d'une séance. Tout ce qui décrivait l'ancienne — les
 * segments d'allure, les blocs de fractionné, les exercices, le mot du coach —
 * disparaît : garder la distance d'une sortie longue sur un vélo afficherait
 * « Vélo · 26 km », ce qui n'a aucun sens. Même précaution que `applyFx`.
 *
 * Ce qui la MESURE, en revanche, passe d'une discipline à l'autre : c'est ce
 * que lit la charge. Une course n'a pas de durée dans le plan, seulement une
 * distance, et un vélo n'a pas de distance : une sortie longue remplacée par
 * du vélo valait donc zéro dans la charge, comme une course facile mise à la
 * place d'un vélo. Le remplacement garde le TEMPS de la séance d'origine, à
 * l'allure de l'endurance facile quand il faut repasser en kilomètres.
 */
export function versType(s: Session, type: SessionType): Session {
  if (type === s.type) return s
  const court = TYPES_COURUS.includes(type)
  const courait = TYPES_COURUS.includes(s.type)

  let dist: number | undefined
  let dur: [number, number] | null = type === 'repos' ? null : (s.dur ?? null)
  let title = labelType(type)
  let struct: Session['struct'] = null
  if (court) {
    // D'une durée vers une course : autant de temps, à allure facile.
    const km = courait ? s.dist : s.dur ? Math.round((s.dur[0] * 60) / ALLURE_EF) : undefined
    if (km) {
      dist = km
      dur = null
      title = `${labelType(type)} de ${formatKm(km)} km`
      struct = [{ km, zone: 'ef' }]
    }
  } else if (courait && type !== 'repos' && !s.dur && s.dist) {
    // D'une course vers une durée : le temps qu'elle aurait pris.
    dur = estimateDuration(s, plan.meta.targetMarathonPace)
  }

  return {
    ...s,
    type,
    cat: CAT_PAR_TYPE.get(type) ?? s.cat,
    title,
    dist,
    dur,
    struct,
    wu: null,
    main: null,
    cd: null,
    ex: EXERCICES_PAR_TYPE[type] ?? null,
    specifique: undefined,
    note: NOTE_REMPLACEMENT[type] ?? s.note,
  }
}

/**
 * Change la distance d'une séance sans rien changer d'autre. Les segments
 * suivent au prorata, ce qui garde le mélange de zones — c'est le moins
 * inventé de tous les choix possibles — et le titre suit s'il annonçait
 * l'ancienne distance.
 */
export function avecDistance(s: Session, km: number): Session {
  const out: Session = { ...s }
  // `sessionLoad` lit les segments d'abord : changer la distance sans les
  // suivre laisserait la charge d'une sortie longue de 28 km sur une sortie
  // écourtée à 14.
  if (out.struct?.length && out.dist) {
    const facteur = km / out.dist
    out.struct = out.struct.map((seg) => ({ ...seg, km: Math.round(seg.km * facteur * 10) / 10 }))
  }
  out.title = titreAvecDistance(out.title, out.dist, km)
  out.dist = km
  return out
}

/** Ce qu'un ressenti dit de la séance : la discipline et la distance affichées quand elle a été notée. */
export interface TraceRessenti {
  session_type: string
  distance_km?: number | null
}

/**
 * La séance telle qu'elle a été faite, d'après son ressenti.
 *
 * Le ressenti enregistre la discipline et la distance AFFICHÉES au moment où
 * la séance est notée. C'est la seule trace de ce qui a vraiment eu lieu : une
 * course passée au vélo par l'indice redevenait une course dès qu'elle était
 * notée, à l'écran comme dans la charge, qui comptait alors des kilomètres
 * jamais courus (retour du laboratoire, 28 septembre 2026).
 *
 * `distanceCorrigee` : une « donnée réelle » saisie après coup l'emporte sur
 * la distance du ressenti, qui date d'avant la correction.
 */
export function formeNotee(s: Session, trace: TraceRessenti, distanceCorrigee = false): Session {
  const type = trace.session_type as SessionType
  const km = distanceCorrigee ? s.dist : (trace.distance_km ?? s.dist)

  if (type === s.type) {
    if (km != null && s.dist != null && TYPES_COURUS.includes(type) && Math.abs(km - s.dist) >= 0.05) {
      return avecDistance(s, km)
    }
    return s
  }
  if (TYPES_COURUS.includes(type) && TYPES_COURUS.includes(s.type)) {
    // Une course faite autrement, typiquement une qualité courue en endurance
    // pendant une reprise : même distance, tout en allure facile.
    const d = km ?? undefined
    return {
      ...versType(s, type),
      dist: d,
      title: d ? `${labelType(type)} de ${formatKm(d)} km` : labelType(type),
      struct: d ? [{ km: d, zone: 'ef' }] : null,
    }
  }
  if (type === 'velo' && TYPES_COURUS.includes(s.type)) {
    // Une course faite en vélo sans écart ne peut venir que du moteur, dont
    // tous les vélos de remplacement durent de 45 à 70 minutes.
    return { ...versType(s, 'velo'), title: 'Vélo Z2', dur: [50, 60] }
  }
  return versType(s, type)
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
  let out: Session = e.type ? versType(s, e.type) : { ...s }
  // La séance composée passe après le changement de discipline : elle le
  // remplace entièrement, elle ne s'y ajoute pas.
  if (e.qualite) out = versQualite(out, e.qualite)

  if (e.dist != null) out = avecDistance(out, e.dist)
  if (e.durMin != null) out.dur = [e.durMin, e.durMin]
  if (e.day != null) out.day = e.day
  if (e.semaines) out.semaines = e.semaines
  if (e.skipped) out.saute = true

  // Le badge dit ce que la séance ÉTAIT, pas ce qu'elle est devenue : ce
  // qu'elle est devenue, la carte l'affiche déjà en grand juste à côté.
  const parts: string[] = []
  if (e.skipped) parts.push('non faite')
  if (e.qualite || e.type) parts.push(`initialement ${s.cat.toLowerCase()}`)
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

  // C2 a ete SUPPRIMEE le 18 septembre 2026 : l'escalade sort du plan. Elle
  // n'est plus une seance hebdomadaire mais un remplacement possible, au meme
  // titre que le velo ou la marche. Une contrainte qui protegeait son jour n'a
  // plus d'objet, et la garder ferait crier l'app chaque fois qu'une course est
  // remplacee par une grimpe.

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
  // Seconde exception : la course qui remplace le vélo une fois le volume
  // ouvert. Huit semaines sans douleur au-dessus de 2 disent que le tendon
  // encaisse à nouveau des jours de course enchaînés (décision de Mathieu,
  // 29 septembre 2026).
  const courseEnchainable = (d: number) =>
    jour(d).some((s) => TYPES_COURSE.includes(s.type) && s.motif !== 'volume')
  for (let d = 0; d < 6; d++) {
    if (d === 0) continue
    if (courseEnchainable(d) && courseEnchainable(d + 1))
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
