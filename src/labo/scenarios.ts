/**
 * Les quatre profils du laboratoire de charge.
 *
 * Demandé par Mathieu le 27 septembre 2026 : tester le calcul de la charge
 * « en condition », sur quatre histoires de tendon différentes, en avançant
 * jour après jour. Même plan, même objectif (3 h 15), même allure pour les
 * quatre : seule l'histoire change, donc tout écart entre les écrans vient
 * du tendon et de rien d'autre.
 *
 * Chaque profil est une trame de douleur (raideur au réveil, douleur du soir)
 * posée sur 90 jours, et une règle qui décide ce que le coureur a fait de
 * chaque séance du plan : faite, sautée, remplacée par du vélo ou de la
 * marche, raccourcie. Avant le 10 août, le plan n'existe pas : l'historique
 * est fait d'activités de type Strava, comme le vrai carnet.
 *
 * Tout est ancré sur `ANCRE` et tiré au sort de façon déterministe : un profil
 * raconte la même histoire à chaque ouverture, et un test (`labo.test.ts`)
 * vérifie que chacun arrive bien dans l'état annoncé. Aucune donnée de
 * Mathieu ici.
 */
import planJson from '../data/plan.json'
import type { Plan, Session, SessionType } from '../data/types'
import type { DailyLogRow, FeedbackRow } from '../lib/buildPain'
import type { ActivityRow } from '../lib/load'
import type { EcartPatch, EcartRow } from '../lib/overrides'
import { slotsParJour } from '../lib/overrides'
import { addDays, weekdayIndex } from '../lib/dates'

const plan = planJson as unknown as Plan

/** Le « aujourd'hui » des scénarios : un dimanche, veille de la sortie longue de la S8. */
export const ANCRE = '2026-09-27'
const HISTORIQUE = 90
const DEBUT_PLAN = plan.weeks[0].monday

export type CleProfil = 'crise-debut' | 'crise-fin' | 'stable' | 'crise-longue'

export interface JeuLabo {
  logs: DailyLogRow[]
  feedback: FeedbackRow[]
  activities: ActivityRow[]
  ecarts: EcartRow[]
}

/** Ce que le coureur a fait d'une séance du plan. */
type Sort =
  | 'faite'
  | 'sautee'
  | { type: SessionType; durMin?: number; dist?: number }
  | { dist: number }

interface Douleur {
  reveil: number
  soir: number
}

interface Profil {
  cle: CleProfil
  nom: string
  resume: string
  graine: number
  /** Points de passage (jours avant l'ancre, valeur), interpolés entre eux. */
  reveil: Array<[number, number]>
  soir: Array<[number, number]>
  /** Amplitude du bruit quotidien autour de la trame. */
  bruit: number
  /** Jours posés à la main, sans bruit : le cœur de l'histoire. */
  exact?: Record<number, Partial<Douleur>>
  /** Probabilité de faire son excentrique un jour donné. */
  excentrique: number
  /** Jours (avant l'ancre) où l'excentrique a été oublié, quoi qu'en dise le tirage. */
  oublis?: number[]
  sauts: number
  /** Une activité avant le plan, ou rien ce jour-là. */
  avantPlan: (k: number, jour: number, rnd: () => number) => ActivityRow | null
  /** Ce que devient une séance du plan, selon la douleur du matin. */
  sort: (s: Session, d: Douleur, k: number, rnd: () => number) => Sort
}

/** Générateur déterministe (mulberry32), comme la démo. */
function tirage(graine: number): () => number {
  let a = graine
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Jours de la semaine au sens de `weekdayIndex` : lundi 0, dimanche 6. */
const [LUN, MAR, MER, JEU, VEN, , DIM] = [0, 1, 2, 3, 4, 5, 6]

const demi = (v: number) => Math.round(v * 2) / 2
const borne = (v: number) => Math.max(0, Math.min(10, v))

/** Interpolation linéaire entre des points (k décroissant ou non). */
function trame(points: Array<[number, number]>, k: number): number {
  const p = [...points].sort((a, b) => b[0] - a[0])
  if (k >= p[0][0]) return p[0][1]
  if (k <= p[p.length - 1][0]) return p[p.length - 1][1]
  for (let i = 0; i < p.length - 1; i++) {
    const [k1, v1] = p[i]
    const [k2, v2] = p[i + 1]
    if (k <= k1 && k >= k2) return v1 + ((k1 - k) / (k1 - k2)) * (v2 - v1)
  }
  return p[p.length - 1][1]
}

const course = (day: string, km: number, allure: number, rnd: () => number, nom: string | null = null): ActivityRow => ({
  day,
  sport: 'Run',
  name: nom,
  distance_m: Math.round(km * 1000),
  moving_s: Math.round(km * allure),
  elevation_m: Math.round(rnd() * 90),
  relative_effort: Math.round(km * 4),
})
const velo = (day: string, min: number): ActivityRow => ({
  day,
  sport: 'Ride',
  name: 'Home trainer',
  distance_m: Math.round(min * 450),
  moving_s: min * 60,
  elevation_m: 0,
  relative_effort: Math.round(min * 0.8),
})

const estCourse = (t: SessionType) => ['long', 'ef', 'inter', 'tempo', 'test', 'course', 'race'].includes(t)
const chargeJambes = (t: SessionType) => estCourse(t) || t === 'muscu-bas' || t === 'velo' || t === 'marche'

/**
 * La conduite d'un coureur raisonnable face à sa douleur du matin. C'est la
 * règle commune ; chaque profil la module.
 */
function conduite(s: Session, d: Douleur): Sort {
  if (d.reveil >= 6) return chargeJambes(s.type) ? 'sautee' : 'faite'
  if (d.reveil >= 4) {
    if (estCourse(s.type)) return { type: 'velo', durMin: 40 }
    if (s.type === 'muscu-bas') return 'sautee'
    return 'faite'
  }
  return 'faite'
}

export const PROFILS: Profil[] = [
  {
    cle: 'crise-debut',
    nom: 'Début de convalescence, crise aiguë',
    resume:
      'Reprise de la course depuis six semaines seulement. La sortie longue de 26 km a déclenché une crise, passée par le noir il y a deux jours : sixième jour, raideur au réveil à 6.',
    graine: 11,
    reveil: [
      [90, 3],
      [49, 2.5],
      [10, 1.8],
      [7, 2],
    ],
    soir: [
      [90, 3.5],
      [49, 3],
      [10, 2.2],
      [7, 2.5],
    ],
    bruit: 0.6,
    exact: {
      6: { reveil: 2, soir: 4 },
      5: { reveil: 4, soir: 5 },
      4: { reveil: 5.5, soir: 6 },
      3: { reveil: 6.5, soir: 6.5 },
      2: { reveil: 7, soir: 7 },
      1: { reveil: 6.5, soir: 6 },
      0: { reveil: 6 },
    },
    excentrique: 0.7,
    sauts: 0,
    // Avant le plan : la blessure. Du vélo, puis de la marche-course à partir
    // de mi-juillet, deux fois par semaine.
    avantPlan: (k, jour, rnd) => {
      const day = addDays(ANCRE, -k)
      if (jour === LUN || jour === JEU) return velo(day, 35 + Math.round(rnd() * 15))
      if (k <= 70 && (jour === MAR || jour === VEN)) return course(day, 4 + rnd() * 1.5, 380, rnd, 'Marche-course')
      return null
    },
    sort: (s, d, k) => {
      // Il a couru son 10 km du mardi malgré le réveil à 4 : c'est ce qui a
      // transformé une alerte en crise.
      if (k === 5 && s.type === 'ef') return 'faite'
      return conduite(s, d)
    },
  },
  {
    cle: 'crise-fin',
    nom: 'Fin de crise, en pleine convalescence',
    resume:
      'Une crise a culminé il y a trois semaines, raideur à 7. Elle retombe sans être éteinte : réveil et soir à 3,5. Les courses reprennent en version courte, la charge habituelle a fondu.',
    graine: 23,
    reveil: [
      [90, 1.5],
      [49, 2],
      [25, 2.5],
      [24, 3.5],
      [23, 5],
      [22, 6.5],
      [21, 7],
      [20, 7],
      [19, 6.5],
      [12, 4],
      [11, 3.5],
      [4, 3],
      [0, 3],
    ],
    soir: [
      [90, 2],
      [49, 2.5],
      [25, 3],
      [24, 5],
      [23, 6.5],
      [22, 7],
      [21, 7.5],
      [20, 7],
      [19, 6.5],
      [12, 4],
      [11, 4],
      [4, 3.5],
      [1, 3.5],
    ],
    bruit: 0.4,
    // Les derniers jours posés à la main : sous 4, aucun plancher ne tombe,
    // et c'est la douleur de fond seule qui tient l'indice en jaune.
    exact: {
      5: { reveil: 3.5, soir: 3.5 },
      4: { reveil: 3.5, soir: 3.5 },
      3: { reveil: 3, soir: 3.5 },
      2: { reveil: 3.5, soir: 3.5 },
      1: { reveil: 3.5, soir: 3.5 },
      0: { reveil: 3.5 },
    },
    excentrique: 0.85,
    // Oublié hier : sans son crédit de −6, la douleur de fond suffit au jaune.
    oublis: [1],
    sauts: 0,
    avantPlan: (k, jour, rnd) => {
      const day = addDays(ANCRE, -k)
      if (jour === DIM || jour === MER) return null
      if (jour === LUN) return course(day, 14 + rnd() * 3, 330, rnd, 'Sortie longue')
      if (jour === MAR) return velo(day, 45)
      return course(day, 7 + rnd() * 3, 320, rnd)
    },
    sort: (s, d, k) => {
      const base = conduite(s, d)
      if (base !== 'faite' || !estCourse(s.type)) return base
      // La reprise : pas de sortie longue, des courses raccourcies.
      if (d.reveil > 3.5) return { type: 'marche', durMin: 45 }
      if (k <= 11 && s.type === 'long') return { type: 'velo', durMin: 60 }
      if (k <= 11 && s.dist && s.dist > 6) return { dist: 6 }
      return base
    },
  },
  {
    cle: 'stable',
    nom: 'Fin de convalescence, calme depuis un mois',
    resume:
      "Dernier épisode il y a six semaines, raideur à 4,5. Depuis, tout le plan est couru, douleur sous 1,5, excentrique presque tous les jours. C'est le profil le plus proche du tien.",
    graine: 37,
    reveil: [
      [90, 1],
      [49, 0.8],
      [46, 1],
      [45, 3],
      [43, 4],
      [42, 4.5],
      [40, 3],
      [38, 2],
      [36, 1],
      [0, 0.5],
    ],
    soir: [
      [90, 1.5],
      [49, 1.2],
      [46, 1.5],
      [45, 3.5],
      [43, 4.5],
      [42, 5],
      [40, 3.5],
      [38, 2.5],
      [36, 1.2],
      [1, 1],
    ],
    bruit: 0.35,
    excentrique: 0.9,
    sauts: 0.3,
    avantPlan: (k, jour, rnd) => {
      const day = addDays(ANCRE, -k)
      if (jour === DIM) return null
      if (jour === LUN) return course(day, 16 + rnd() * 5, 325, rnd, 'Sortie longue')
      if (jour === MER) return velo(day, 60)
      if (jour === JEU) return course(day, 9, 305, rnd, 'Tempo')
      return course(day, 8 + rnd() * 3, 320, rnd)
    },
    sort: (s, d) => conduite(s, d),
  },
  {
    cle: 'crise-longue',
    nom: 'Nouvelle crise sur convalescence longue',
    resume:
      'Des mois de gêne de fond, réveil entre 2 et 3, deux petits épisodes cet été. Hier soir 5,5 après la course, ce matin 4,5 : une nouvelle crise commence.',
    graine: 51,
    reveil: [
      [90, 2.5],
      [71, 2.5],
      [69, 4],
      [68, 5],
      [66, 3],
      [64, 2.5],
      [39, 2.5],
      [37, 4.5],
      [36, 5.5],
      [34, 3.5],
      [32, 2.5],
      [3, 2.5],
      [2, 3],
      [1, 3],
    ],
    soir: [
      [90, 3],
      [71, 3],
      [69, 4.5],
      [68, 5.5],
      [66, 3.5],
      [64, 3],
      [39, 3],
      [37, 5],
      [36, 6],
      [34, 4],
      [32, 3],
      [3, 3],
      [2, 3.5],
    ],
    bruit: 0.5,
    exact: {
      1: { reveil: 3, soir: 5.5 },
      0: { reveil: 4.5 },
    },
    excentrique: 0.55,
    sauts: 0,
    avantPlan: (k, jour, rnd) => {
      const day = addDays(ANCRE, -k)
      if (jour === DIM || jour === MER) return null
      if (jour === LUN) return course(day, 12 + rnd() * 2, 335, rnd, 'Sortie longue')
      if (jour === VEN) return velo(day, 50)
      return course(day, 7 + rnd() * 2, 325, rnd)
    },
    sort: (s, d, k, rnd) => {
      // La course d'hier, courue malgré la gêne : c'est elle qui ouvre la crise.
      if (k === 1 && estCourse(s.type)) return 'faite'
      const base = conduite(s, d)
      if (base !== 'faite' || !estCourse(s.type)) return base
      // Une convalescence longue apprend à composer : la sortie longue est
      // raccourcie dès que le fond dépasse 2,5, une course sur quatre passe
      // au vélo.
      if (s.type === 'long' && d.reveil >= 2.5 && s.dist) return { dist: Math.round(s.dist * 0.7) }
      if (rnd() < 0.25) return { type: 'velo', durMin: 45 }
      return base
    },
  },
]

export const profilDe = (cle: string): Profil | undefined => PROFILS.find((p) => p.cle === cle)

const RPE_TYPE: Partial<Record<SessionType, number>> = {
  long: 7,
  ef: 4,
  inter: 8,
  tempo: 7,
  test: 9,
  course: 8,
  race: 10,
  velo: 4,
  marche: 2,
  'muscu-bas': 6,
  'muscu-haut': 5,
  escalade: 6,
}

/** Construit l'historique complet d'un profil, jusqu'au matin de `ANCRE`. */
export function construireProfil(cle: CleProfil): JeuLabo {
  const p = profilDe(cle)
  if (!p) throw new Error(`Profil inconnu : ${cle}`)
  const rnd = tirage(p.graine)

  const douleurs = new Map<number, Douleur>()
  const douleurDe = (k: number): Douleur => {
    const deja = douleurs.get(k)
    if (deja) return deja
    const bruit = () => (rnd() - 0.5) * 2 * p.bruit
    const d: Douleur = {
      reveil: borne(demi(p.exact?.[k]?.reveil ?? trame(p.reveil, k) + bruit())),
      soir: borne(demi(p.exact?.[k]?.soir ?? trame(p.soir, k) + bruit())),
    }
    douleurs.set(k, d)
    return d
  }

  const logs: DailyLogRow[] = []
  const feedback: FeedbackRow[] = []
  const activities: ActivityRow[] = []
  const ecarts: EcartRow[] = []

  for (let k = HISTORIQUE; k >= 0; k--) {
    const day = addDays(ANCRE, -k)
    const d = douleurDe(k)

    // Le matin de l'ancre, seule la raideur est saisie : la journée commence.
    logs.push({
      day,
      pain_wake: d.reveil,
      pain_effort: null,
      pain_evening: k === 0 ? null : d.soir,
      // Le tirage a lieu même un jour d'oubli : le forcer ne doit pas décaler
      // toute la suite de l'histoire.
      eccentric: (() => {
        const tire = rnd() < p.excentrique
        return k === 0 || p.oublis?.includes(k) ? false : tire
      })(),
      icing: false,
      jumps: k === 0 ? false : rnd() < p.sauts,
      hydration_l: demi(1.4 + rnd() * 1.2),
    })

    if (day < DEBUT_PLAN) {
      const a = p.avantPlan(k, weekdayIndex(day), rnd)
      if (a) activities.push(a)
    }
  }

  // Les séances du plan, jusqu'à la veille de l'ancre : celles du jour sont à faire.
  for (const w of plan.weeks) {
    const slots = slotsParJour(w.sessions)
    w.sessions.forEach((s, i) => {
      const day = addDays(w.monday, s.day)
      const k = Math.round((Date.parse(`${ANCRE}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86400000)
      if (k < 1 || k > HISTORIQUE || s.type === 'repos') return
      const d = douleurDe(k)
      const sort = p.sort(s, d, k, rnd)
      const cle = { week: w.n, day_index: s.day, slot: slots[i] }

      if (sort === 'sautee') {
        ecarts.push({ ...cle, patch: { skipped: true }, reason: 'Tendon' })
        return
      }

      let type: SessionType = s.type
      let dist = s.dist ?? null
      if (sort !== 'faite') {
        const patch: EcartPatch = {}
        if ('type' in sort) {
          patch.type = sort.type
          type = sort.type
          dist = sort.dist ?? null
          if (sort.durMin != null) patch.durMin = sort.durMin
          if (sort.dist != null) patch.dist = sort.dist
        } else {
          patch.dist = sort.dist
          dist = sort.dist
        }
        ecarts.push({ ...cle, patch, reason: 'Tendon' })
      }

      // La douleur de séance suit celle du soir, un demi-point dessous : c'est
      // la journée qui la porte, la séance n'en est qu'une partie.
      const pain = borne(demi(Math.max(0, d.soir - 0.5 + (rnd() - 0.5))))
      const base = RPE_TYPE[type] ?? 5
      const rpe = Math.max(1, Math.min(10, Math.round(base + (rnd() - 0.5) * 2 + (pain >= 4 ? 1 : 0))))
      feedback.push({
        ...cle,
        day,
        session_type: type,
        pain,
        rpe,
        distance_km: dist ?? (type === 'velo' ? 20 : null),
        note: null,
      })
    })
  }

  return { logs, feedback, activities, ecarts }
}
