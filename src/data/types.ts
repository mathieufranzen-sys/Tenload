/** Types du plan d'entraînement. Le JSON de `plan.json` respecte ces formes. */

export type ZoneKey = 'recup' | 'ef' | 'am' | 'seuil' | 'vo2' | 'rep'

export type SessionType =
  | 'long' // sortie longue
  | 'ef' // endurance facile
  | 'inter' // intervalles
  | 'tempo' // seuil / tempo
  | 'test' // séance de calibrage
  | 'course' // course test (semi)
  | 'race' // le marathon
  | 'muscu-haut'
  | 'muscu-bas'
  | 'velo'
  | 'escalade'
  | 'repos'

export interface Zone {
  label: string
  /** Écart en secondes par kilomètre par rapport à l'allure marathon cible. */
  off: number
  /** Type de séance dont on emprunte le dégradé pour représenter la zone. */
  color: SessionType
}

export interface Bloc {
  id: 'A' | 'B' | 'C' | 'D' | 'E'
  name: string
  /** [première semaine, dernière semaine] inclus. */
  weeks: [number, number]
  focus: string
  color: string
}

/** Un segment de sortie longue : tant de kilomètres dans telle zone. */
export interface Segment {
  km: number
  zone: ZoneKey
}

/** Un exercice de musculation : [nom, séries et répétitions, précision]. */
export type Exercise = [string, string, string]

/**
 * Un pas de séance fractionnée : [libellé, zone ou consigne libre].
 * Le deuxième élément est une ZoneKey quand l'allure est cadrée,
 * une chaîne libre pour une consigne, ou null pour un simple intitulé.
 */
export type Step = [string | number, ZoneKey | string | null]

export interface Session {
  /** 0 = lundi … 6 = dimanche. */
  day: number
  type: SessionType
  title: string
  /** Libellé de catégorie affiché sous le titre. */
  cat: string
  /** Distance en kilomètres, absente pour le vélo, la muscu, le repos. */
  dist?: number
  /** Fourchette de durée en minutes, quand elle est fixée d'avance. */
  dur?: [number, number] | null
  /** Sortie longue : découpage en segments d'allure. */
  struct?: Segment[] | null
  /** Séance fractionnée : échauffement, corps de séance, retour au calme. */
  wu?: Step[] | null
  main?: Step[] | null
  cd?: Step[] | null
  /** Musculation : la liste des exercices. */
  ex?: Exercise[] | null
  /** Le mot du coach, affiché dans le détail de la séance. */
  note: string
  /** Séance facultative (le vélo du vendredi). */
  optional?: boolean
  /** La séance attend un ressenti après coup. */
  feedback?: boolean
  /** Bascule proposée si la douleur au réveil dépasse le seuil. */
  swap?: { title: string; reason: string }
  /** Rempli à l'exécution quand le moteur d'adaptation modifie la séance. */
  adapted?: string
  /** Rempli à l'exécution quand un écart volontaire modifie la séance. */
  ecart?: string
  /** Rempli à l'exécution : séance déclarée non faite. Vaut zéro dans la charge. */
  saute?: boolean
}

export interface Week {
  /** Numéro de semaine, 1 à 35. */
  n: number
  bloc: Bloc['id']
  blocName: string
  /** Date ISO du lundi. */
  monday: string
  deload: boolean
  /** Kilométrage de la sortie longue. 0 pour la semaine d'amorce. */
  sl: number
  /** Kilométrage de l'endurance facile du mardi. */
  efKm: number
  sessions: Session[]
}

export interface PlanMeta {
  athlete: string
  goal: string
  goalLabel: string
  /** Date ISO du marathon. */
  raceDate: string
  /** Date ISO du lundi de la semaine 1. */
  start: string
  weeks: number
  /** Allure marathon cible en secondes par kilomètre. Ancre toutes les zones. */
  targetMarathonPace: number
  /** Temps du dernier test de 3 km, en secondes. */
  test3k: number
  /** Allure marathon projetée par ce test, en secondes par kilomètre. */
  fitnessPace: number
  constraints: string[]
}

export interface Plan {
  meta: PlanMeta
  zones: Record<ZoneKey, Zone>
  blocs: Bloc[]
  weeks: Week[]
}
