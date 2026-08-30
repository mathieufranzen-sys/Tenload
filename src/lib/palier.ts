/**
 * Le palier de la sortie longue : la progression ne monte pas tant que la
 * dernière marche n'est pas confirmée.
 *
 * L'indice de charge est un état du jour, pas une mémoire. Il retombe en trois
 * jours, et la sortie longue de la semaine suivante s'affichait donc en entier
 * même quand la précédente avait fait mal. La progression du plan n'apprenait
 * jamais du résultat de la sortie longue, alors que c'est la séance qui charge
 * le plus le tendon.
 *
 * **Le verdict appartient au lendemain matin, pas au moment de la saisie.**
 * C'est la règle des 24 heures de la rééducation des tendinopathies : une
 * douleur pendant l'effort est tolérable si elle redescend au niveau habituel
 * le lendemain et si la raideur au réveil n'est pas aggravée. Une douleur de
 * 5/10 pendant la séance ne dit rien à elle seule ; la raideur du lendemain,
 * mesurée à froid, dit tout.
 *
 * Ce que le palier fait : la prochaine sortie longue **répète la distance de
 * la précédente** au lieu de prendre ses deux kilomètres. Il ne réduit jamais.
 * Réduire est le travail de l'indice (orange, −20 %) ; ici on refuse seulement
 * d'augmenter, ce qui est la même règle que celle de `painInconnue` : on ne
 * dégrade pas sur une absence d'information, on refuse de monter dessus.
 */
import type { Session, SessionType, Week } from '../data/types'
import type { FeedbackRow } from './buildPain'
import { addDays } from './dates'
import { seancesAvecEcarts, slotsParJour, type EcartRow } from './overrides'
import type { PainMap } from './tendonIndex'

/** Au-delà, la séance elle-même était de trop, le lendemain n'y changera rien. */
export const DOULEUR_SEANCE_BLOQUANTE = 6
/** Au-delà, la raideur du lendemain est un signal en soi, quelle que soit la base. */
export const RAIDEUR_BLOQUANTE = 4
/** Hausse tolérée par rapport à la raideur habituelle des sept jours précédents. */
export const HAUSSE_TOLEREE = 1.5
/** En dessous de trois relevés, une « base » n'en est pas une. */
export const MIN_RELEVES_BASE = 3

/** Une séance du plan, une fois les écarts appliqués : sa vraie place et sa vraie date. */
export interface SeanceArrangee {
  week: number
  jourOrigine: number
  slot: number
  /** Date ISO effective, déplacement compris. */
  day: string
  type: SessionType
  dist?: number
  saute: boolean
}

/** Le plan tel qu'il sera vécu, à plat et trié par date. */
export function arrangerPlan(weeks: Week[], ecarts?: Map<string, EcartRow>): SeanceArrangee[] {
  const out: SeanceArrangee[] = []
  for (const w of weeks) {
    const slots = slotsParJour(w.sessions)
    const avec: Session[] = ecarts ? seancesAvecEcarts(w, ecarts) : w.sessions
    avec.forEach((s, i) => {
      out.push({
        week: w.n,
        jourOrigine: w.sessions[i].day,
        slot: slots[i],
        day: addDays(w.monday, s.day + 7 * (s.semaines ?? 0)),
        type: s.type,
        dist: s.dist,
        saute: Boolean(s.saute),
      })
    })
  }
  return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.slot - b.slot))
}

export interface VerdictLongue {
  /** Date à laquelle la sortie longue a été faite. */
  day: string
  /** Distance retenue : celle notée si elle l'a été, celle prévue sinon. */
  km: number
  douleur: number
  /** Raideur au réveil le lendemain. `null` si elle n'a pas été saisie. */
  lendemain: number | null
  /** Raideur habituelle sur les sept jours qui précèdent. `null` si trop peu de relevés. */
  base: number | null
  encaisse: boolean
  /** La condition qui a échoué, pour l'étiquette de la séance. */
  raison: string | null
}

/** Moyenne des raideurs au réveil sur les sept jours qui précèdent `day`. */
export function baseRaideur(day: string, pain: PainMap): number | null {
  const vs: number[] = []
  for (let k = 1; k <= 7; k++) {
    const w = pain[addDays(day, -k)]?.wake
    if (w != null) vs.push(w)
  }
  if (vs.length < MIN_RELEVES_BASE) return null
  return vs.reduce((a, b) => a + b, 0) / vs.length
}

/** Un chiffre à la française, pour les libellés. */
const nb = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')

/**
 * Le verdict de la dernière sortie longue terminée.
 *
 * « Terminée » veut dire **notée** : c'est le ressenti qui atteste qu'elle a
 * eu lieu, pas la date. Une sortie longue passée mais jamais notée n'apprend
 * rien et ne bloque rien.
 */
export function verdictDerniereLongue(
  seances: SeanceArrangee[],
  feedback: FeedbackRow[],
  pain: PainMap,
  now: string,
): VerdictLongue | null {
  const notees = new Map(feedback.map((f) => [`${f.week}-${f.day_index}-${f.slot}`, f]))

  let derniere: { s: SeanceArrangee; f: FeedbackRow } | null = null
  for (const s of seances) {
    if (s.type !== 'long' || s.saute || s.day > now) continue
    const f = notees.get(`${s.week}-${s.jourOrigine}-${s.slot}`)
    if (!f) continue
    if (!derniere || s.day >= derniere.s.day) derniere = { s, f }
  }
  if (!derniere) return null

  const { s, f } = derniere
  const km = f.distance_km ?? s.dist ?? 0
  const lendemain = pain[addDays(s.day, 1)]?.wake ?? null
  const base = baseRaideur(s.day, pain)

  // Quatre conditions, toutes nécessaires. La première qui tombe donne la
  // raison affichée : c'est celle que Mathieu doit lire, pas la liste.
  let raison: string | null = null
  if (f.pain >= DOULEUR_SEANCE_BLOQUANTE) {
    raison = `Douleur ${nb(f.pain)}/10 pendant la sortie longue`
  } else if (lendemain == null) {
    raison = 'Raideur du lendemain non saisie'
  } else if (lendemain >= RAIDEUR_BLOQUANTE) {
    raison = `Raideur ${nb(lendemain)}/10 au réveil le lendemain`
  } else if (base != null && lendemain >= base + HAUSSE_TOLEREE) {
    raison = `Raideur montée de ${nb(base)} à ${nb(lendemain)} le lendemain`
  }

  return { day: s.day, km, douleur: f.pain, lendemain, base, encaisse: raison == null, raison }
}

export interface PalierLongue {
  /** Date de la sortie longue plafonnée. */
  jour: string
  /** Plafond, en kilomètres : la distance de la dernière sortie longue. */
  km: number
  /** Ce qui justifie le plafond, affiché en étiquette sur la séance. */
  raison: string
}

/**
 * Le plafond qui s'applique à la prochaine sortie longue, ou `null` si le
 * tendon a encaissé la précédente.
 *
 * Une seule séance est plafonnée, la suivante dans le temps : dès qu'elle est
 * faite et notée, un nouveau verdict se calcule sur elle. Plafonner toute la
 * suite du plan aplatirait les 35 semaines sur un seul mauvais matin.
 */
export function palierProchaineLongue(
  seances: SeanceArrangee[],
  feedback: FeedbackRow[],
  pain: PainMap,
  now: string,
): PalierLongue | null {
  const verdict = verdictDerniereLongue(seances, feedback, pain, now)
  if (!verdict || verdict.encaisse) return null

  const suivante = seances.find((s) => s.type === 'long' && !s.saute && s.day > now)
  if (!suivante?.dist || suivante.dist <= verdict.km) return null

  return { jour: suivante.day, km: verdict.km, raison: verdict.raison! }
}

/** Applique le plafond à une séance. Ne mute pas l'original. */
export function appliquerPalier(s: Session, palier: PalierLongue): Session {
  return {
    ...s,
    dist: palier.km,
    title: `Sortie longue de ${palier.km} km`,
    adapted: `Palier tenu · ${palier.raison}`,
    struct: [{ km: palier.km, zone: 'ef' }],
    note: `La distance ne monte pas cette semaine : ${palier.raison.toLowerCase()}. On répète le palier au lieu de le franchir. Si celle-ci passe sans réaction le lendemain, la progression reprend la semaine d'après.`,
  }
}
