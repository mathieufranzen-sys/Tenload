/**
 * Ce que le banc d'essai et les téléphones du laboratoire se disent.
 *
 * Module sans React ni app : le banc (`banc.ts`) l'importe sans tirer derrière
 * lui les cinq écrans, qu'il ne fait que contenir dans des iframes.
 */

/** Signature des messages : le banc et les téléphones n'écoutent que celle-là. */
export const SOURCE_LABO = 'tenload-labo'

export type EtatSeance = 'afaire' | 'faite' | 'sautee'

/** Ce qu'un téléphone envoie au banc après chaque rendu. */
export interface EtatLabo {
  source: typeof SOURCE_LABO
  type: 'etat'
  cle: string
  date: string
  idx: number
  bande: string
  douleurInconnue: boolean
  chargeInconnue: boolean
  reveil: number | null
  soir: number | null
  excentrique: boolean
  seances: Array<{ titre: string; etat: EtatSeance }>
}

/** Les saisies d'un profil, gardées d'un jour simulé à l'autre. */
export const cleSauvegarde = (cle: string) => `tenload-labo-v1-${cle}`
/** L'onglet ouvert, pour qu'un changement de date ne le fasse pas sauter. */
export const cleOnglet = (cle: string) => `tenload-labo-onglet-${cle}`
/** La mémoire du coach du profil (voir `simulation.ts`). */
export const cleCoach = (cle: string) => `tenload-coach-labo-${cle}`
/** La date du banc, pour la retrouver après un rechargement. */
export const CLE_DATE = 'tenload-labo-date'
