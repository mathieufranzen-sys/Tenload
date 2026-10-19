/**
 * L'objectif du 10 km du 15 novembre, en secondes, quand Mathieu l'a saisi.
 *
 * Arbitré le 19 octobre 2026 : les séances à allure 10 km du bloc B
 * (`Session.allure10k`) se courent à l'allure de CET objectif, pas à
 * l'allure marathon moins 40. Ancrées sur 3 h 15, elles tombaient à 3:57,
 * soit un 10 km en 39:30, quand il se savait capable de 37:30.
 *
 * Une valeur de module plutôt qu'un paramètre, comme la date simulée : les
 * allures se calculent dans une vingtaine de fonctions qui ne reçoivent que
 * `marathonPace`. `App` la pose à chaque rendu, avant ses enfants. Sans
 * objectif saisi, rien ne change : l'objectif par défaut du dossard est le
 * record de 40:12, plus lent que l'allure du plan, et ne doit pas ralentir
 * les séances.
 */
let objectif: number | null = null

export function definirObjectif10k(secondes: number | null): void {
  objectif = secondes != null && secondes > 0 ? secondes : null
}

export const objectif10k = (): number | null => objectif
