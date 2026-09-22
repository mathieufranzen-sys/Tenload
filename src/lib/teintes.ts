/**
 * Les teintes d'interface des cinq bandes.
 *
 * `BANDS` (tendonIndex.ts) porte aussi une couleur, mais c'est un fichier du
 * modèle, verrouillé par ses tests : la refonte visuelle ne le touche pas. Les
 * écrans lisent donc leur teinte ici, et `BANDS` ne sert plus qu'au calcul.
 */
import type { BandKey } from './tendonIndex'

export const TEINTE_BANDE: Record<BandKey, string> = {
  vert: '#65f67b',
  jaune: '#ffd23f',
  orange: '#ff9500',
  rouge: '#ff3b30',
  noir: '#1a1a1a',
}

/** Encre lisible posée SUR la teinte : sombre partout, sauf sur le noir. */
export const ENCRE_BANDE: Record<BandKey, string> = {
  vert: '#142800',
  jaune: '#142800',
  orange: '#142800',
  rouge: '#ffffff',
  noir: '#ffffff',
}

export const teinteBande = (k: BandKey) => TEINTE_BANDE[k]
