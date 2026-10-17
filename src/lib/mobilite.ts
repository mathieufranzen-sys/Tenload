/**
 * La mobilité : un geste du carnet qui ne pèse rien dans l'indice, suivi en
 * série de jours (demandé par Mathieu le 17 octobre 2026).
 *
 * Zéro point, parce qu'aucune source ne montre que s'étirer protège un
 * tendon : la méta-analyse de Lauersen (BJSM 2014) ne trouve aucun effet de
 * l'étirement sur les blessures, quand le renforcement les divise par trois.
 * Ce que l'étirement fait, en revanche, est solide : pratiqué souvent pendant
 * au moins deux semaines, il gagne de l'amplitude (Konrad 2024, 77 études),
 * et ce gain recule dès deux à six semaines d'arrêt (Konrad 2025). C'est un
 * bénéfice de régularité, d'où une série plutôt qu'un crédit.
 *
 * La colonne est `daily_logs.stretching`, qui existait sans être saisie :
 * aucune table à créer.
 */
import { addDays } from './dates'
import type { DailyLogRow } from './buildPain'

export interface SerieMobilite {
  /** Jours d'affilée jusqu'à aujourd'hui, ou jusqu'à hier si aujourd'hui n'est pas encore fait. */
  enCours: number
  record: number
  faitAujourdhui: boolean
  /** Jours de mobilité sur les 28 derniers, aujourd'hui compris. */
  sur28: number
}

export function serieMobilite(logs: DailyLogRow[], now: string): SerieMobilite {
  const jours = new Set(logs.filter((l) => l.stretching && l.day <= now).map((l) => l.day))
  const faitAujourdhui = jours.has(now)

  // Aujourd'hui pas encore fait ne casse pas la série : la journée n'est pas finie.
  let enCours = 0
  for (let d = faitAujourdhui ? now : addDays(now, -1); jours.has(d); d = addDays(d, -1)) enCours++

  let record = 0
  let courant = 0
  let precedent: string | null = null
  for (const d of [...jours].sort()) {
    courant = precedent && addDays(precedent, 1) === d ? courant + 1 : 1
    record = Math.max(record, courant)
    precedent = d
  }

  let sur28 = 0
  for (let k = 0; k < 28; k++) if (jours.has(addDays(now, -k))) sur28++

  return { enCours, record, faitAujourdhui, sur28 }
}

/**
 * Ce que disent les études, une phrase chacune, au tutoiement du coach.
 * Rien qui promette une protection que les sources ne donnent pas.
 */
const BIENFAITS = [
  'Étirer souvent pendant au moins deux semaines gagne de l’amplitude, et le statique tenu 30 à 60 s en gagne plus que le dynamique (Konrad 2024, 77 études).',
  'Une cheville qui plie mal vers l’avant est associée à plus de tendinopathies d’Achille (Rabin 2014). Le genou au mur est l’exercice qui la travaille.',
  'L’amplitude gagnée recule dès deux à six semaines sans étirement (Konrad 2025) : c’est la régularité qui la garde, pas la séance longue.',
  'Le renfo en pleine amplitude gagne autant de mobilité que l’étirement (Afonso 2021). Tes descentes lentes au mollet travaillent aussi ta cheville.',
  'Avant de courir, préfère un échauffement dynamique : l’étirement statique ne change pas l’économie de course (Sports Medicine Open 2025). Garde-le pour après ou le soir.',
  'S’étirer ne protège pas des blessures à lui seul, le renforcement si (Lauersen 2014). La mobilité accompagne ton renfo, elle ne le remplace pas.',
]

/** Le mot du coach sous la série : où tu en es, puis un bienfait qui change chaque jour. */
export function motMobilite(s: SerieMobilite, now: string): string {
  const jour = Math.floor(Date.parse(`${now}T12:00:00Z`) / 86_400_000)
  const bienfait = BIENFAITS[((jour % BIENFAITS.length) + BIENFAITS.length) % BIENFAITS.length]

  let etat: string
  if (s.enCours === 0 && s.record === 0) etat = 'Dix minutes suffisent pour lancer ta première série.'
  else if (s.enCours === 0) etat = `Ta série s’est arrêtée. Ton record est de ${s.record} jours : une séance aujourd’hui la relance.`
  else if (!s.faitAujourdhui) etat = `${s.enCours} jour${s.enCours > 1 ? 's' : ''} d’affilée. Fais-la aujourd’hui pour ne pas casser la série.`
  else if (s.enCours >= s.record)
    etat = s.enCours > 1 ? `${s.enCours} jours d’affilée, c’est ton record.` : 'Premier jour de ta série.'
  else if (s.enCours >= 14) etat = `${s.enCours} jours d’affilée : tu as passé les deux semaines où l’amplitude commence à gagner.`
  else etat = `${s.enCours} jour${s.enCours > 1 ? 's' : ''} d’affilée, ${s.record - s.enCours} de plus pour égaler ton record.`

  return `${etat} ${bienfait}`
}

export type ZoneMobilite = 'Cheville et pied' | 'Hanche' | 'Genou' | 'Dos'

export interface ExerciceMobilite {
  id: string
  zone: ZoneMobilite
  nom: string
  dose: string
  consigne: string
  /** Mis de côté le temps d'une blessure : affiché, mais pas à faire. */
  pause?: string
}

/**
 * Une dizaine de minutes, à faire hors séance de course ou après. Le
 * statique est tenu 30 à 60 s (Konrad 2024). La cheville passe en premier :
 * c'est l'amplitude que les sources relient au tendon d'Achille (Rabin 2014).
 */
export const EXERCICES_MOBILITE: ExerciceMobilite[] = [
  {
    id: 'genou-au-mur',
    zone: 'Cheville et pied',
    nom: 'Genou au mur',
    dose: '2 × 10 par côté',
    consigne: 'Talon collé au sol, le genou vient toucher le mur, 2 s. Recule le pied d’un cran quand c’est facile.',
  },
  {
    id: 'soleaire-mur',
    zone: 'Cheville et pied',
    nom: 'Mollet genou fléchi au mur',
    dose: '2 × 45 s par côté',
    consigne: 'Un étirement doux, pas une charge : rien ne doit tirer au tendon.',
  },
  {
    id: 'balle-voute',
    zone: 'Cheville et pied',
    nom: 'Balle sous la voûte plantaire',
    dose: '1 min par pied',
    consigne: 'Debout, roule lentement du talon aux orteils.',
  },
  {
    id: 'flechisseurs-hanche',
    zone: 'Hanche',
    nom: 'Fléchisseurs de hanche en fente basse',
    dose: '2 × 45 s par côté',
    consigne: 'Genou arrière au sol, fessier serré, bassin poussé vers l’avant sans creuser le dos.',
  },
  {
    id: 'hanche-90-90',
    zone: 'Hanche',
    nom: 'Rotations 90/90',
    dose: '2 × 8 par côté',
    consigne: 'Assis, les deux genoux à 90°, bascule les jambes d’un côté à l’autre en gardant le buste droit.',
  },
  {
    id: 'fessier-figure-4',
    zone: 'Hanche',
    nom: 'Fessier en figure 4',
    dose: '2 × 45 s par côté',
    consigne: 'Sur le dos, cheville sur le genou opposé, tire la cuisse vers toi.',
  },
  {
    id: 'adducteurs-grenouille',
    zone: 'Hanche',
    nom: 'Adducteurs en grenouille',
    dose: '2 × 10 bascules',
    consigne: 'À quatre pattes, genoux écartés, recule le bassin vers les talons et reviens.',
  },
  {
    id: 'quadriceps-debout',
    zone: 'Genou',
    nom: 'Quadriceps debout',
    dose: '2 × 45 s par côté',
    consigne: 'Talon vers la fesse, genoux serrés, bassin rentré.',
  },
  {
    id: 'ischios-jambe-tendue',
    zone: 'Genou',
    nom: 'Ischios jambe tendue',
    dose: '2 × 45 s par côté',
    consigne: 'Sur le dos, jambe tendue tenue par une sangle, jusqu’à la première tension.',
    pause: 'En pause jusqu’au feu vert du kiné pour ton ischio.',
  },
  {
    id: 'livre-ouvert',
    zone: 'Dos',
    nom: 'Rotations thoraciques en livre ouvert',
    dose: '2 × 8 par côté',
    consigne: 'Sur le côté, genoux pliés, ouvre le bras du dessus vers le sol derrière toi en suivant la main des yeux.',
  },
]
