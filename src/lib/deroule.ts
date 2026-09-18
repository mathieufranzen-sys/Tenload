/**
 * Le déroulé d'une séance : ses blocs dans l'ordre, avec leurs répétitions et
 * leur durée estimée.
 *
 * Le plan écrit ses séances comme les écrit un entraîneur — « 6 x 1000 m »,
 * puis « récup 90 s » sur la ligne suivante. C'est lisible pour un humain,
 * mais illisible pour un graphique : rien ne dit que la récupération appartient
 * à la répétition qui la précède, ni combien de fois la paire se joue.
 *
 * Ce module en fait une structure : un bloc porte son effort, sa récupération
 * s'il y en a une, et son nombre de tours. C'est ce qui permet de dessiner le
 * profil de la séance et de replier les cinq répétitions en une seule carte
 * marquée « x5 », au lieu de dix lignes identiques.
 */
import planJson from '../data/plan.json'
import type { Plan, Session, Step, ZoneKey } from '../data/types'
import { zonePace } from './paces'

const plan = planJson as unknown as Plan

export type PhaseCle = 'wu' | 'main' | 'cd'

export interface SegmentDeroule {
  /** « Allure Seuil », ou la consigne libre quand le pas n'a pas de zone. */
  libelle: string
  /** La quantité telle que le plan l'écrit : « 1000 m », « 90 s », « 2 km ». */
  quantite: string
  zone: ZoneKey | null
  /** Durée estimée, en secondes. `null` quand la quantité ne se convertit pas. */
  secondes: number | null
}

export interface BlocDeroule {
  phase: PhaseCle
  /** 1 pour un bloc continu. */
  reps: number
  effort: SegmentDeroule
  /** La récupération entre deux tours. Absente d'un bloc continu. */
  recup?: SegmentDeroule
}

/** « 6 x 1000 m » → 6 tours de « 1000 m ». Rien sinon. */
export function lireRepetition(libelle: string): { reps: number; reste: string } {
  const m = /^(\d+)\s*[x×]\s*(.+)$/i.exec(libelle.trim())
  if (!m) return { reps: 1, reste: libelle.trim() }
  return { reps: Number(m[1]), reste: m[2].trim() }
}

/**
 * Durée d'une quantité, en secondes.
 *
 * Les distances passent par l'allure de leur zone : c'est la seule façon
 * d'avoir une largeur de barre juste, un 1000 m en VO2 et un 1000 m en
 * endurance ne durent pas le même temps. Une quantité sans zone connue
 * (« 6 x 45 s en côte modérée ») garde sa durée si elle est écrite en temps.
 */
export function dureeSegment(
  quantite: string,
  zone: ZoneKey | null,
  marathonPace: number,
): number | null {
  const t = quantite.trim().toLowerCase().replace(',', '.')

  const km = /^([\d.]+)\s*km\b/.exec(t)
  if (km && zone) return Number(km[1]) * zonePace(marathonPace, zone)

  const metres = /^([\d.]+)\s*m\b(?!in)/.exec(t)
  if (metres && zone) return (Number(metres[1]) / 1000) * zonePace(marathonPace, zone)

  // Une somme entre parenthèses — « (1 min vif + 1 min souple) » — vaut le
  // total de ses termes : c'est un tour complet, pas deux blocs.
  let total = 0
  let trouve = false
  for (const m of t.matchAll(/([\d.]+)\s*(min|s)\b/g)) {
    total += Number(m[1]) * (m[2] === 'min' ? 60 : 1)
    trouve = true
  }
  return trouve ? total : null
}

/** Vrai si le pas décrit une récupération et non un effort. */
export function estRecup(libelle: string): boolean {
  return /^r[ée]cup/i.test(libelle.trim())
}

function segment(step: Step, marathonPace: number): SegmentDeroule {
  const brut = String(step[0])
  const second = step[1]
  const zone = second && second in plan.zones ? (second as ZoneKey) : null
  const consigne = second && !zone ? String(second) : undefined

  // « récup 90 s » : le mot porte le rôle, le reste porte la quantité.
  const recup = estRecup(brut)
  const quantite = recup ? brut.replace(/^r[ée]cup\s*/i, '') : brut

  // Sans zone, c'est la consigne du plan qui tient lieu de libellé. La
  // reprendre en dessous de la quantité aurait affiché deux fois la même
  // phrase, « 45 s en côte modérée » au-dessus de lui-même.
  const libelle = zone
    ? `Allure ${plan.zones[zone].label}`
    : recup
      ? 'Récupération'
      : (consigne ?? 'Effort libre')

  return {
    libelle,
    quantite,
    zone,
    secondes: dureeSegment(quantite, zone ?? (recup ? 'recup' : null), marathonPace),
  }
}

/**
 * `struct` (les sorties longues) n'a ni échauffement ni répétitions : chaque
 * segment est un bloc continu de son propre nombre de kilomètres.
 */
function depuisStruct(s: Session, marathonPace: number): BlocDeroule[] {
  return (s.struct ?? []).map((seg) => ({
    phase: 'main' as const,
    reps: 1,
    effort: {
      libelle: `Allure ${plan.zones[seg.zone].label}`,
      quantite: `${String(seg.km).replace('.', ',')} km`,
      zone: seg.zone,
      secondes: seg.km * zonePace(marathonPace, seg.zone),
    },
  }))
}

function depuisPas(steps: Step[], phase: PhaseCle, marathonPace: number): BlocDeroule[] {
  const blocs: BlocDeroule[] = []
  for (let i = 0; i < steps.length; i++) {
    // Un pas écrit en nombre est un nombre de kilomètres : c'est ainsi que le
    // plan note l'échauffement et le retour au calme. La normalisation se fait
    // ici, avant la lecture des répétitions, sinon `segment` ne voit plus
    // qu'une chaîne « 2.5 » dont il ne peut plus rien tirer.
    const brut =
      typeof steps[i][0] === 'number'
        ? `${String(steps[i][0]).replace('.', ',')} km`
        : String(steps[i][0])
    if (estRecup(brut)) {
      // Une récupération orpheline reste un bloc à elle : elle a bien eu lieu.
      if (blocs.length && blocs[blocs.length - 1].recup === undefined && blocs[blocs.length - 1].reps > 1) {
        blocs[blocs.length - 1].recup = segment(steps[i], marathonPace)
        continue
      }
    }
    const { reps, reste } = lireRepetition(brut)
    const seg = segment([reste, steps[i][1]], marathonPace)
    blocs.push({ phase, reps, effort: seg })
  }
  return blocs
}

export function deroulerSeance(s: Session, marathonPace: number): BlocDeroule[] {
  if (s.struct?.length) return depuisStruct(s, marathonPace)
  return [
    ...depuisPas(s.wu ?? [], 'wu', marathonPace),
    ...depuisPas(s.main ?? [], 'main', marathonPace),
    ...depuisPas(s.cd ?? [], 'cd', marathonPace),
  ]
}

/**
 * Les trois rôles que porte la couleur du profil. La charge du tendon garde
 * ses cinq bandes pour elle ; ici on ne dit que la nature de l'effort, comme
 * les autres graphiques de l'app.
 */
export type RoleSegment = 'facile' | 'effort' | 'recup'

export function roleDe(
  seg: SegmentDeroule,
  estRecuperation: boolean,
  phase: PhaseCle = 'main',
): RoleSegment {
  if (estRecuperation) return 'recup'
  if (seg.zone === 'recup' || seg.zone === 'ef') return 'facile'
  // Sans zone, la phase tranche : « 6 x 45 s en côte » est un effort, même si
  // le plan ne lui donne pas d'allure, et l'afficher en jaune à côté de son
  // échauffement disait exactement le contraire de la séance.
  if (seg.zone == null) return phase === 'main' ? 'effort' : 'facile'
  return 'effort'
}

export const COULEUR_ROLE: Record<RoleSegment, string> = {
  facile: 'var(--chart-3)',
  effort: 'var(--chart-1)',
  recup: 'var(--chart-2)',
}

/**
 * Hauteur relative d'une barre, de 0 à 1. L'échelle suit le rang de la zone :
 * une récupération ne monte pas plus haut qu'un footing, un 400 m touche le
 * plafond. Une récupération entre deux tours reste basse quoi qu'il arrive,
 * comme sur les profils de séance des montres.
 */
const HAUTEUR_ZONE: Record<ZoneKey, number> = {
  recup: 0.34,
  ef: 0.44,
  am: 0.66,
  semi: 0.73,
  seuil: 0.8,
  vo2: 0.92,
  rep: 1,
}

export function hauteurSegment(
  seg: SegmentDeroule,
  estRecuperation: boolean,
  phase: PhaseCle = 'main',
): number {
  if (estRecuperation) return 0.24
  if (seg.zone) return HAUTEUR_ZONE[seg.zone]
  return phase === 'main' ? 0.78 : 0.44
}
