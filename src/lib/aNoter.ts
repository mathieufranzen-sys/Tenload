/**
 * Les séances qui attendent encore leur ressenti.
 *
 * C'est le ressenti, et non la date, qui atteste qu'une séance a eu lieu :
 * tant qu'il manque, la journée n'entre pas dans la charge et l'indice lit un
 * silence comme une semaine légère, c'est-à-dire dans le sens rassurant. Un
 * décompte sur l'écran Suivi le signalait déjà, mais sans dire LESQUELLES,
 * donc sans permettre d'y aller. Cette liste est le chemin manquant.
 *
 * Elle est ordonnée du plus récent au plus ancien : une séance d'hier se note
 * encore de mémoire, une séance d'il y a trois semaines ne se note plus
 * honnêtement, et c'est donc par le haut qu'on rattrape.
 */
import type { Session, SessionType, Week } from '../data/types'
import { addDays } from './dates'
import { seancesAvecEcarts, slotsParJour, type EcartRow } from './overrides'

export interface SeanceANoter {
  /** Identité dans le plan de référence : la clé Supabase du ressenti. */
  semaineOrigine: number
  jourOrigine: number
  slot: number
  /** Date effective, déplacement compris. */
  day: string
  titre: string
  type: SessionType
  /**
   * Vrai quand le jour est révolu. Une séance du jour n'est pas en retard à
   * midi : elle peut n'avoir pas encore eu lieu. C'est ce sous-ensemble que
   * compte le badge de l'écran Suivi.
   */
  enRetard: boolean
}

export interface EntreeANoter {
  weeks: Week[]
  /** Clés `semaine-jourOrigine-slot` des séances déjà notées. */
  notees: Set<string>
  now: string
  ecarts?: Map<string, EcartRow>
  /**
   * Jours couverts par une activité importée. Le passé leur appartient : une
   * journée que Strava porte déjà n'a rien à noter, exactement comme dans
   * `buildLoad` et `joursAttestes`.
   */
  joursAvecActivite?: Set<string>
}

/** Une séance sans rien à noter : le repos, et tout ce que le plan n'a pas marqué. */
function aNoterDuTout(s: Session): boolean {
  return Boolean(s.feedback) && s.type !== 'repos' && !s.saute
}

export function seancesANoter({
  weeks,
  notees,
  now,
  ecarts,
  joursAvecActivite,
}: EntreeANoter): SeanceANoter[] {
  const out: SeanceANoter[] = []

  for (const w of weeks) {
    const slots = slotsParJour(w.sessions)
    const seances = ecarts ? seancesAvecEcarts(w, ecarts) : w.sessions

    seances.forEach((s, i) => {
      // `semaines` porte le franchissement du dimanche : une séance déplacée
      // d'une semaine se note à sa nouvelle date, pas à celle du plan.
      const day = addDays(w.monday, s.day + 7 * (s.semaines ?? 0))
      if (day > now) return
      if (joursAvecActivite?.has(day)) return
      if (!aNoterDuTout(s)) return

      // La clé garde le jour d'ORIGINE : déplacer une séance ne détache pas le
      // ressenti qui lui est rattaché.
      const jourOrigine = w.sessions[i].day
      if (notees.has(`${w.n}-${jourOrigine}-${slots[i]}`)) return

      out.push({
        semaineOrigine: w.n,
        jourOrigine,
        slot: slots[i],
        day,
        titre: s.title,
        type: s.type,
        enRetard: day < now,
      })
    })
  }

  // Du plus récent au plus ancien, et dans une même journée, l'ordre de la
  // journée : c'est celui du slot, donc celui du plan.
  return out.sort((a, b) => (a.day === b.day ? a.slot - b.slot : a.day < b.day ? 1 : -1))
}

/** Ce que compte le badge : les séances des jours révolus. */
export const compterEnRetard = (liste: SeanceANoter[]): number =>
  liste.reduce((n, x) => n + (x.enRetard ? 1 : 0), 0)
