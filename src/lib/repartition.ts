/**
 * La répartition de l'entraînement d'une semaine, en minutes par intensité.
 *
 * Demandée le 22 septembre 2026 pour Suivi : combien de la semaine se passe
 * en endurance, au seuil, en vitesse. C'est la lecture que Maxime fait d'une
 * semaine avant ses kilomètres, et c'est elle qui dit si le 80/20 tient.
 *
 * Tout se compte en TEMPS, jamais en kilomètres : un kilomètre de vélo et un
 * kilomètre de course ne coûtent pas la même chose, une minute d'effort si.
 * Les séances sautées ne comptent pas ; le reste est le plan de la semaine,
 * écarts appliqués, fait ou à venir.
 */
import type { Session, ZoneKey } from '../data/types'
import { deroulerSeance } from './deroule'
import { estimateDuration } from './paces'

export type CategorieRepartition = 'endurance' | 'marathon' | 'seuil' | 'vitesse' | 'velo' | 'renfo'

/** Du plus facile au plus dur, puis le hors-course : l'ordre de la légende. */
export const ORDRE_REPARTITION: CategorieRepartition[] = ['endurance', 'marathon', 'seuil', 'vitesse', 'velo', 'renfo']

export const LIBELLE_REPARTITION: Record<CategorieRepartition, string> = {
  endurance: 'Endurance',
  marathon: 'Allure marathon',
  seuil: 'Seuil',
  vitesse: 'Vitesse',
  velo: 'Vélo',
  renfo: 'Renfo',
}

/** L'allure semi compte au seuil, les intervalles et les répétitions en vitesse. */
const CATEGORIE_ZONE: Record<ZoneKey, CategorieRepartition> = {
  recup: 'endurance',
  ef: 'endurance',
  am: 'marathon',
  semi: 'seuil',
  seuil: 'seuil',
  vo2: 'vitesse',
  rep: 'vitesse',
}

const COURSE: Session['type'][] = ['long', 'ef', 'inter', 'tempo', 'test', 'course', 'race', 'marche']

const milieu = (s: Session, marathonPace: number) => {
  const [lo, hi] = estimateDuration(s, marathonPace)
  return (lo + hi) / 2
}

export function repartitionSemaine(
  seances: Session[],
  marathonPace: number,
): Record<CategorieRepartition, number> {
  const minutes: Record<CategorieRepartition, number> = {
    endurance: 0,
    marathon: 0,
    seuil: 0,
    vitesse: 0,
    velo: 0,
    renfo: 0,
  }

  for (const s of seances) {
    if (s.saute || s.type === 'repos') continue
    if (s.type === 'velo') {
      minutes.velo += milieu(s, marathonPace)
      continue
    }
    if (!COURSE.includes(s.type)) {
      // Renfo et escalade : du temps sans allure.
      minutes.renfo += milieu(s, marathonPace)
      continue
    }

    const blocs = deroulerSeance(s, marathonPace)
    let compte = 0
    for (const b of blocs) {
      if (b.effort.secondes != null) {
        // Un effort sans zone (« 45 s en côte ») est de la vitesse dans une
        // séance de qualité, de l'endurance ailleurs.
        const cat = b.effort.zone
          ? CATEGORIE_ZONE[b.effort.zone]
          : s.type === 'inter' || s.type === 'tempo'
            ? 'vitesse'
            : 'endurance'
        minutes[cat] += (b.effort.secondes * b.reps) / 60
        compte += (b.effort.secondes * b.reps) / 60
      }
      // La récupération entre deux tours se trottine : c'est de l'endurance.
      if (b.recup?.secondes != null) {
        minutes.endurance += (b.recup.secondes * b.reps) / 60
        compte += (b.recup.secondes * b.reps) / 60
      }
    }
    // Une course sans déroulé lisible vaut sa durée estimée : une endurance
    // de 10 km en endurance, un dossard à l'allure de sa distance.
    if (compte === 0) {
      const cat: CategorieRepartition =
        s.type === 'race' || s.type === 'course'
          ? (s.dist ?? 0) <= 10
            ? 'vitesse'
            : (s.dist ?? 0) <= 21.1
              ? 'seuil'
              : 'marathon'
          : 'endurance'
      minutes[cat] += milieu(s, marathonPace)
    }
  }

  for (const k of ORDRE_REPARTITION) minutes[k] = Math.round(minutes[k])
  return minutes
}
