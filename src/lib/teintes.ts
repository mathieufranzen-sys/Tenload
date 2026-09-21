/**
 * Les teintes d'interface des cinq bandes.
 *
 * `BANDS` (tendonIndex.ts) porte aussi une couleur, mais c'est un fichier du
 * modèle, verrouillé par ses tests : la refonte visuelle ne le touche pas. Les
 * écrans lisent donc leur teinte ici, et `BANDS` ne sert plus qu'au calcul.
 */
import type { BandKey } from './tendonIndex'

export const TEINTE_BANDE: Record<BandKey, string> = {
  vert: '#6fe0b0',
  jaune: '#f2cf6b',
  orange: '#ffb45c',
  rouge: '#ff6b5e',
  noir: '#0a0605',
}

/** Encre lisible posée SUR la teinte : sombre partout, sauf sur le noir. */
export const ENCRE_BANDE: Record<BandKey, string> = {
  vert: '#10231a',
  jaune: '#2a2006',
  orange: '#2e1604',
  rouge: '#2a0806',
  noir: '#ffffff',
}

export const teinteBande = (k: BandKey) => TEINTE_BANDE[k]
