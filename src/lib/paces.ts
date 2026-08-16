/**
 * Allures d'entraînement.
 *
 * Tout le plan est paramétré par UNE seule valeur : l'allure marathon cible,
 * en secondes par kilomètre. Les six zones s'en déduisent par un écart fixe.
 * Changer l'objectif recalcule donc l'intégralité des séances.
 *
 * Les écarts retenus reproduisent les tables de Jack Daniels pour un VDOT autour
 * de 55, qui est celui de Mathieu (3 km en 12:02 le 8 août 2026) :
 *   seuil 4:16, intervalles 3:56, répétitions 3:38, endurance 5:07 à 5:44.
 */
import type { Plan, ZoneKey } from '../data/types'

/** Écarts en secondes par kilomètre par rapport à l'allure marathon. */
export const ZONE_OFFSETS: Record<ZoneKey, number> = {
  recup: 75,
  ef: 50,
  am: 0,
  seuil: -20,
  vo2: -40,
  rep: -55,
}

export const MARATHON_KM = 42.195
export const HALF_KM = 21.0975

/** Allure d'une zone, en secondes par kilomètre. */
export const zonePace = (marathonPace: number, zone: ZoneKey): number =>
  marathonPace + (ZONE_OFFSETS[zone] ?? 0)

/** Formate une allure en `m:ss`. */
export function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`
}

/** Formate une durée en minutes vers `1 h 25 min` ou `45 min`. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Temps total sur une distance, en secondes. */
export const timeFor = (secPerKm: number, km: number): number => secPerKm * km

/**
 * Allure marathon projetée par un test de 3 km.
 *
 * L'écart de 48 s/km entre l'allure sur 3 km et l'allure marathon correspond aux
 * tables de Daniels dans la plage 3 h 10 à 3 h 45. Attention : cette projection
 * suppose un volume d'entraînement cohérent avec l'objectif. Elle décrit la
 * cylindrée, pas l'endurance spécifique.
 */
export const projectFrom3k = (totalSeconds: number): number =>
  Math.round(totalSeconds / 3 + 48)

/** Objectif marathon exprimé en secondes par kilomètre. */
export const paceForTarget = (targetSeconds: number): number =>
  Math.round(targetSeconds / MARATHON_KM)

/**
 * Fréquences cardiaques.
 *
 * Corrigées le 9 août 2026 : Strava calculait les zones sur une FC max implicite
 * d'environ 193, alors que Mathieu plafonne à 179-180 sur un 3 km maximal
 * (FC moyenne 174 sur 12 minutes d'effort). On retient 181.
 */
export const HR_MAX = 181

export const HR_ZONES = [
  { key: 'Z1', label: 'Récupération', pct: [0, 0.68] },
  { key: 'Z2', label: 'Endurance fondamentale', pct: [0.68, 0.83] },
  { key: 'Z3', label: 'Tempo', pct: [0.83, 0.89] },
  { key: 'Z4', label: 'Seuil', pct: [0.89, 0.94] },
  { key: 'Z5', label: 'VO2 max', pct: [0.94, 1] },
] as const

export const hrRange = (zone: (typeof HR_ZONES)[number], hrMax = HR_MAX) =>
  [Math.round(zone.pct[0] * hrMax), Math.round(zone.pct[1] * hrMax)] as const

/**
 * Correspondance entre les six zones d'allure et les cinq zones de FC.
 * `rep` partage la zone de `vo2` : sur un 400-600 m la FC n'a pas le temps de
 * suivre l'effort, la cible cardiaque n'y est de toute façon pas fiable.
 */
const ZONE_HR: Record<ZoneKey, (typeof HR_ZONES)[number]['key']> = {
  recup: 'Z1',
  ef: 'Z2',
  am: 'Z3',
  seuil: 'Z4',
  vo2: 'Z5',
  rep: 'Z5',
}

/**
 * Chez Mathieu, la FC cible à vélo est inférieure de 20 bpm à sa FC de course
 * à effort équivalent — une mesure personnelle, pas une règle physiologique
 * générale.
 */
export const HR_VELO_OFFSET = 20

/** Fourchette de FC d'une zone d'allure, en course ou à vélo. */
export function zoneHrRange(
  zone: ZoneKey,
  discipline: 'course' | 'velo' = 'course',
  hrMax = HR_MAX,
): readonly [number, number] {
  const z = HR_ZONES.find((h) => h.key === ZONE_HR[zone])!
  const [lo, hi] = hrRange(z, hrMax)
  const decalage = discipline === 'velo' ? -HR_VELO_OFFSET : 0
  return [Math.max(0, lo + decalage), Math.max(0, hi + decalage)]
}

/**
 * Vitesse ajustée à la pente.
 *
 * Strava affiche une VAP mais ne l'expose pas dans son API : elle est
 * recalculée ici. Le coût énergétique de la course selon la pente vient de
 * Minetti et al. (2002) — un polynôme du cinquième degré en J/kg/m, valable
 * entre −45 % et +45 %. Monter coûte plus que descendre ne rapporte, donc un
 * parcours vallonné ressort plus cher qu'un plat même quand on revient au
 * point de départ.
 *
 * Approximation assumée : on ne dispose que du dénivelé total et de la
 * distance, pas du profil. On suppose donc une moitié en montée à la pente
 * moyenne, une moitié en descente. Sur route et faible dénivelé l'écart
 * ressort petit, ce qui est le comportement attendu.
 */
const coutParPente = (i: number): number =>
  155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + 3.6

/** Coût du terrain rapporté au plat. 1 = plat, 1,08 = 8 % plus cher. */
export function coutDuRelief(distanceM: number, deniveleM: number): number {
  if (distanceM <= 0 || deniveleM <= 0) return 1
  // Pente moyenne de la moitié montante, bornée au domaine du modèle.
  const pente = clampPente(deniveleM / (distanceM / 2))
  return (coutParPente(pente) + coutParPente(-pente)) / (2 * coutParPente(0))
}
const clampPente = (i: number) => Math.max(0, Math.min(0.45, i))

/**
 * Allure équivalente sur le plat, en secondes par kilomètre.
 * Renvoie null sans dénivelé connu : mieux vaut ne rien afficher qu'un chiffre
 * qui laisserait croire que le parcours était plat.
 */
export function vap(
  distanceM: number,
  movingS: number,
  deniveleM: number | null | undefined,
): number | null {
  if (deniveleM == null || distanceM <= 0 || movingS <= 0) return null
  const allure = movingS / (distanceM / 1000)
  return Math.round(allure / coutDuRelief(distanceM, deniveleM))
}

/**
 * L'allure de la séance, quand elle en a UNE SEULE.
 *
 * Le header affichait l'allure de la zone dominante à côté de la distance et
 * de la durée totales, ce qui donnait des lignes qui se contredisent : « 10 km,
 * 55-60 min, 3:57/km » sur les 5 x 1000 m du 12 septembre, alors que le 3:57
 * ne vaut que pour les cinq blocs et que les 10 km incluent échauffement,
 * récupérations et retour au calme. Une séance à plusieurs allures n'a pas
 * d'allure : elle a une structure, et c'est la structure qui est affichée plus
 * bas, segment par segment.
 */
export function allureUnique(
  session: Plan['weeks'][number]['sessions'][number],
  marathonPace: number,
): number | null {
  const zones = new Set<ZoneKey>()
  if (session.struct?.length) {
    for (const seg of session.struct) zones.add(seg.zone)
  } else {
    for (const [, z] of [...(session.wu ?? []), ...(session.main ?? []), ...(session.cd ?? [])]) {
      if (typeof z === 'string' && z in ZONE_OFFSETS) zones.add(z as ZoneKey)
    }
  }
  if (zones.size !== 1) return null
  return zonePace(marathonPace, [...zones][0])
}

/** Une série « N x Q unité », décomposée. */
export interface Repetitions {
  n: number
  /** Distance d'une répétition en km, ou null quand elle est exprimée en temps. */
  km: number | null
  /** Durée d'une répétition en secondes, ou null quand elle est exprimée en distance. */
  secondes: number | null
}

/**
 * Lit « 5 x 1000 m », « 3 x 2 km », « 6 x 45 s », « 2 x 8 min ».
 *
 * L'unité était auparavant capturée par `(km|m)?`, ce qui produisait deux
 * erreurs muettes : « 6 x 45 s » n'appariait aucune unité et les 45 étaient
 * comptés en KILOMÈTRES, d'où une durée estimée de 19 h sur les côtes du
 * 22 août ; et « 2 x 8 min » appariait le `m` de « min », d'où 8 mètres au
 * lieu de 8 minutes. Les unités de temps sont donc reconnues explicitement,
 * et `\b` empêche une unité de mordre sur le mot suivant.
 */
export function lireRepetitions(label: string | number): Repetitions | null {
  if (typeof label === 'number') return null
  const m = String(label).match(/^(\d+)\s*x\s*([\d,.]+)\s*(km|min|sec|m|s)?\b/i)
  if (!m) return null

  const n = Number(m[1])
  const q = parseFloat(m[2].replace(',', '.'))
  if (!Number.isFinite(n) || !Number.isFinite(q)) return null
  const unite = (m[3] ?? '').toLowerCase()

  if (unite === 'min') return { n, km: null, secondes: q * 60 }
  if (unite === 's' || unite === 'sec') return { n, km: null, secondes: q }
  if (unite === 'm') return { n, km: q / 1000, secondes: null }
  if (unite === 'km') return { n, km: q, secondes: null }
  // Sans unité, l'ordre de grandeur tranche : personne ne court 400 km en série.
  return { n, km: q >= 100 ? q / 1000 : q, secondes: null }
}

/**
 * Durée estimée d'une séance, à partir de sa structure et des allures courantes.
 * Renvoie une fourchette en minutes, arrondie à 5 minutes près.
 */
export function estimateDuration(
  session: Plan['weeks'][number]['sessions'][number],
  marathonPace: number,
): [number, number] {
  if (session.dur) return session.dur

  // Le marathon se court à l'allure cible, sans ajouter échauffement ni retour au calme.
  if (session.type === 'race' && session.dist) {
    const t = (session.dist * zonePace(marathonPace, 'am')) / 60
    return [round5(t * 0.99), round5(t * 1.05)]
  }

  let sec = 0
  if (session.struct) {
    for (const seg of session.struct) sec += seg.km * zonePace(marathonPace, seg.zone)
  } else {
    const steps = [...(session.wu ?? []), ...(session.main ?? []), ...(session.cd ?? [])]
    for (const [label, zone] of steps) {
      const z = typeof zone === 'string' && zone in ZONE_OFFSETS ? (zone as ZoneKey) : null
      if (typeof label === 'number') {
        sec += label * zonePace(marathonPace, z ?? 'ef')
        continue
      }
      const text = String(label)
      const reps = lireRepetitions(text)
      if (reps) {
        const effort =
          reps.secondes != null ? reps.secondes : reps.km! * zonePace(marathonPace, z ?? 'vo2')
        sec += reps.n * effort + reps.n * 90 // 90 s de récupération
        continue
      }
      const km = text.match(/([\d,.]+)\s*km/)
      const min = text.match(/(\d+)\s*min/)
      const m = text.match(/([\d,.]+)\s*m\b/)
      if (km) sec += parseFloat(km[1].replace(',', '.')) * zonePace(marathonPace, z ?? 'ef')
      else if (min) sec += Number(min[1]) * 60
      else if (m) sec += (parseFloat(m[1].replace(',', '.')) / 1000) * zonePace(marathonPace, z ?? 'vo2')
      else sec += 180
    }
  }
  const minutes = sec / 60
  return [round5(minutes), round5(minutes * 1.08)]
}

const round5 = (m: number) => Math.round(m / 5) * 5
