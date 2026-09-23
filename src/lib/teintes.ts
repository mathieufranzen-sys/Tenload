/**
 * Les teintes d'interface des cinq bandes.
 *
 * `BANDS` (tendonIndex.ts) porte aussi une couleur, mais c'est un fichier du
 * modèle, verrouillé par ses tests : la refonte visuelle ne le touche pas. Les
 * écrans lisent donc leur teinte ici, et `BANDS` ne sert plus qu'au calcul.
 */
import type { BandKey } from './tendonIndex'

/**
 * Les camaïeux de la branche main, repris le 22 septembre 2026 à la demande
 * de Mathieu : cinq familles, six teintes chacune, m2 la référente et m4 la
 * claire. La famille verte prend le vert de la marque à la place du vert
 * d'eau. Le nom des bandes ne décrit plus leur couleur — le « jaune » est un
 * bleu, le « noir » un violet — mais c'est l'ordre qui se lit, pas la teinte.
 */
export const CAMAIEU_BANDE: Record<BandKey, { m1: string; m2: string; m3: string; m4: string; m5: string; m6: string }> = {
  vert: { m1: '#c9fdd2', m2: '#49de61', m3: '#1f8a3b', m4: '#65f67b', m5: '#0f3d1c', m6: '#04140e' },
  jaune: { m1: '#bfdbfe', m2: '#4e8cff', m3: '#1d4ed8', m4: '#93c5fd', m5: '#1e3a8a', m6: '#05070f' },
  orange: { m1: '#fde68a', m2: '#f5b32e', m3: '#b45309', m4: '#fcd34d', m5: '#78350f', m6: '#170f02' },
  rouge: { m1: '#fecaca', m2: '#ff5a46', m3: '#b91c1c', m4: '#fb7185', m5: '#7f1d1d', m6: '#170504' },
  noir: { m1: '#e9d5ff', m2: '#a855f7', m3: '#7e22ce', m4: '#d946ef', m5: '#4c1d95', m6: '#0f0518' },
}

/** L'aplat d'une bande : le m4 de sa famille, la teinte claire. */
export const TEINTE_BANDE: Record<BandKey, string> = {
  vert: CAMAIEU_BANDE.vert.m4,
  jaune: CAMAIEU_BANDE.jaune.m4,
  orange: CAMAIEU_BANDE.orange.m4,
  rouge: CAMAIEU_BANDE.rouge.m4,
  noir: CAMAIEU_BANDE.noir.m4,
}

/**
 * L'encre posée SUR l'aplat : le m6 de la même famille, le presque noir qui
 * la termine. Les cinq m4 sont clairs, une encre blanche n'y tiendrait pas.
 */
export const ENCRE_BANDE: Record<BandKey, string> = {
  vert: '#142800',
  jaune: CAMAIEU_BANDE.jaune.m6,
  orange: CAMAIEU_BANDE.orange.m6,
  rouge: CAMAIEU_BANDE.rouge.m6,
  noir: CAMAIEU_BANDE.noir.m6,
}

export const teinteBande = (k: BandKey) => TEINTE_BANDE[k]
