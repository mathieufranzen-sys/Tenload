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
  type Band,
  type IndexBreakdown,
  type LoadMap,
  type PainMap,
} from './tendonIndex'
import type { Session, SessionType, Week } from '../data/types'
import { cleEcart, seancesAvecEcarts, slotsParJour, type EcartRow } from './overrides'
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
      struct: null,
      wu: null,
      main: null,
      cd: null,
      ex: null,
      note: 'Indice de charge du tendon au-delà de 80 : aucune charge sur les jambes aujourd’hui. Mobilité de cheville, glaçage 15 minutes deux fois dans la journée, jambes surélevées le soir. Si tu es encore ici dans trois jours, prends rendez-vous chez ton kiné.',
    }
  }
  if (fx.lightLegs && s.type === 'muscu-bas') {
    return {
      ...s,
      title: 'Bas du corps — version allégée',
      dur: [25, 30],
      adapted: `Indice ${fx.idx}/100`,
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
      // Sans ça une EF/tempo/sortie longue devenue vélo garde son kilométrage :
      // la carte afficherait « Vélo · 12 km » au lieu d'une durée.
      dist: undefined,
      struct: null,
      wu: null,
      main: null,
      cd: null,
      note: 'La course est en pause : l’indice de charge du tendon est dans le rouge. Vélo souple sans résistance, cadence élevée. Le tendon redevient disponible dès que l’indice repasse sous 65.',
    }
  }
  if (s.type === 'long' && fx.slCut && s.dist) {
    const nd = Math.round(s.dist * (1 - fx.slCut))
    return {
      ...s,
      dist: nd,
      title: `Sortie longue de ${nd} km`,
      adapted: `Réduite de ${Math.round(fx.slCut * 100)} % · indice ${fx.idx}/100`,
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
): ContextePlan {
  const seances = arrangerPlan(weeks, ecarts)
  return {
    faites: new Set(feedback.map((f) => cleEcart(f.week, f.day_index, f.slot))),
    palier: palierProchaineLongue(seances, feedback, pain, now),
    palierSpecifique: palierProchaineSpecifique(seances, feedback, pain, now),
    reveils: Object.fromEntries(
      Object.entries(pain)
        .filter(([, p]) => p?.wake != null)
        .map(([d, p]) => [d, p.wake as number]),
    ),
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

  return avecEcarts.map((s, i) => {
    const jourOrigine = week.sessions[i].day
    const slot = slots[i]
    // `semaines` porte le déplacement d'une semaine à l'autre : la clé
    // Supabase reste celle du plan de référence, seule la date change.
    const day = addDays(week.monday, s.day + 7 * (s.semaines ?? 0))
    const cle = cleEcart(week.n, jourOrigine, slot)

    // Une séance déclarée non faite ne reçoit aucune adaptation : il n'y a
    // plus rien à protéger. Une séance déjà notée non plus, pour la même
    // raison — elle est derrière lui.
    const figee = s.saute || Boolean(contexte?.faites?.has(cle))

    let vecue = s
    if (!figee) {
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
      vecue = applyFx(vecue, fxForDate(day, now, byDate), {
        lendemainDeLongue: jourLongue != null && s.day === jourLongue + 1,
        raideurReveil: contexte?.reveils?.[day] ?? null,
      })
    }

    return {
      s: vecue,
      typePlan: week.sessions[i].type,
      semaineOrigine: week.n,
      jourOrigine,
      slot,
      day,
      ecart: ecarts?.get(cle) ?? null,
    }
  })
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

export const TEXTE_BANDE: Partial<Record<Band['key'], string>> = {
  orange:
    'Séance de qualité remplacée par du vélo Z3, renfo bas du corps allégé, sortie longue raccourcie de 20 %.',
  rouge:
    'Aucune course. Vélo Z2 et haut du corps uniquement, protocole excentrique quotidien à charge légère.',
  noir: 'Repos complet des jambes. Mobilité et glaçage seulement. Trois jours dans cette zone et tu appelles ton kiné.',
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
        'Le tendon a tourné la page. Tu peux transformer un vélo en course facile, ou pousser la sortie longue de 2 km de plus que prévu.',
    })
  }

  // Sortie de la contrainte 5 : les deux vélos redeviennent de la course.
  //
  // Décision de Mathieu, prise le 4 septembre 2026 : deux mois sans douleur
  // déclarée et le volume s'ouvre au-dessus de 60 km par semaine, en
  // remplaçant les vélos par des sorties faciles. C'est le levier qui pèse le
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
  const fenetre = verdictVolume(pain, now)
  if (fenetre) {
    const commun =
      `${fenetre.releves} relevés sur les ${fenetre.jours} derniers jours, ` +
      `aucun au-dessus de ${SEUIL_SANS_DOULEUR}.`
    rules.push({
      id: 'VOLUME',
      title:
        fenetre.palier === 1
          ? `Un mois sans douleur au-dessus de ${SEUIL_SANS_DOULEUR} sur dix`
          : `Deux mois sans douleur au-dessus de ${SEUIL_SANS_DOULEUR} sur dix`,
      action:
        fenetre.palier === 1
          ? `${commun} Premier palier : le vélo du jeudi peut devenir la séance spécifique, et la ` +
            'semaine passe à quatre jours de course. Le vélo du vendredi reste, et la séance ' +
            'spécifique démarre courte.'
          : `${commun} Second palier : le tendon a tenu la charge, le vélo du vendredi peut ` +
            'devenir une course facile et la semaine passer au-dessus de 60 km. Un seul ' +
            'changement à la fois.',
    })
  }

  return { level, band, idx: detail.idx, detail, rules, fx, n: entries.length, stale: detail.stale, byDate }
}

/**
 * « Plus de douleur » ne veut pas dire zéro : la douleur de fond de Mathieu
 * tourne autour de 0,8 au réveil et 1,3 en fin de journée. Le seuil est donc
 * 2, au-dessus duquel le tendon parle.
 */
export const SEUIL_SANS_DOULEUR = 2

/**
 * La sortie de la contrainte 5 se fait en deux temps, pas d'un coup.
 *
 * Le vélo est un substitut à la course : il part quand la course revient. Mais
 * rendre les deux d'un seul coup ajouterait deux jours d'impact la même
 * semaine, sur un tendon dont c'est justement le décalage d'adaptation qui
 * l'avait blessé. Un mois ouvre le premier, deux mois le second.
 *
 * Trois relevés sur quatre au minimum dans chaque fenêtre : en dessous, c'est
 * du silence et pas une absence de douleur, et ce serait le feu vert le plus
 * dangereux de l'app.
 */
const PALIERS_VOLUME = [
  { palier: 2 as const, jours: 56, releves: 42 },
  { palier: 1 as const, jours: 28, releves: 21 },
]

export interface VerdictVolume {
  /** 1 : un vélo devient la séance spécifique. 2 : le second devient une course. */
  palier: 1 | 2
  /** Relevés exploitables dans la fenêtre, pour que le message cite du réel. */
  releves: number
  jours: number
}

export function verdictVolume(pain: PainMap, now: string): VerdictVolume | null {
  // Du plus exigeant au moins exigeant : le premier atteint gagne.
  for (const { palier, jours, releves: minimum } of PALIERS_VOLUME) {
    let releves = 0
    let propre = true
    for (let k = 0; k < jours && propre; k++) {
      const p = pain[addDays(now, -k)]
      if (!p) continue
      const vs = [p.wake, p.effort, p.evening].filter((x): x is number => x != null)
      if (vs.length === 0) continue
      if (Math.max(...vs) > SEUIL_SANS_DOULEUR) propre = false
      else releves++
    }
    if (propre && releves >= minimum) return { palier, releves, jours }
  }
  return null
}
