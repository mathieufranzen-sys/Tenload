/**
 * Indices à étiqueter sur l'axe des abscisses des quatre graphiques.
 *
 * Un premier essai espaçait les indices d'un pas fixe (« un point sur
 * `stepX` ») et forçait toujours le dernier. Deux points proches d'un même
 * multiple pouvaient alors se chevaucher : l'écart entre deux libellés
 * dépend de la largeur du TEXTE (« 31 août » est plus large que « 18 mai »)
 * et de l'échelle réelle en pixels, pas seulement du nombre de points qui
 * les séparent. Ici, chaque candidat n'est retenu que s'il est à au moins
 * `ecartMin` pixels du dernier libellé déjà retenu ; le dernier point est
 * toujours affiché, quitte à faire céder sa place au précédent s'il est
 * trop proche.
 */
export function indicesEtiquettes(
  n: number,
  x: (i: number) => number,
  ecartMin = 40,
): Set<number> {
  if (n <= 0) return new Set()

  const indices = [0]
  for (let i = 1; i < n; i++) {
    if (x(i) - x(indices[indices.length - 1]) >= ecartMin) indices.push(i)
  }

  if (indices[indices.length - 1] !== n - 1) {
    if (indices.length > 1 && x(n - 1) - x(indices[indices.length - 1]) < ecartMin) {
      indices.pop()
    }
    indices.push(n - 1)
  }

  return new Set(indices)
}
