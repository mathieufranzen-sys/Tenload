/**
 * Comment une séance se distingue d'une autre, sans couleur.
 *
 * La couleur est réservée à la charge du tendon : c'est la seule information
 * de l'app qui soit un signal, avec un sens de lecture (vert on y va, noir on
 * s'arrête). Douze dégradés de type de séance à côté rendaient ce signal
 * indistinct — l'œil ne savait plus quelle teinte lisait quoi.
 *
 * À la place, deux dimensions séparées, toutes deux en encre neutre :
 *
 * 1. **La nature de la séance**, portée par une icône. La course en compte
 *    trois plutôt qu'une, parce que trois séances de course ne se préparent
 *    pas pareil : le coureur seul pour l'endurance, le coureur avec son sac
 *    pour la sortie longue — la seule où l'on emporte de quoi tenir la
 *    distance —, le coureur lancé pour la qualité. S'ajoutent pédaler,
 *    soulever, grimper, se reposer, et le dossard des jours de course.
 * 2. **L'intensité**, portée par une échelle de quatre barres. Elle nuance à
 *    l'intérieur d'une même icône : un tempo et des intervalles sont le même
 *    geste à deux efforts.
 *
 * Séparer les deux est un gain sur les dégradés, qui les confondaient : le
 * violet de la sortie longue ne disait ni « course » ni « facile ».
 */
import type { SessionType, ZoneKey } from '../data/types'

export type Discipline =
  | 'walk'
  | 'run'
  | 'runPack'
  | 'runFast'
  | 'bike'
  | 'dumb'
  | 'climb'
  | 'rest'
  | 'flag'

export interface StyleSeance {
  /** Nom d'icône dans `Icon`. */
  icone: Discipline
  /** 0 à 4. Zéro n'affiche aucune barre : le repos n'a pas d'intensité. */
  intensite: 0 | 1 | 2 | 3 | 4
  /** Libellé de la famille, pour les lecteurs d'écran. */
  famille: string
}

/**
 * L'intensité est celle de l'effort, pas celle du volume : une sortie longue
 * de 32 km reste une allure d'endurance. Le volume se lit déjà en chiffres
 * sur la carte, l'échelle n'a pas à le répéter.
 */
export const STYLE_SEANCE: Record<SessionType, StyleSeance> = {
  ef: { icone: 'run', intensite: 1, famille: 'Course facile' },
  long: { icone: 'runPack', intensite: 2, famille: 'Sortie longue' },
  tempo: { icone: 'runFast', intensite: 3, famille: 'Séance de qualité' },
  inter: { icone: 'runFast', intensite: 4, famille: 'Séance de qualité' },
  test: { icone: 'runFast', intensite: 4, famille: 'Test de calibrage' },
  course: { icone: 'flag', intensite: 4, famille: 'Dossard' },
  race: { icone: 'flag', intensite: 4, famille: 'Dossard' },
  velo: { icone: 'bike', intensite: 1, famille: 'Vélo' },
  marche: { icone: 'walk', intensite: 1, famille: 'Marche' },
  'muscu-haut': { icone: 'dumb', intensite: 2, famille: 'Renforcement' },
  'muscu-bas': { icone: 'dumb', intensite: 2, famille: 'Renforcement' },
  escalade: { icone: 'climb', intensite: 3, famille: 'Escalade' },
  repos: { icone: 'rest', intensite: 0, famille: 'Repos' },
}

export function styleSeance(type: SessionType): StyleSeance {
  return STYLE_SEANCE[type] ?? STYLE_SEANCE.ef
}

/**
 * Les six zones sont déjà ordonnées : leur rang suffit à les distinguer, sans
 * emprunter le dégradé d'un type de séance comme le faisait `Zone.color`.
 * L'encre monte de 22 % à 100 % de blanc, ce qui se lit comme une échelle.
 */
export const RANG_ZONE: Record<ZoneKey, number> = {
  recup: 0,
  ef: 1,
  am: 2,
  semi: 3,
  seuil: 4,
  vo2: 5,
  rep: 6,
}

export function encreZone(zone: ZoneKey): string {
  // Du gris clair de la récupération au vert Brand des répétitions :
  // l'échelle fonce, ce qui se lit comme une intensité même sans
  // distinguer les teintes entre elles.
  const t = Math.min(1, RANG_ZONE[zone] / 6)
  const de = [199, 199, 190]
  const a = [39, 67, 18]
  const c = de.map((v, i) => Math.round(v + (a[i] - v) * t))
  return `rgb(${c.join(',')})`
}
