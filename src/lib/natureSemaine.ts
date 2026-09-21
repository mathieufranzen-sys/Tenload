/**
 * Ce qu'est une semaine, en quelques mots.
 *
 * Une semaine à 18 km de sortie longue n'est pas une erreur de plan quand
 * elle est étiquetée « pause de longue » ; sans étiquette, elle en a tout
 * l'air. Partagé par la vue semaine et le calendrier du Programme.
 */
import type { Week } from '../data/types'

const NATURE: Record<string, string> = {
  charge: 'semaine de charge',
  decharge: 'décharge',
  pause: 'pause de longue',
  course: 'dossard',
  reprise: 'reprise',
  'longue qualitative': 'longue en blocs',
  affutage: 'affûtage',
}

/**
 * Le calendrier n'annonce pas « semaine de charge » sur chaque ligne : c'est
 * le cas courant, il n'apprend rien quand il se répète 20 fois. Il y met le
 * nom du bloc. La vue semaine, elle, n'en montre qu'une, et le dit.
 */
export const libelleNature = (semaine: Week, { charge = false } = {}): string => {
  if (semaine.nature === 'charge' && !charge) return semaine.blocName
  return NATURE[semaine.nature ?? ''] ?? (semaine.deload ? 'décharge' : semaine.blocName)
}
