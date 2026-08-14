/**
 * Indice de charge du tendon — 0 à 100.
 *
 * Modèle conçu et calibré sur les données réelles de Mathieu (mai → août 2026,
 * 83 activités Strava croisées avec 16 jours de carnet de suivi).
 * Résultat de la calibration : médiane 23, maximum 59 le 3 août — soit la veille
 * du jour où le carnet note « entorse cheville gauche après 600 m ».
 *
 * Toute modification des constantes doit être validée par `npm test` :
 * les scénarios de bascule (douleur 4 → orange, 6 → rouge, 8 → noir) sont
 * verrouillés par des tests.
 */

// ─────────────────────────────────────────────────────────── coûts de charge

/**
 * Coût tendineux d'un kilomètre couru, selon l'allure.
 * Un tendon d'Achille encaisse une charge élastique qui croît beaucoup plus
 * vite que la vitesse : d'où 2,1 en intervalles contre 1 en endurance.
 */
export const KM_COST = {
  recup: 0.9,
  ef: 1.0,
  long: 1.15,
  am: 1.35,
  seuil: 1.6,
  vo2: 2.1,
  rep: 2.1,
} as const

/**
 * Coût par minute pour tout ce qui n'est pas de la course.
 * Le vélo n'est PAS neutre : les deux seuls pics de douleur du soir relevés
 * dans le carnet suivent tous les deux une séance de home trainer en Z3.
 */
export const MIN_COST: Record<string, number> = {
  velo: 0.10,
  'muscu-bas': 0.25, // charge lourde mais contrôlée, thérapeutique
  escalade: 0.06, // appuis en pointe
  'muscu-haut': 0,
  hike: 0.05,
  repos: 0,
}

/** Coût moyen au kilomètre d'une séance planifiée, par type. */
export const RUN_COST: Record<string, number> = {
  long: 1.15,
  ef: 1.0,
  recup: 0.95,
  tempo: 1.27, // 45 % au seuil, 55 % en endurance
  inter: 1.5,
  test: 1.5,
  course: 1.35,
  race: 1.35,
}

// ─────────────────────────────────────────────────────────── types

/** Les trois mesures de douleur d'une journée, plus les gestes protecteurs. */
export interface PainDay {
  /** Douleur au réveil (raideur matinale) — le marqueur de référence. */
  wake?: number | null
  /** Douleur ressentie pendant l'effort. */
  effort?: number | null
  /** Douleur en fin de journée — chez Mathieu, le signal le plus expressif. */
  evening?: number | null
  /** Protocole excentrique effectué ce jour-là. */
  eccentric?: boolean
  /** Glaçage. */
  icing?: boolean
  /** Sauts / pliométrie (test de charge du kiné). */
  jumps?: boolean
  /** Au moins 2 litres bus dans la journée : un tendon mal hydraté encaisse moins bien. */
  hydrated?: boolean
}

/** Charge tendineuse par jour, en kilomètres-équivalents. Clé = date ISO. */
export type LoadMap = Record<string, number>
/** Journal de douleur. Clé = date ISO. */
export type PainMap = Record<string, PainDay>

export interface IndexBreakdown {
  /** L'indice final, 0 à 100. */
  idx: number
  /** Emballement aigu/chronique, jusqu'à 30. */
  ratio: number
  /** Manque de fraîcheur des 48 h, jusqu'à 20. */
  freshness: number
  /** Douleur déclarée, jusqu'à 85. */
  pain: number
  /** Tendance de la raideur matinale, jusqu'à 6. */
  trend: number
  /** Monotonie de la semaine, jusqu'à 8. */
  monotony: number
  /** Gestes protecteurs, jusqu'à 17 (valeur positive, soustraite). */
  credits: number
  /** Charge aiguë (moyenne exponentielle, demi-vie 3,5 j). */
  acute: number
  /** Charge chronique (demi-vie 14 j). */
  chronic: number
  /** Rapport aigu / chronique. */
  acr: number
  /** Score de douleur brut 0-10, null si aucune donnée exploitable. */
  painScore: number | null
  /** true si le score repose sur un report faute de saisie récente. */
  stale: boolean
  /** Plancher appliqué (seuils garantis ou mémoire d'épisode). */
  floor: number
  /** 0 à 1 : part d'historique de charge disponible sur 28 jours. En dessous de 1,
   *  la contribution mécanique est plafonnée faute de référence fiable. */
  confidence: number
}

export type BandKey = 'vert' | 'jaune' | 'orange' | 'rouge' | 'noir'

export interface Band {
  key: BandKey
  max: number
  name: string
  color: string
  headline: string
  detail: string
}

/**
 * Les cinq bandes. Les seuils 50 et 65 viennent directement des règles posées
 * par Mathieu : « au-dessus de 50 pas de tempo ni d'intervalles, au-dessus de
 * 60 pas de course du tout ».
 */
export const BANDS: readonly Band[] = [
  {
    key: 'vert',
    max: 29,
    name: 'Vert',
    color: '#0ca30c',
    headline: 'Tout est autorisé',
    detail:
      "Le tendon encaisse. Si tu restes sous 15 trois jours de suite, tu peux même ajouter du volume.",
  },
  {
    key: 'jaune',
    max: 49,
    name: 'Jaune',
    color: '#fab219',
    headline: 'Plan nominal',
    detail:
      "Charge normale d'un entraînement qui progresse. Rien à changer, mais garde un œil sur la douleur du soir.",
  },
  {
    key: 'orange',
    max: 64,
    name: 'Orange',
    color: '#ec835a',
    headline: 'Ni vitesse ni muscu lourde',
    detail:
      "Pas de séance de qualité aujourd'hui, pas de renfo bas du corps chargé. Sortie longue raccourcie de 20 %. Endurance facile et vélo restent ouverts.",
  },
  {
    key: 'rouge',
    max: 79,
    name: 'Rouge',
    color: '#d03b3b',
    headline: 'Aucune course',
    detail:
      "Vélo en Z2 et haut du corps uniquement. Le tendon est en réaction : courir dessus prolonge l'épisode de plusieurs semaines.",
  },
  {
    key: 'noir',
    max: 100,
    name: 'Noir',
    color: '#8B1A1A',
    headline: 'Repos complet des jambes',
    detail:
      'Zéro charge. Mobilité douce, glaçage. Si tu restes ici trois jours, tu prends rendez-vous chez ton kiné.',
  },
] as const

export const bandOf = (idx: number): Band =>
  BANDS.find((b) => idx <= b.max) ?? BANDS[BANDS.length - 1]

// ─────────────────────────────────────────────────────────── utilitaires

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Décale une date ISO de n jours (n négatif = dans le passé). */
export function shiftDay(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Moyenne exponentielle de la charge jusqu'à `day` inclus.
 * `halfLife` en jours : 3,5 pour l'aigu, 14 pour le chronique.
 */
export function ewma(load: LoadMap, day: string, halfLife: number, window = 60): number {
  const lambda = 1 - Math.exp(-Math.LN2 / halFix(halfLife))
  let v = 0
  for (let k = window - 1; k >= 0; k--) {
    v += lambda * ((load[shiftDay(day, -k)] ?? 0) - v)
  }
  return v
}
const halFix = (h: number) => (h > 0 ? h : 1)

const painValues = (p?: PainDay): number[] =>
  p ? [p.wake, p.effort, p.evening].filter((x): x is number => x != null) : []

/**
 * Score de douleur 0-10 pour décider de la séance du jour, calculé le matin.
 *
 * Trois entrées : la raideur au réveil du jour (45 %), et la réaction retardée
 * à la séance de la veille — douleur du soir (35 %) et pendant l'effort (20 %).
 * Un pic isolé ne doit jamais être dilué par une moyenne : le résultat mélange
 * la pondération (55 %) et le maximum des 72 dernières heures (45 %).
 */
export function painScore(
  day: string,
  pain: PainMap,
): { score: number | null; stale: boolean } {
  const today = pain[day]
  const yest = pain[shiftDay(day, -1)]

  const vals: number[] = []
  const weights: number[] = []
  if (today?.wake != null) { vals.push(today.wake); weights.push(0.45) }
  if (yest?.evening != null) { vals.push(yest.evening); weights.push(0.35) }
  if (yest?.effort != null) { vals.push(yest.effort); weights.push(0.20) }

  if (vals.length === 0) {
    // Rien de saisi : l'absence de donnée n'est pas l'absence de douleur.
    // On reporte la dernière valeur connue en la faisant décroître sur 4 jours.
    for (let k = 1; k < 5; k++) {
      const vs = painValues(pain[shiftDay(day, -k)])
      if (vs.length) return { score: Math.max(...vs) * Math.max(0, 1 - k / 4), stale: true }
    }
    return { score: null, stale: false }
  }

  const wsum = weights.reduce((a, b) => a + b, 0)
  const weighted = vals.reduce((a, v, i) => a + v * weights[i], 0) / wsum

  let peak = 0
  for (let k = 0; k < 3; k++) {
    const vs = painValues(pain[shiftDay(day, -k)])
    if (vs.length) peak = Math.max(peak, ...vs)
  }

  return { score: 0.55 * weighted + 0.45 * peak, stale: false }
}

/** Pente de la raideur matinale sur quatre jours. Seule une hausse compte. */
export function painTrend(day: string, pain: PainMap): number {
  const vs: number[] = []
  for (let k = 3; k >= 0; k--) {
    const w = pain[shiftDay(day, -k)]?.wake
    if (w != null) vs.push(w)
  }
  if (vs.length < 3) return 0
  const n = vs.length
  const mx = (n - 1) / 2
  const mu = vs.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  vs.forEach((v, i) => {
    num += (i - mx) * (v - mu)
    den += (i - mx) ** 2
  })
  return den ? Math.max(0, num / den) : 0
}

// ─────────────────────────────────────────────────────────── l'indice

/**
 * Calcule l'indice pour un jour donné.
 *
 * @param memo Indices déjà calculés des jours précédents. Nécessaire pour la
 *   mémoire d'épisode : après un pic au-dessus de 60, un plancher décroissant
 *   tient quelques jours, parce qu'un tendon réactif reste fragile même quand
 *   la douleur est retombée.
 */
export function tendonIndex(
  day: string,
  load: LoadMap,
  pain: PainMap,
  memo?: Record<string, number>,
): IndexBreakdown {
  const acute = ewma(load, day, 3.5)
  const chronic = ewma(load, day, 14)
  const acr = chronic > 0.5 ? acute / chronic : 1

  // Combien de jours des 28 derniers portent une charge connue ? En dessous de
  // 10, la charge chronique est artificiellement basse et le rapport aigu/chronique
  // s'emballe pour rien — typiquement au tout début d'un historique. On plafonne
  // alors la contribution mécanique au lieu de crier au loup.
  let known = 0
  for (let k = 1; k <= 28; k++) if ((load[shiftDay(day, -k)] ?? 0) > 0) known++
  const confidence = clamp(known / 10, 0, 1)

  // Charge : emballement du rapport aigu/chronique, puis fraîcheur immédiate.
  let ratio = 30 * clamp((acr - 0.9) / 0.7, 0, 1)
  const recent = (load[shiftDay(day, -1)] ?? 0) + 0.55 * (load[shiftDay(day, -2)] ?? 0)
  let freshness = chronic > 0.5 ? 20 * clamp(recent / (2.6 * chronic), 0, 1) : 0
  if (confidence < 1) {
    const cap = 25 * confidence
    const total = ratio + freshness
    if (total > cap && total > 0) {
      ratio = (ratio / total) * cap
      freshness = (freshness / total) * cap
    }
  }

  // Douleur : réponse volontairement convexe. Une gêne de fond à 2/10
  // n'alarme pas, un vrai 6 arrête tout.
  const { score, stale } = painScore(day, pain)
  const painPts = score != null ? 85 * Math.pow(clamp(score, 0, 10) / 10, 1.15) : 0
  const trendPts = 6 * clamp(painTrend(day, pain) / 1.5, 0, 1)

  // Monotonie (Foster) : une semaine sans jour vraiment léger use le tendon.
  const week: number[] = []
  for (let k = 0; k < 7; k++) week.push(load[shiftDay(day, -k)] ?? 0)
  const mu = week.reduce((a, b) => a + b, 0) / 7
  const sd = Math.sqrt(week.reduce((a, x) => a + (x - mu) ** 2, 0) / 7)
  const monotony = sd > 0.3 ? 8 * clamp((mu / sd - 1.3) / 1.2, 0, 1) : 0

  // Crédits : faire son excentrique fait BAISSER l'indice. C'est le traitement,
  // pas une agression — et ça récompense l'observance.
  let credits = 0
  const y = pain[shiftDay(day, -1)]
  if (y?.eccentric) credits += 6
  if (y?.jumps) credits += 2
  if (y?.icing) credits += 2
  if (y?.hydrated) credits += 2
  if ((load[shiftDay(day, -1)] ?? 0) < 2) credits += 5

  let idx = ratio + freshness + painPts + trendPts + monotony - credits

  // Planchers garantis : les seuils posés par Mathieu ne peuvent pas être
  // contournés par un indice bas ailleurs.
  let floor = 0
  for (let k = 0; k < 2; k++) {
    const vs = painValues(pain[shiftDay(day, -k)])
    if (!vs.length) continue
    const mx = Math.max(...vs)
    const dec = k === 0 ? 1 : 0.92
    if (mx >= 8) floor = Math.max(floor, 80 * dec)
    else if (mx >= 6) floor = Math.max(floor, 65 * dec)
    else if (mx >= 4) floor = Math.max(floor, 50 * dec)
  }

  // Mémoire d'épisode.
  if (memo) {
    for (let k = 1; k < 6; k++) {
      const prev = memo[shiftDay(day, -k)]
      if (prev != null && prev >= 60) floor = Math.max(floor, prev * Math.pow(0.74, k))
    }
  }

  idx = Math.max(idx, floor)

  return {
    idx: clamp(Math.round(idx), 0, 100),
    ratio: Math.round(ratio),
    freshness: Math.round(freshness),
    pain: Math.round(painPts),
    trend: Math.round(trendPts),
    monotony: Math.round(monotony),
    credits: Math.round(credits),
    acute: Math.round(acute * 10) / 10,
    chronic: Math.round(chronic * 10) / 10,
    acr: Math.round(acr * 100) / 100,
    painScore: score == null ? null : Math.round(score * 10) / 10,
    stale,
    floor: Math.round(floor),
    confidence: Math.round(confidence * 100) / 100,
  }
}

/**
 * Série chronologique de l'indice, avec la mémoire d'épisode chaînée.
 * À appeler une fois puis mémoïser côté React : le calcul est O(jours × 60).
 */
export function indexSeries(
  from: string,
  to: string,
  load: LoadMap,
  pain: PainMap,
): Array<IndexBreakdown & { day: string; load: number }> {
  const out: Array<IndexBreakdown & { day: string; load: number }> = []
  const memo: Record<string, number> = {}
  let day = from
  let guard = 0
  while (day <= to && guard++ < 2000) {
    const r = tendonIndex(day, load, pain, memo)
    memo[day] = r.idx
    out.push({ day, load: Math.round((load[day] ?? 0) * 10) / 10, ...r })
    day = shiftDay(day, 1)
  }
  return out
}
