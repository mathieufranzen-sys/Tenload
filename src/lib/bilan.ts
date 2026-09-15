/**
 * Le bilan de la semaine, le dimanche soir et le lundi matin.
 *
 * Demandé par Mathieu le 16 septembre 2026. Les chiffres existaient tous, mais
 * éparpillés : le compteur de séances dans Aujourd'hui, la charge dans Suivi,
 * la raideur dans le carnet, la semaine suivante dans Programme. Rien ne
 * répondait en un seul endroit à « comment s'est passée ma semaine, et qu'est-ce
 * que la suivante change ».
 *
 * Même règle que le coach : aucun chiffre qui ne soit une mesure. Une charge
 * réelle comparée au plan alors qu'une séance n'est pas notée serait fausse, et
 * toujours dans le sens rassurant : l'écart n'est alors pas calculé.
 */
import type { Session, SessionType, Week } from '../data/types'
import type { PainMap } from './tendonIndex'
import { DAYS_LONG, addDays, formatNumber, weekdayIndex } from './dates'
import { sessionLoad } from './load'

const COURSE: SessionType[] = ['long', 'ef', 'tempo', 'inter', 'test', 'course', 'race']

export interface SeanceBilan {
  /** La séance vécue, écarts et adaptation appliqués. */
  s: Session
  typePlan: SessionType
  day: string
  faite: boolean
  /** La séance du plan de référence, pour dire ce qui a changé. */
  reference: Session | null
}

export interface EntreeBilan {
  semaine: Week
  /** Les séances qui tombent réellement dans la semaine calendaire. */
  seances: SeanceBilan[]
  pain: PainMap
  /** Charge tendineuse par jour. */
  charge: Record<string, number>
  now: string
  suivante?: { semaine: Week; seances: SeanceBilan[] }
}

export type MomentDouleur = 'réveil' | 'effort' | 'soir'

export interface BilanSemaine {
  n: number
  du: string
  au: string
  faites: number
  prevues: number
  sautees: number
  nonNotees: number
  kmRealises: number
  kmPrevus: number
  chargeRealisee: number
  chargePrevue: number
  /** En pourcentage du plan. Null dès qu'une séance passée n'est pas notée. */
  ecartCharge: number | null
  raideur: number | null
  raideurPrecedente: number | null
  pic: { valeur: number; day: string; moment: MomentDouleur } | null
  excentrique: number
  suivante: string[]
}

const moyenneSiAssez = (xs: number[]): number | null =>
  // Trois matins au minimum : en dessous, une seule nuit fait la moyenne.
  xs.length >= 3 ? xs.reduce((a, b) => a + b, 0) / xs.length : null

export function bilanSemaine({ semaine, seances, pain, charge, now, suivante }: EntreeBilan): BilanSemaine {
  const du = semaine.monday
  const au = addDays(du, 6)
  const fin = now < au ? now : au
  const jours: string[] = []
  for (let d = du; d <= fin; d = addDays(d, 1)) jours.push(d)

  const actives = seances.filter((x) => x.s.type !== 'repos')
  const passees = actives.filter((x) => x.day <= now)
  const sautees = actives.filter((x) => x.s.saute).length
  const faites = actives.filter((x) => x.faite && !x.s.saute).length
  const nonNotees = passees.filter((x) => !x.faite && !x.s.saute).length

  const kmRealises = actives
    .filter((x) => x.faite && !x.s.saute && COURSE.includes(x.s.type))
    .reduce((a, x) => a + (x.s.dist ?? 0), 0)
  const kmPrevus = semaine.sessions
    .filter((s) => COURSE.includes(s.type))
    .reduce((a, s) => a + (s.dist ?? 0), 0)

  const chargeRealisee = jours.reduce((a, d) => a + (charge[d] ?? 0), 0)
  const chargePrevue = semaine.sessions
    .filter((s) => addDays(du, s.day) <= fin)
    .reduce((a, s) => a + sessionLoad(s), 0)
  const ecartCharge =
    nonNotees === 0 && chargePrevue > 0 ? Math.round((chargeRealisee / chargePrevue - 1) * 100) : null

  const reveils = (debut: string) => {
    const out: number[] = []
    for (let k = 0; k < 7; k++) {
      const d = addDays(debut, k)
      if (d > fin) break
      const v = pain[d]?.wake
      if (v != null) out.push(v)
    }
    return out
  }

  let pic: BilanSemaine['pic'] = null
  for (const d of jours) {
    const p = pain[d]
    for (const [moment, v] of [['réveil', p?.wake], ['effort', p?.effort], ['soir', p?.evening]] as const) {
      if (v != null && (pic == null || v > pic.valeur)) pic = { valeur: v, day: d, moment }
    }
  }

  return {
    n: semaine.n,
    du,
    au,
    faites,
    prevues: actives.length,
    sautees,
    nonNotees,
    kmRealises: Math.round(kmRealises * 10) / 10,
    kmPrevus: Math.round(kmPrevus * 10) / 10,
    chargeRealisee: Math.round(chargeRealisee),
    chargePrevue: Math.round(chargePrevue),
    ecartCharge,
    raideur: moyenneSiAssez(reveils(du)),
    raideurPrecedente: moyenneSiAssez(reveilsSemaine(pain, addDays(du, -7))),
    pic,
    excentrique: jours.filter((d) => pain[d]?.eccentric).length,
    suivante: suivante ? ceQueChangeLaSuivante(seances, suivante) : [],
  }
}

function reveilsSemaine(pain: PainMap, debut: string): number[] {
  const out: number[] = []
  for (let k = 0; k < 7; k++) {
    const v = pain[addDays(debut, k)]?.wake
    if (v != null) out.push(v)
  }
  return out
}

const km = (v: number) => `${formatNumber(v)} km`
const jourDe = (iso: string) => DAYS_LONG[weekdayIndex(iso)].toLowerCase()

/**
 * Ce que la semaine suivante change, en phrases. Rien d'autre que ce que le
 * plan porte ou ce que le moteur a déjà appliqué : la projection de l'indice
 * ne vaut que sur dix jours, et elle le dit.
 */
function ceQueChangeLaSuivante(
  cetteSemaine: SeanceBilan[],
  { semaine, seances }: { semaine: Week; seances: SeanceBilan[] },
): string[] {
  const out: string[] = []
  const vivantes = seances.filter((x) => !x.s.saute)

  if (semaine.deload) out.push('Semaine de décharge : le volume baisse, la qualité ne bouge pas.')

  const dossard = vivantes.find((x) => x.s.type === 'course' || x.s.type === 'race')
  if (dossard) out.push(`${dossard.s.title} le ${jourDe(dossard.day)} : la semaine s'allège pour arriver frais.`)

  const longue = vivantes.find((x) => x.s.type === 'long')
  const longueCette = cetteSemaine.find((x) => x.s.type === 'long' && !x.s.saute)
  if (longue?.s.dist) {
    const palier = longue.s.adapted?.startsWith('Palier') ? longue.s.adapted.split(' · ')[1] : null
    if (palier && longue.reference?.dist && longue.reference.dist !== longue.s.dist) {
      out.push(
        `Sortie longue tenue à ${km(longue.s.dist)} au lieu de ${km(longue.reference.dist)} : ${palier.charAt(0).toLowerCase()}${palier.slice(1)}.`,
      )
    } else {
      out.push(
        `Sortie longue de ${km(longue.s.dist)}${longueCette?.s.dist ? `, contre ${km(longueCette.s.dist)} cette semaine` : ''}.`,
      )
    }
  }

  const adaptees = vivantes.filter(
    (x) => x.s.adapted && !x.s.adapted.startsWith('Palier') && x.s.type !== x.typePlan,
  )
  if (adaptees.length) {
    out.push(
      `L'indice projeté change déjà ${adaptees.length > 1 ? `${adaptees.length} séances` : 'une séance'} : ${adaptees
        .map((x) => `${jourDe(x.day)}, ${x.s.title.toLowerCase()}`)
        .join(' ; ')}. Ça peut encore bouger d'ici là.`,
    )
  }

  const courses = seances.filter((x) => COURSE.includes(x.typePlan)).length
  const velos = seances.filter((x) => x.typePlan === 'velo').length
  if (courses >= 4 && velos === 0) out.push('Semaine à quatre courses, sans vélo.')

  if (out.length === 0) out.push('Semaine type, rien de particulier annoncé.')
  return out
}
