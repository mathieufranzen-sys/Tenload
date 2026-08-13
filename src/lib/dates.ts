/** Dates, en français et sans dépendance. Tout circule en ISO `YYYY-MM-DD`. */

export const DAYS_LONG = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche',
] as const
export const DAYS_SHORT = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'] as const
export const MONTHS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
] as const

/**
 * Aujourd'hui, en ISO local.
 * Volontairement calculé sur le fuseau du navigateur : à Paris, une séance du
 * soir doit rester rattachée à la bonne journée même après minuit UTC.
 */
export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** Midi UTC : évite tout décalage de jour au changement d'heure. */
export const parseDay = (iso: string): Date => new Date(`${iso}T12:00:00Z`)

export function addDays(iso: string, n: number): string {
  const d = parseDay(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Indice de jour de semaine, 0 = lundi. */
export const weekdayIndex = (iso: string): number => (parseDay(iso).getUTCDay() + 6) % 7

/** Lundi de la semaine contenant `iso`. */
export const mondayOf = (iso: string): string => addDays(iso, -weekdayIndex(iso))

/** « 17 août » */
export function formatDay(iso: string): string {
  const d = parseDay(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

/** « lun. 17 août » */
export function formatDayLong(iso: string): string {
  const d = parseDay(iso)
  return `${DAYS_SHORT[weekdayIndex(iso)]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

/** Nombre de jours entiers entre deux dates. */
export const daysBetween = (from: string, to: string): number =>
  Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000)

/** Formate un nombre à la française : 21,1 et non 21.1, et 22 et non 22,0. */
export function formatNumber(v: number, decimals = 1): string {
  return v
    .toFixed(decimals)
    .replace('.', ',')
    .replace(/,0+$/, '')
}
