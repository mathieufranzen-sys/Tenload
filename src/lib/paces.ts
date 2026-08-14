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
      // « 5 x 1000 m », « 6 x 800 m », « 3 x 2 km »
      const reps = text.match(/^(\d+)\s*x\s*([\d,.]+)\s*(km|m)?/i)
      if (reps) {
        const n = Number(reps[1])
        const q = parseFloat(reps[2].replace(',', '.'))
        const km = reps[3]?.toLowerCase() === 'm' ? q / 1000 : q
        sec += n * km * zonePace(marathonPace, z ?? 'vo2') + n * 90 // 90 s de récupération
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
