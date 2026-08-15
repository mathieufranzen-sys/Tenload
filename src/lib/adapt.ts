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
import { addDays } from './dates'
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
 * l'ensemble des 35 semaines — c'était le bug de la version HTML.
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
  'long', 'ef', 'inter', 'tempo', 'test', 'course', 'velo', 'muscu-bas', 'escalade',
]
const TYPES_COURSE: SessionType[] = ['long', 'ef', 'inter', 'tempo', 'test', 'course']
const TYPES_QUALITE: SessionType[] = ['inter', 'tempo', 'test']

/** Applique les effets d'adaptation à une séance. Ne mute pas l'original. */
export function applyFx(s: Session, fx: Fx): Session {
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
  if (s.type === 'ef' && s.day === 1 && fx.tuesdayToBike) {
    return {
      ...s,
      type: 'velo',
      cat: 'Vélo',
      title: 'Vélo Z2 45 min remplace l’EF',
      dur: [45, 55],
      adapted: `Course neutralisée · indice ${fx.idx}/100`,
      dist: undefined,
      struct: null,
      note: 'Le lendemain de la sortie longue est le pire moment pour un tendon irrité. Vélo souple à la place.',
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
  /** Jour d'ORIGINE dans le plan, 0-6. Avec `slot`, la clé Supabase. */
  jourOrigine: number
  slot: number
  /** Date ISO du jour effectif, déplacement compris. */
  day: string
  ecart: EcartRow | null
}

/**
 * Les séances de la semaine : écart volontaire d'abord, puis adaptation
 * d'après l'indice projeté du jour où la séance atterrit réellement.
 */
export function weekSessions(
  week: Week,
  now: string,
  byDate: Record<string, IndexBreakdown>,
  ecarts?: Map<string, EcartRow>,
): SeancePlanifiee[] {
  const slots = slotsParJour(week.sessions)
  const avecEcarts = ecarts ? seancesAvecEcarts(week, ecarts) : week.sessions

  return avecEcarts.map((s, i) => {
    const jourOrigine = week.sessions[i].day
    const slot = slots[i]
    const day = addDays(week.monday, s.day)
    return {
      // Une séance déclarée non faite ne reçoit pas d'adaptation : il n'y a
      // plus rien à protéger, et la barrer en la transformant en vélo serait
      // illisible.
      s: s.saute ? s : applyFx(s, fxForDate(day, now, byDate)),
      jourOrigine,
      slot,
      day,
      ecart: ecarts?.get(cleEcart(week.n, jourOrigine, slot)) ?? null,
    }
  })
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
    'Aucune course. Vélo Z2 et haut du corps uniquement, protocole excentrique quotidien à charge légère.',
  noir: 'Repos complet des jambes. Mobilité et glaçage seulement. Trois jours dans cette zone et tu appelles ton kiné.',
}

/** Une séance de qualité (tempo, intervalles, test, course) au sens du feu vert / allures. */
function estQualite(sessionType: string): boolean {
  return ['inter', 'tempo', 'test', 'course', 'race'].includes(sessionType)
}

export function adapt(load: LoadMap, pain: PainMap, feedback: FeedbackRow[], now: string): AdaptResult {
  const series = indexSeries(addDays(now, -56), addDays(now, 10), load, pain)
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
        'Les allures cibles sont trop rapides pour l’instant : ajoute 5 s/km sur toutes les zones dans l’onglet Allures.',
    })
  }

  // Feu vert : deux semaines sous 25 sans à-coup.
  //
  // Jamais sans douleur saisie récemment : un indice bas obtenu par absence de
  // données n'est pas un feu vert, c'est un angle mort. Autoriser une hausse de
  // volume là-dessus serait exactement l'erreur que l'indice existe pour éviter.
  const last14 = series.filter((r) => r.day <= now && r.day > addDays(now, -14))
  if (
    !detail.painInconnue &&
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

  return { level, band, idx: detail.idx, detail, rules, fx, n: entries.length, stale: detail.stale, byDate }
}
