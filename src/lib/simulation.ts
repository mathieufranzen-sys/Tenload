/**
 * L'horloge et le stockage, remplaçables par le laboratoire de charge.
 *
 * Le laboratoire (`labo.html`, en développement seulement) fait vivre quatre
 * profils fictifs côte à côte et les avance ensemble, jour après jour. Il lui
 * faut deux choses que l'app ne prévoyait pas :
 *
 * - une DATE qu'on choisit, lue partout où l'app lit l'horloge. `today()` est
 *   le seul point d'entrée (dates.ts), tous les écrans passent par lui ;
 * - un STOCKAGE séparé par profil : les quatre téléphones sont quatre iframes
 *   de la même origine, donc d'un même `localStorage`. La mémoire du coach
 *   (« jamais le même sujet trois jours de suite ») se serait nourrie des
 *   quatre histoires à la fois.
 *
 * Hors laboratoire, rien n'est posé : `today()` lit la vraie horloge et les
 * clés de stockage restent celles d'avant.
 */
let dateSimulee: string | null = null
let suffixe = ''

export function simuler(date: string | null, suffixeStockage = ''): void {
  dateSimulee = date
  suffixe = suffixeStockage
}

export const dateDeSimulation = (): string | null => dateSimulee

/** À coller au bout d'une clé `localStorage` qui ne doit pas se partager entre profils. */
export const suffixeStockage = (): string => suffixe
