/**
 * Moteur d'adaptation : traduit l'indice de charge du tendon en modifications
 * concrètes du plan, séance par séance.
 *
 * Porté depuis reference/tendo-v3.html (`adapt()`, `fxForDate()`, `applyFx()`).
 * Les seuils orange/rouge/noir encodent directement les règles R1-R4 posées
 * avec Mathieu ; R5 (allures trop rapides) et R6 (feu vert) restent des règles
 * à part, lues depuis les ressentis de séance.
 */
import type { FeedbackRow } from './buildPain'
import { addDays, formatNumber } from './dates'
import {
  bandOf,
  indexSeries,
  plancherDuReleve,
  type Band,
  type IndexBreakdown,
  type LoadMap,
  type PainMap,
} from './tendonIndex'
import type { Session, SessionType, Week } from '../data/types'
import { avecDistance, cleEcart, formeNotee, labelType, seancesAvecEcarts, slotsParJour, versType, type EcartRow } from './overrides'
import { EFFORT_TOLERE, SEUIL_SANS_DOULEUR, avancement, etatReprise, raisonEpisode, type EtatReprise } from './reprise'
import { plafondsProgression, type Plafond } from './progression'
import {
  appliquerPalier,
  appliquerPalierSpecifique,
  arrangerPlan,
  palierProchaineLongue,
  palierProchaineSpecifique,
  type PalierLongue,
  type PalierSpecifique,
} from './palier'

export interface Fx {
  slCut: number
  qualityToBike: boolean
  cancelQuality: boolean
  tuesdayToBike: boolean
  runStop: boolean
  legStop: boolean
  lightLegs: boolean
  idx: number | null
  band: Band | null
}

const FX_NONE: Fx = {
  slCut: 0,
  qualityToBike: false,
  cancelQuality: false,
  tuesdayToBike: false,
  runStop: false,
  legStop: false,
  lightLegs: false,
  idx: null,
  band: null,
}

/**
 * Effets applicables à une date donnée, d'après l'indice PROJETÉ de ce jour,
 * dans une fenêtre de dix jours. Au-delà, le plan reste nominal : projeter
 * plus loin n'aurait pas de sens. Ne jamais appliquer l'état du jour à
 * l'ensemble des 34 semaines — c'était le bug de la version HTML.
 */
export function fxForDate(
  day: string,
  now: string,
  byDate: Record<string, IndexBreakdown>,
): Fx {
  if (day < now || day > addDays(now, 10)) return FX_NONE
  const r = byDate[day]
  if (!r) return FX_NONE
  const band = bandOf(r.idx)
  if (band.key === 'orange')
    return { ...FX_NONE, slCut: 0.2, qualityToBike: true, lightLegs: true, idx: r.idx, band }
  if (band.key === 'rouge')
    return {
      ...FX_NONE,
      runStop: true,
      cancelQuality: true,
      tuesdayToBike: true,
      lightLegs: true,
      idx: r.idx,
      band,
    }
  if (band.key === 'noir')
    return {
      ...FX_NONE,
      runStop: true,
      legStop: true,
      cancelQuality: true,
      tuesdayToBike: true,
      idx: r.idx,
      band,
    }
  return { ...FX_NONE, idx: r.idx, band }
}

const TYPES_JAMBES: SessionType[] = [
  'long', 'ef', 'inter', 'tempo', 'test', 'course', 'velo', 'marche', 'muscu-bas', 'escalade',
]
const TYPES_COURSE: SessionType[] = ['long', 'ef', 'inter', 'tempo', 'test', 'course']
const TYPES_QUALITE: SessionType[] = ['inter', 'tempo', 'test']

/**
 * Contexte de la séance dans sa semaine RÉELLE, une fois les écarts appliqués.
 *
 * Sans lui, les règles visaient une case du calendrier au lieu de viser la
 * séance : « le lendemain de la sortie longue » était codé en dur au mardi, et
 * déplacer la sortie longue au mardi faisait viser le mardi, c'est-à-dire le
 * jour de la sortie longue elle-même. La règle ne protégeait alors plus rien.
 */
export interface ContexteSeance {
  /** Vrai si cette séance tombe le lendemain de la sortie longue de la semaine. */
  lendemainDeLongue: boolean
  /** Raideur au réveil saisie pour le jour de la séance, s'il y en a une. */
  raideurReveil?: number | null
}

/**
 * Au-delà, la course du lendemain de sortie longue passe au vélo, quel que
 * soit l'indice. C'est la règle de Mathieu, écrite dans la contrainte 6 : le
 * mardi n'est autorisé que parce qu'il est une récupération, et une raideur à
 * 3 le matin dit que la longue n'est pas digérée. L'indice ne la voyait pas :
 * il ne coupait la course qu'en rouge, donc à 65, et une raideur à 3 sur un
 * indice à 35 laissait courir.
 */
const SEUIL_RAIDEUR_LENDEMAIN = 2

const CONTEXTE_NEUTRE: ContexteSeance = { lendemainDeLongue: false }

/** Applique les effets d'adaptation à une séance. Ne mute pas l'original. */
export function applyFx(s: Session, fx: Fx, ctx: ContexteSeance = CONTEXTE_NEUTRE): Session {
  if (fx.legStop && TYPES_JAMBES.includes(s.type)) {
    return {
      ...s,
      type: 'repos',
      cat: 'Repos',
      title: 'Repos jambes imposé',
      dur: null,
      dist: undefined,
      adapted: `Indice ${fx.idx}/100`,
      motif: 'indice',
      struct: null,
      wu: null,
      main: null,
      cd: null,
      ex: null,
      note: 'Indice de charge du tendon au-delà de 80 : aucune charge sur les jambes aujourd’hui. Mobilité de cheville, jambes surélevées le soir. Si tu es encore ici dans trois jours, prends rendez-vous chez ton kiné.',
    }
  }
  if (fx.lightLegs && s.type === 'muscu-bas') {
    return {
      ...s,
      title: 'Bas du corps — version allégée',
      dur: [25, 30],
      adapted: `Indice ${fx.idx}/100`,
      motif: 'indice',
      ex: [
        ['Stanish unilatéral', '3 x 10', 'charge divisée par deux, 4 s à la descente'],
        ['Pointes de pied genou fléchi', '3 x 12', 'sans charge'],
        ['Pont fessier unilatéral', '3 x 12', ''],
        ['Mobilité cheville + voûte plantaire', '8 min', ''],
        ['Gainage', '3 x 40 s', ''],
      ],
      note: 'Le protocole excentrique reste, à charge réduite : c’est lui qui répare le tendon, l’arrêter complètement serait contre-productif. On enlève tout ce qui est lourd et pliométrique.',
    }
  }
  if (fx.runStop && TYPES_COURSE.includes(s.type)) {
    return {
      ...s,
      type: 'velo',
      cat: 'Vélo',
      title: 'Vélo Z2 50 min remplace la course',
      dur: [50, 60],
      adapted: `Indice ${fx.idx}/100 · course en pause`,
      motif: 'indice',
      // Sans ça une EF/tempo/sortie longue devenue vélo garde son kilométrage :
      // la carte afficherait « Vélo · 12 km » au lieu d'une durée.
      dist: undefined,
      struct: null,
      wu: null,
      main: null,
      cd: null,
      note: 'La course est en pause : l’indice de charge du tendon est dans le rouge. Vélo souple sans résistance, cadence élevée. La course revient quand l’indice repasse sous 65 et, après une crise, après deux matins calmes d’affilée.',
    }
  }
  if (s.type === 'long' && fx.slCut && s.dist) {
    const nd = Math.round(s.dist * (1 - fx.slCut))
    return {
      ...s,
      dist: nd,
      title: `Sortie longue de ${nd} km`,
      adapted: `Réduite de ${Math.round(fx.slCut * 100)} % · indice ${fx.idx}/100`,
      motif: 'indice',
      struct: [{ km: nd, zone: 'ef' }],
      note: 'Version réduite : le tendon a parlé. 100 % allure conversationnelle, protocole course/marche autorisé.',
    }
  }
  if (TYPES_QUALITE.includes(s.type) && (fx.cancelQuality || fx.qualityToBike)) {
    return {
      ...s,
      type: 'velo',
      cat: 'Vélo',
      title: fx.cancelQuality
        ? 'Vélo Z2 60 min remplace la qualité'
        : 'Vélo Z3 50 min remplace la qualité',
      dur: fx.cancelQuality ? [60, 70] : [50, 60],
      adapted: `Qualité neutralisée · indice ${fx.idx}/100`,
      motif: 'indice',
      dist: undefined,
      struct: null,
      wu: null,
      main: null,
      cd: null,
      note: fx.cancelQuality
        ? 'Aucune intensité cette semaine. Vélo en endurance pure, cadence 90 rpm.'
        : 'Intensité conservée mais sans impact : 5 x 6 min en Z3 sur le vélo, 3 min de récupération souple entre les blocs.',
    }
  }
  const raideurHaute =
    ctx.raideurReveil != null && ctx.raideurReveil > SEUIL_RAIDEUR_LENDEMAIN
  if (s.type === 'ef' && ctx.lendemainDeLongue && (fx.tuesdayToBike || raideurHaute)) {
    // L'indice passe d'abord quand il coupe : c'est lui qui explique le plus.
    const parIndice = fx.tuesdayToBike
    return {
      ...s,
      type: 'velo',
      cat: 'Vélo',
      title: 'Vélo Z2 45 min remplace l’EF',
      dur: [45, 55],
      adapted: parIndice
        ? `Course neutralisée · indice ${fx.idx}/100`
        : `Raideur au réveil ${formatNumber(ctx.raideurReveil!)}/10 · lendemain de sortie longue`,
      motif: parIndice ? 'indice' : 'raideur',
      dist: undefined,
      struct: null,
      note: parIndice
        ? 'Le lendemain de la sortie longue est le pire moment pour un tendon irrité. Vélo souple à la place.'
        : `Raideur au réveil à ${formatNumber(ctx.raideurReveil!)} sur dix le lendemain de la sortie longue : ta règle passe la course au vélo. La longue n'est pas digérée, et courir dessus l'aggrave. Vélo souple, sans résistance.`,
    }
  }
  return s
}

/**
 * Une séance telle qu'elle sera vécue, avec son identité dans le plan de
 * référence. L'identité ne se déduit plus de la séance affichée : un écart
 * peut la déplacer d'un jour à l'autre, et c'est le couple (jour d'origine,
 * slot) qui relie ressenti et écart à la ligne Supabase.
 */
export interface SeancePlanifiee {
  /** Écart volontaire appliqué, puis adaptation automatique par-dessus. */
  s: Session
  /**
   * Type de la séance dans le plan de référence, avant tout écart et toute
   * adaptation. C'est ce qui permet de dire « ta sortie longue est devenue du
   * vélo » plutôt que « tu as du vélo », qui n'apprend rien.
   */
  typePlan: SessionType
  /**
   * Semaine d'ORIGINE dans le plan. Avec `jourOrigine` et `slot`, la clé
   * Supabase. Depuis qu'un écart peut pousser une séance dans la semaine
   * voisine, elle ne se déduit plus de la date affichée.
   */
  semaineOrigine: number
  /** Jour d'ORIGINE dans le plan, 0-6. Avec `slot`, la clé Supabase. */
  jourOrigine: number
  slot: number
  /** Date ISO du jour effectif, déplacement compris. */
  day: string
  ecart: EcartRow | null
}

/**
 * Ce que le moteur doit savoir en plus du plan et de l'indice.
 */
export interface ContextePlan {
  /**
   * Clés `semaine-jourOrigine-slot` des séances déjà notées. Elles sont figées.
   *
   * C'est le ressenti, et non la date, qui atteste qu'une séance a eu lieu.
   * Sans ce gel, une sortie longue faite dans la journée puis notée le soir se
   * faisait raccourcir de 20 % par le ressenti qu'on venait d'en saisir : la
   * mesure réécrivait son propre objet, et la charge comptait ensuite les
   * kilomètres réduits au lieu des kilomètres courus.
   */
  faites?: Set<string>
  /** Plafond imposé à la prochaine sortie longue, voir `palier.ts`. */
  palier?: PalierLongue | null
  /** Plafond imposé à la prochaine séance spécifique du jeudi. */
  palierSpecifique?: PalierSpecifique | null
  /** Raideur au réveil par jour : la règle du lendemain de sortie longue la lit. */
  reveils?: Record<string, number>
  /** Huit semaines sans douleur au-dessus de 2 : le vélo du plan devient une course. */
  volumeOuvert?: boolean
  /**
   * Les ressentis par séance. Une séance notée prend la forme sous laquelle
   * elle a été faite : sans eux, une course passée au vélo par l'indice
   * redevenait une course dès qu'elle était notée.
   */
  realisees?: Map<string, FeedbackRow>
  /** L'état de reprise par jour, dans la fenêtre des dix jours, voir `reprise.ts`. */
  reprise?: Record<string, EtatReprise>
  /** Les plafonds de progression par séance, voir `progression.ts`. */
  plafonds?: Map<string, Plafond>
}

/**
 * Le vélo du plan devenu course facile, de la même durée. C'est la sortie de
 * la contrainte 5, appliquée d'elle-même depuis le 29 septembre 2026 : si le
 * compteur l'a ouverte, c'est que le tendon va bien et peut de nouveau
 * enchaîner. L'indice passe par-dessus : une bande rouge la rend au vélo.
 */
export function ouvrirVolume(s: Session): Session {
  return {
    ...versType(s, 'ef'),
    adapted: 'Volume ouvert · huit semaines sans douleur au-dessus de 2',
    motif: 'volume',
    note: 'Huit semaines sans douleur au-dessus de 2 sur dix : le vélo de la semaine devient une course facile, de la même durée. Allure de conversation du début à la fin. Elle redevient du vélo dès qu’un réveil ou une fin de journée dépasse 2, ou qu’une douleur d’effort atteint 4.',
  }
}

/**
 * Le contexte du plan, calculé une fois par écran et passé à `weekSessions`.
 *
 * Les deux informations qu'il porte se lisent hors d'une semaine donnée : la
 * liste des séances notées vaut pour tout le plan, et le palier compare la
 * dernière sortie longue faite à la prochaine à venir, qui n'est presque
 * jamais dans la même semaine.
 */
export function construireContexte(
  weeks: Week[],
  feedback: FeedbackRow[],
  pain: PainMap,
  now: string,
  ecarts?: Map<string, EcartRow>,
  /** L'indice par jour, quand il est déjà calculé : il décide de l'ouverture du volume. */
  indices?: Record<string, { idx: number }>,
): ContextePlan {
  const seances = arrangerPlan(weeks, ecarts)
  // La reprise se lit du passé récent jusqu'au bout de la fenêtre de dix jours.
  const reprise: Record<string, EtatReprise> = {}
  for (let k = -56; k <= 10; k++) {
    const d = addDays(now, k)
    const e = etatReprise(d, pain, now)
    if (e) reprise[d] = e
  }
  return {
    faites: new Set(feedback.map((f) => cleEcart(f.week, f.day_index, f.slot))),
    realisees: new Map(feedback.map((f) => [cleEcart(f.week, f.day_index, f.slot), f])),
    reprise,
    plafonds: plafondsProgression(seances, feedback, now),
    palier: palierProchaineLongue(seances, feedback, pain, now),
    palierSpecifique: palierProchaineSpecifique(seances, feedback, pain, now),
    volumeOuvert: progresVolume(pain, now, indices).atteint,
    reveils: Object.fromEntries(
      Object.entries(pain)
        .filter(([, p]) => p?.wake != null)
        .map(([d, p]) => [d, p.wake as number]),
    ),
  }
}

const TYPES_QUALITE_REPRISE: SessionType[] = ['inter', 'tempo', 'test']
const ZONES_FACILES = ['ef', 'recup']

/** Une distance plafonnée par la progression du volume, voir `progression.ts`. */
export function appliquerPlafond(s: Session, p: Plafond): Session {
  const out = avecDistance(s, p.km)
  if (p.motif === 'plafond' && p.reference) {
    return {
      ...out,
      adapted: `Plafonnée à ${formatNumber(p.km)} km · plus longue du mois : ${formatNumber(p.reference.km)} km`,
      motif: 'plafond',
      note: `Ta plus longue sortie des trente derniers jours fait ${formatNumber(p.reference.km)} km : celle-ci ne la dépasse pas de plus de 10 %. Au-delà, le risque de blessure monte, et plus nettement que sur une semaine trop chargée. Elle regagne sa distance prévue de sortie en sortie.`,
    }
  }
  const part = p.part != null ? Math.round(p.part * 100) : null
  return {
    ...out,
    adapted: `Volume en remontée · ${formatNumber(p.km)} km au lieu de ${formatNumber(s.dist ?? 0)}`,
    motif: 'progression',
    note:
      (part != null ? `La semaine dernière a porté ${part} % de ce que le plan prévoyait. ` : '') +
      'Le volume remonte de 15 % au plus par semaine : c’est cette course qui cède, en gardant le même nombre de sorties. Le plan retrouve ses chiffres de lui-même, d’autant plus vite que l’épisode a été court.',
  }
}

/** La séance telle que la reprise la laisse : course suspendue, ou intensité en pause. */
export function appliquerReprise(s: Session, etat: EtatReprise): Session {
  if (!TYPES_COURSE.includes(s.type)) return s
  const raison = raisonEpisode(etat.episode)
  if (etat.courseSuspendue) {
    return {
      ...s,
      type: 'velo',
      cat: 'Vélo',
      title: 'Vélo Z2 50 min remplace la course',
      dur: [50, 60],
      dist: undefined,
      struct: null,
      wu: null,
      main: null,
      cd: null,
      adapted: `Course en pause · ${raison}`,
      motif: 'reprise',
      note: `La course revient après ${etat.requis} matins calmes d’affilée, et tu en as ${etat.calmes} : réveil à 2 ou moins, et la veille ni fin de journée au-dessus de 2 ni effort au-dessus de 3. C’est le critère de reprise de la course des rééducations du tendon d’Achille. Vélo souple d’ici là, cadence haute.`,
    }
  }
  if (!etat.intensiteSuspendue || s.type === 'course') return s
  const intense = TYPES_QUALITE_REPRISE.includes(s.type) || s.struct?.some((seg) => !ZONES_FACILES.includes(seg.zone))
  if (!intense) return s
  const km = s.dist
  const facile: Session = TYPES_QUALITE_REPRISE.includes(s.type)
    ? {
        ...s,
        type: 'ef',
        cat: 'Course facile',
        title: km ? `Course facile de ${formatNumber(km)} km` : 'Course facile',
        struct: km ? [{ km, zone: 'ef' }] : null,
        wu: null,
        main: null,
        cd: null,
        specifique: undefined,
        // Plus une qualité : ses étiquettes partent avec elle.
        qualite: undefined,
        seuilMin: undefined,
      }
    : { ...s, struct: km ? [{ km, zone: 'ef' }] : null }
  return {
    ...facile,
    adapted: `Intensité en pause · ${raison}`,
    motif: 'intensite',
    note: `Pas d’intensité tant que le tendon n’a pas aligné ${etat.requis} matins calmes (${avancement(etat)}). L’intensité est la première chose qu’on retire et la dernière qu’on rend : même distance, tout en allure de conversation.`,
  }
}

/**
 * La forme d'une séance à venir telle que la charge doit la projeter : les
 * règles qui ne dépendent pas de l'indice (ouverture du volume, plafonds de
 * progression, reprise). L'indice, lui, se calcule sur cette charge : il ne
 * peut pas entrer dans sa propre projection.
 */
export function formeProjetee(
  s: Session,
  plan: Session,
  cle: string,
  day: string,
  now: string,
  contexte: ContextePlan,
): Session {
  if (s.saute) return s
  let v = s
  if (contexte.volumeOuvert && s.type === 'velo' && plan.type === 'velo' && day >= now) v = ouvrirVolume(v)
  const p = contexte.plafonds?.get(cle)
  if (p && v.dist && v.dist > p.km) v = appliquerPlafond(v, p)
  const e = contexte.reprise?.[day]
  if (e) v = appliquerReprise(v, e)
  return v
}

/** Après une crise : la course du lendemain d'une course passe au vélo. */
function alternerAuVelo(s: Session): Session {
  return {
    ...s,
    type: 'velo',
    cat: 'Vélo',
    title: 'Vélo Z2 45 min remplace la course',
    dur: [45, 55],
    dist: undefined,
    struct: null,
    wu: null,
    main: null,
    cd: null,
    adapted: 'Reprise · un jour sans course entre deux courses',
    motif: 'alternance',
    note: 'Tu sors d’une crise : tant que l’intensité est en pause, un jour sans course sépare deux courses. Le collagène du tendon est en perte nette dans les 24 à 36 heures qui suivent une charge, puis il se reconstruit : c’est ce jour-là qui le lui laisse.',
  }
}

/**
 * La séance notée, telle que son ressenti dit qu'elle a été faite. Quand le
 * calcul redonne la même discipline, on garde sa forme et son étiquette ; la
 * distance notée fait foi, sauf « donnée réelle » saisie après coup. Sinon,
 * la forme vient du ressenti seul.
 */
function reconcilier(v: Session, base: Session, fait: FeedbackRow, distanceCorrigee: boolean): Session {
  if (v.type === fait.session_type) {
    const km = distanceCorrigee ? base.dist : (fait.distance_km ?? v.dist)
    if (km == null || v.dist == null || Math.abs(km - v.dist) < 0.05) return v
    const out = avecDistance(v, km)
    // Courue sur toute la distance prévue : l'adaptation n'a pas eu lieu.
    return base.dist != null && km >= base.dist ? { ...out, adapted: undefined, motif: undefined } : out
  }
  if (base.type === fait.session_type) return formeNotee(base, fait, distanceCorrigee)
  return {
    ...formeNotee(base, fait, distanceCorrigee),
    adapted: `Faite en ${labelType(fait.session_type as SessionType).toLowerCase()}`,
    motif: 'faite',
  }
}

/**
 * Le jour de la sortie longue dans la semaine RÉELLE, écarts compris.
 * `null` s'il n'y en a pas, ou si elle est sautée.
 */
function jourDeLaLongue(seances: Session[]): number | null {
  const longue = seances.find((s) => s.type === 'long' && !s.saute)
  return longue ? longue.day : null
}

/**
 * Les séances de la semaine : écart volontaire d'abord, puis palier, puis
 * adaptation d'après l'indice projeté du jour où la séance atterrit réellement.
 *
 * L'ordre est celui du dépôt : la décision de Mathieu passe d'abord, les
 * protections s'appliquent par-dessus. Le palier vient avant l'indice pour que
 * l'éventuelle coupe de 20 % morde sur la distance déjà plafonnée, et pas
 * l'inverse.
 */
export function weekSessions(
  week: Week,
  now: string,
  byDate: Record<string, IndexBreakdown>,
  ecarts?: Map<string, EcartRow>,
  contexte?: ContextePlan,
): SeancePlanifiee[] {
  const slots = slotsParJour(week.sessions)
  const avecEcarts = ecarts ? seancesAvecEcarts(week, ecarts) : week.sessions
  const jourLongue = jourDeLaLongue(avecEcarts)

  const out = avecEcarts.map((s, i) => {
    const jourOrigine = week.sessions[i].day
    const slot = slots[i]
    // `semaines` porte le déplacement d'une semaine à l'autre : la clé
    // Supabase reste celle du plan de référence, seule la date change.
    const day = addDays(week.monday, s.day + 7 * (s.semaines ?? 0))
    const cle = cleEcart(week.n, jourOrigine, slot)
    const fait = contexte?.realisees?.get(cle)

    // Sans le détail du ressenti, une séance notée reste figée telle que le
    // plan la donne : c'est l'ancien gel, gardé pour les appelants qui ne
    // passent que les clés.
    const figee = !fait && Boolean(contexte?.faites?.has(cle))

    let vecue = s
    if (!figee) {
      // Les règles de progression ne visent que ce qui reste à courir : ni une
      // séance sautée, ni une séance déjà faite.
      if (!s.saute && !fait) {
        // Le vélo DU PLAN seulement : un vélo que Mathieu a posé lui-même
        // par un écart reste sa décision. Et jamais dans le passé.
        if (contexte?.volumeOuvert && s.type === 'velo' && week.sessions[i].type === 'velo' && day >= now) {
          vecue = ouvrirVolume(vecue)
        }
        const palier = contexte?.palier
        if (palier && s.type === 'long' && day === palier.jour && s.dist && s.dist > palier.km) {
          vecue = appliquerPalier(vecue, palier)
        }
        // Même règle pour la séance spécifique du jeudi, qui grossit d'une
        // répétition par semaine : si la précédente n'est pas passée, on répète
        // au lieu de monter.
        const ps = contexte?.palierSpecifique
        if (ps && s.specifique && day === ps.jour) {
          vecue = appliquerPalierSpecifique(vecue, ps)
        }
        // Le palier d'abord, les plafonds de volume ensuite : ils ne font
        // que baisser, et la coupe de l'indice mord sur ce qu'ils laissent.
        const plafond = contexte?.plafonds?.get(cle)
        if (plafond && vecue.dist && vecue.dist > plafond.km) vecue = appliquerPlafond(vecue, plafond)
      }
      if (!fait || day <= now) {
        vecue = applyFx(vecue, fxForDate(day, now, byDate), {
          lendemainDeLongue: jourLongue != null && s.day === jourLongue + 1,
          raideurReveil: contexte?.reveils?.[day] ?? null,
        })
        const etat = contexte?.reprise?.[day]
        if (etat) vecue = appliquerReprise(vecue, etat)
      }
      // Une séance sautée garde l'ADAPTATION à l'écran mais perd son
      // étiquette (retour du 22 septembre) : Mathieu a sauté le vélo que
      // l'indice avait posé, pas la course du plan, et la carte doit dire
      // « vélo sauté ». Rien ne change au calcul : une séance sautée vaut
      // zéro dans la charge, quelle que soit sa discipline.
      if (s.saute) vecue = { ...vecue, adapted: undefined, motif: undefined }
    }

    return {
      s: vecue,
      base: s,
      fait,
      typePlan: week.sessions[i].type,
      semaineOrigine: week.n,
      jourOrigine,
      slot,
      day,
      ecart: ecarts?.get(cle) ?? null,
    }
  })

  // Après une crise, tant que l'intensité est en pause : un jour sans course
  // entre deux courses. Seul le couple lundi-mardi du plan est concerné en
  // pratique ; c'est la course du lendemain qui passe au vélo, sauf si c'est
  // la sortie longue, qui garde sa place.
  const courues = out
    .filter((x) => !x.s.saute && !x.fait && TYPES_COURSE.includes(x.s.type))
    .sort((a, b) => (a.day < b.day ? -1 : 1))
  for (let k = 1; k < courues.length; k++) {
    const [a, b] = [courues[k - 1], courues[k]]
    if (addDays(a.day, 1) !== b.day || !contexte?.reprise?.[b.day]?.alterner) continue
    const cible = b.s.type === 'long' ? a : b
    if (TYPES_COURSE.includes(cible.s.type)) cible.s = alternerAuVelo(cible.s)
  }

  // Une séance notée prend la forme sous laquelle elle a été faite.
  return out.map(({ base, fait, ...x }) =>
    fait ? { ...x, s: reconcilier(x.s, base, fait, x.ecart?.patch.dist != null) } : x,
  )
}

/**
 * Les séances qui tombent RÉELLEMENT dans cette semaine, y compris celles
 * qu'un écart y a poussées depuis la semaine d'avant ou d'après.
 *
 * `weekSessions` raisonne sur une semaine du plan de référence ; depuis que
 * les écarts peuvent franchir la frontière du dimanche, la semaine du plan et
 * la semaine du calendrier ne coïncident plus. Un écran qui affiche des jours
 * doit donc balayer les trois semaines voisines et filtrer par date.
 */
export function seancesDeLaSemaine(
  weeks: Week[],
  week: Week,
  now: string,
  byDate: Record<string, IndexBreakdown>,
  ecarts?: Map<string, EcartRow>,
  contexte?: ContextePlan,
): SeancePlanifiee[] {
  const i = weeks.findIndex((w) => w.n === week.n)
  const fin = addDays(week.monday, 6)
  const out: SeancePlanifiee[] = []
  for (const k of [i - 1, i, i + 1]) {
    const w = weeks[k]
    if (!w) continue
    for (const x of weekSessions(w, now, byDate, ecarts, contexte)) {
      if (x.day >= week.monday && x.day <= fin) out.push(x)
    }
  }
  return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.slot - b.slot))
}

export interface Rule {
  id: string
  title: string
  action: string
}

export interface AdaptResult {
  level: 0 | 1 | 2 | 3
  band: Band
  idx: number
  detail: IndexBreakdown
  rules: Rule[]
  fx: Fx
  /** Nombre de séances avec ressenti enregistré. */
  n: number
  stale: boolean
  /** Table complète de l'indice, pour les écrans qui en ont besoin (graphiques). */
  byDate: Record<string, IndexBreakdown & { day: string; load: number }>
}

const NIVEAU: Record<Band['key'], 0 | 1 | 2 | 3> = { vert: 0, jaune: 0, orange: 1, rouge: 2, noir: 3 }

const TEXTE_BANDE: Partial<Record<Band['key'], string>> = {
  orange:
    'Séance de qualité remplacée par du vélo Z3, renfo bas du corps allégé, sortie longue raccourcie de 20 %.',
  rouge:
    'Aucune course. Vélo Z2 et haut du corps uniquement, renfo mollet à charge légère, une à deux fois par semaine.',
  noir: 'Repos complet des jambes. Mobilité de cheville seulement. Trois jours dans cette zone et tu appelles ton kiné.',
}

/** Une séance de qualité (tempo, intervalles, test, course) au sens du feu vert / allures. */
function estQualite(sessionType: string): boolean {
  return ['inter', 'tempo', 'test', 'course', 'race'].includes(sessionType)
}

export function adapt(
  load: LoadMap,
  pain: PainMap,
  feedback: FeedbackRow[],
  now: string,
  attestes?: Set<string>,
): AdaptResult {
  const series = indexSeries(addDays(now, -56), addDays(now, 10), load, pain, attestes)
  const byDate = Object.fromEntries(series.map((r) => [r.day, r])) as Record<
    string,
    IndexBreakdown & { day: string; load: number }
  >
  const detail = byDate[now] ?? series[series.length - 1]
  const band = bandOf(detail.idx)
  const level = NIVEAU[band.key]
  const fx = fxForDate(now, now, byDate)

  const rules: Rule[] = []
  if (level > 0) {
    // Une seule règle ici : ce que le plan devient. Le détail de ce qui pèse
    // le plus dans l'indice vit dans la feuille « Calcul de la charge », qui
    // le montre terme par terme — le répéter en alerte n'ajoutait rien.
    rules.push({
      id: 'IDX',
      title: `Indice de charge du tendon à ${detail.idx} sur 100`,
      action: TEXTE_BANDE[band.key] ?? '',
    })
  }

  // Allures trop rapides : deux séances de qualité d'affilée à 9/10 ou plus, sans douleur.
  const entries = [...feedback].sort((a, b) => (a.day < b.day ? 1 : -1))
  const qual = entries.filter((v) => estQualite(v.session_type)).slice(0, 2)
  if (qual.length === 2 && qual.every((v) => v.rpe >= 9 && v.pain < 4)) {
    rules.push({
      id: 'ALLURES',
      title: 'Deux séances de qualité à 9/10 d’effort ou plus, sans douleur',
      action:
        'Les allures cibles sont trop rapides pour l’instant : ajoute 5 s/km sur toutes les zones dans l’onglet Objectif.',
    })
  }

  // Feu vert : deux semaines sous 25 sans à-coup.
  //
  // Jamais sans douleur saisie récemment, ni sans charge attestée : un indice
  // bas obtenu par absence de données n'est pas un feu vert, c'est un angle
  // mort. Autoriser une hausse de volume là-dessus serait exactement l'erreur
  // que l'indice existe pour éviter, et les deux absences s'y prêtent autant
  // l'une que l'autre.
  const last14 = series.filter((r) => r.day <= now && r.day > addDays(now, -14))
  if (
    !detail.painInconnue &&
    !detail.chargeInconnue &&
    band.key === 'vert' &&
    last14.length >= 10 &&
    Math.max(...last14.map((r) => r.idx)) <= 25
  ) {
    rules.push({
      id: 'FEUVERT',
      title: 'Deux semaines sous 25 sans à-coup',
      action:
        'Le tendon a tourné la page : le plan se déroule tel quel. Le volume, lui, s’ouvre à huit semaines sans douleur au-dessus de 2, et le compteur est dans Suivi.',
    })
  }

  // Sortie de la contrainte 5 : le vélo du mercredi redevient une course.
  //
  // Décision de Mathieu, prise le 4 septembre 2026 et confirmée le 29 : deux
  // mois sans douleur déclarée et le volume s'ouvre, le vélo devenant une
  // course facile. `weekSessions` l'applique de lui-même (`volumeOuvert`) ;
  // cette règle l'annonce. C'est le levier qui pèse le
  // plus sur le chrono d'avril après « finir les blocs sans interruption »,
  // parce qu'un plan à 55 km ne prépare pas les dix derniers kilomètres.
  //
  // Deux mois et pas six semaines : le tendon s'adapte plus lentement que le
  // muscle, et c'est exactement ce décalage qui fait la tendinopathie. Sur un
  // arbitrage entre deux durées défendables, on prend la longue.
  //
  // La règle exige des SAISIES, pas leur absence. Un carnet vide affiche zéro
  // douleur et déclencherait le feu vert le plus dangereux de l'app : celui
  // qui autorise 10 km de course en plus sur un tendon dont on ne sait rien.
  const fenetre = verdictVolume(pain, now, byDate)
  if (fenetre) {
    const commun =
      `${fenetre.releves} réveils notés sur les ${fenetre.jours} derniers jours, aucun jour à ${SEUIL_OUVERTURE} ou plus ` +
      'sur l’indice, et une raideur qui ne monte pas.'
    rules.push({
      id: 'VOLUME',
      title: 'Deux mois sans orange',
      action:
        `${commun} Le tendon a tenu la charge : le vélo du mercredi devient une course facile, ` +
        `de la même durée. Il redevient du vélo dès que l’indice atteint ${SEUIL_OUVERTURE}.`,
    })
  }

  return { level, band, idx: detail.idx, detail, rules, fx, n: entries.length, stale: detail.stale, byDate }
}

/**
 * « Plus de douleur » ne veut pas dire zéro : la douleur de fond de Mathieu
 * tourne autour de 0,8 au réveil et 1,3 en fin de journée. Le seuil est donc
 * 2, au-dessus duquel le tendon parle.
 */
export { SEUIL_SANS_DOULEUR, EFFORT_TOLERE }

/**
 * La sortie de la contrainte 5 : une seule marche, à huit semaines.
 *
 * Il y en avait deux, un mois puis deux mois, du temps où la semaine portait
 * deux vélos. Elle n'en porte plus qu'un depuis le 18 septembre, et Mathieu a
 * gardé les huit semaines le 29 : c'est aussi l'ordre de grandeur des
 * programmes qui modifient un tendon adulte (Bohm, Mersmann et Arampatzis 2015,
 * huit semaines au moins).
 *
 * Trois relevés sur quatre au minimum dans la fenêtre : en dessous, c'est du
 * silence et pas une absence de douleur, et ce serait le feu vert le plus
 * dangereux de l'app.
 */
const PALIERS_VOLUME = [{ palier: 2 as const, jours: 56, releves: 42 }]

export interface VerdictVolume {
  /** Toujours 2 depuis le 29 septembre 2026 : le nom de l'ancien second palier est resté. */
  palier: 2
  /** Relevés exploitables dans la fenêtre, pour que le message cite du réel. */
  releves: number
  jours: number
}

/** Où en est l'ouverture du volume, pour l'afficher avant qu'elle arrive. */
export interface ProgresVolume {
  /** Jours d'affilée sans aucune douleur au-dessus du seuil, aujourd'hui compris. */
  jours: number
  /** Réveils saisis dans la fenêtre, qui compte les 56 derniers jours au plus. */
  releves: number
  joursRequis: number
  relevesRequis: number
  atteint: boolean
  /** Le jour où l'indice a remis le compteur à zéro, et sa valeur sur 100. */
  remise: { day: string; indice: number } | null
  /** Raideur moyenne de la semaine écoulée contre celle d'avant, quand elle monte. */
  raideurEnHausse: { avant: number; apres: number } | null
}

/**
 * Le compteur de l'ouverture du volume (question de Mathieu, 29 septembre
 * 2026 : « comment savoir où j'en suis ? »). Même règle que le second palier
 * de `verdictVolume` : 56 jours sans orange (voir `remiseAZero`), et 42 réveils notés
 * au moins, parce qu'un carnet vide n'est pas un tendon calme.
 *
 * Le compteur ne remonte pas avant la première saisie du carnet : des jours
 * dont on ne sait rien ne sont pas des jours propres.
 */
/**
 * Ce qui remet le compteur à zéro : un jour où l'indice atteint l'orange.
 *
 * Arbitré par Mathieu le 5 octobre 2026. La règle d'avant lisait chaque
 * relevé (réveil ou soir au-dessus de 2, effort au-dessus de 3), et un seul
 * réveil à 2,5 effaçait huit semaines : trop violent pour un compteur aussi
 * long. Depuis, seul compte le seuil où le plan change de lui-même, 50 : un
 * relevé à 4 y suffit par les planchers, un 3 isolé ne l'atteint pas.
 *
 * Sans l'indice du jour (le contexte se construit avant la charge, ou le jour
 * sort de la fenêtre calculée), on lit le plancher que les relevés posent à
 * eux seuls : c'est par lui que l'indice franchit 50 dans l'immense majorité
 * des cas.
 */
export const SEUIL_OUVERTURE = 50

function remiseAZero(d: string, pain: PainMap, indices?: Record<string, { idx: number }>): number | null {
  const lu = indices?.[d]?.idx
  if (lu != null) return lu >= SEUIL_OUVERTURE ? lu : null
  const p = pain[d]
  if (!p) return null
  const plancher = Math.max(
    p.wake != null ? plancherDuReleve(p.wake, 'reveil') : 0,
    ...[p.effort, p.evening].map((v) => (v != null ? plancherDuReleve(v, 'effort') : 0)),
  )
  return plancher >= SEUIL_OUVERTURE ? plancher : null
}

/** Hausse de la raideur moyenne tolérée d'une semaine à l'autre, en points. */
export const HAUSSE_RAIDEUR_SEMAINE = 0.5

/** Moyenne des réveils de `debut` à `debut + 6`, `null` sous trois relevés. */
function raideurDeLaSemaine(pain: PainMap, debut: string): number | null {
  const vs: number[] = []
  for (let k = 0; k < 7; k++) {
    const w = pain[addDays(debut, k)]?.wake
    if (w != null) vs.push(w)
  }
  return vs.length >= 3 ? vs.reduce((a, b) => a + b, 0) / vs.length : null
}

export function progresVolume(pain: PainMap, now: string, indices?: Record<string, { idx: number }>): ProgresVolume {
  const { jours: joursRequis, releves: relevesRequis } = PALIERS_VOLUME[0]
  const premier = Object.keys(pain).sort()[0]
  let jours = 0
  let releves = 0
  let remise: ProgresVolume['remise'] = null
  if (premier) {
    for (let k = 0; addDays(now, -k) >= premier; k++) {
      const d = addDays(now, -k)
      const indice = remiseAZero(d, pain, indices)
      if (indice != null) {
        remise = { day: d, indice }
        break
      }
      jours++
      // Le relevé qui compte est le réveil : c'est la mesure de référence.
      if (pain[d]?.wake != null && k < joursRequis) releves++
    }
  }
  // La raideur ne doit pas monter d'une semaine à l'autre (Silbernagel 2007) :
  // la semaine écoulée contre celle d'avant.
  const apres = raideurDeLaSemaine(pain, addDays(now, -6))
  const avant = raideurDeLaSemaine(pain, addDays(now, -13))
  const raideurEnHausse =
    apres != null && avant != null && apres >= avant + HAUSSE_RAIDEUR_SEMAINE ? { avant, apres } : null
  return {
    jours,
    releves,
    joursRequis,
    relevesRequis,
    atteint: jours >= joursRequis && releves >= relevesRequis && !raideurEnHausse,
    remise,
    raideurEnHausse,
  }
}

/** Le verdict de la règle VOLUME : le même compteur, pour qu'un écran ne puisse pas contredire l'autre. */
export function verdictVolume(pain: PainMap, now: string, indices?: Record<string, { idx: number }>): VerdictVolume | null {
  const p = progresVolume(pain, now, indices)
  return p.atteint ? { palier: 2, releves: p.releves, jours: p.joursRequis } : null
}
