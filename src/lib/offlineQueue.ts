/**
 * File d'attente des écritures, pour que l'app reste utilisable sans réseau.
 *
 * Toutes les écritures de Tendo sont des `upsert` sur une clé primaire
 * naturelle : (user_id, day) pour le journal, (user_id, week, day_index, slot)
 * pour un ressenti. Elles sont donc idempotentes, et rejouables sans risque de
 * doublon. C'est ce qui permet à cette file de rester simple : pas d'ordre
 * global à respecter, pas de transaction, juste des lignes à repousser.
 *
 * Deux entrées visant la même ligne fusionnent au lieu de s'empiler. Bouger un
 * curseur de douleur dix fois produit une écriture, pas dix. La fusion garde les
 * champs déjà saisis : cocher l'excentrique après avoir noté la douleur du soir
 * ne doit pas effacer la douleur du soir.
 */

export type TableEcrivable = 'daily_logs' | 'session_feedback' | 'profiles' | 'plan_overrides'

export interface Ecriture {
  table: TableEcrivable
  /** Identité de la ligne visée, sérialisée. Deux écritures de même clé fusionnent. */
  cle: string
  valeurs: Record<string, unknown>
  /** Horodatage de la dernière modification locale, arbitre des conflits. */
  maj: number
}

/** Envoie une écriture. Renvoie true si c'est passé, false si le réseau a manqué. */
export type Envoi = (e: Ecriture) => Promise<boolean>

const CLE_STOCKAGE = 'tendo.file-attente.v1'

/** Repli mémoire : Safari en navigation privée refuse localStorage. */
let memoire: Ecriture[] | null = null

function lire(): Ecriture[] {
  if (memoire) return memoire
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    memoire = brut ? (JSON.parse(brut) as Ecriture[]) : []
  } catch {
    memoire = []
  }
  return memoire
}

function ecrire(file: Ecriture[]): void {
  memoire = file
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(file))
  } catch {
    // Quota plein ou stockage refusé : la file vit en mémoire pour cette session.
  }
  for (const ecouteur of ecouteurs) ecouteur()
}

const ecouteurs = new Set<() => void>()

/** Abonnement pour l'indicateur « n saisies en attente ». */
export function souscrire(f: () => void): () => void {
  ecouteurs.add(f)
  return () => ecouteurs.delete(f)
}

export function fileActuelle(): Ecriture[] {
  return lire()
}

export function enAttente(): number {
  return lire().length
}

/** Empile une écriture, en fusionnant avec celle qui vise déjà la même ligne. */
export function empiler(e: Ecriture): void {
  const file = [...lire()]
  const i = file.findIndex((x) => x.table === e.table && x.cle === e.cle)
  if (i === -1) {
    file.push(e)
  } else {
    // La position d'origine est conservée : une saisie corrigée ne double pas la
    // file en repassant devant les autres.
    file[i] = {
      ...file[i],
      valeurs: { ...file[i].valeurs, ...e.valeurs },
      maj: Math.max(file[i].maj, e.maj),
    }
  }
  ecrire(file)
}

let enCours = false

/**
 * Rejoue la file dans l'ordre. Un échec réseau arrête le vidage et laisse le
 * reste en attente : inutile de marteler un serveur injoignable, l'événement
 * `online` ou le prochain montage relanceront.
 */
export async function vider(envoi: Envoi): Promise<{ envoyees: number; restantes: number }> {
  if (enCours) return { envoyees: 0, restantes: enAttente() }
  enCours = true
  let envoyees = 0
  try {
    while (true) {
      const file = lire()
      if (file.length === 0) break
      const e = file[0]
      let ok = false
      try {
        ok = await envoi(e)
      } catch {
        ok = false
      }
      if (!ok) break
      // La file est relue à chaque tour : une saisie faite pendant l'envoi a pu
      // fusionner avec l'entrée en cours, on ne retire donc que si elle est
      // restée identique.
      const apres = [...lire()]
      const i = apres.findIndex((x) => x.table === e.table && x.cle === e.cle)
      if (i !== -1 && apres[i].maj <= e.maj) {
        apres.splice(i, 1)
        ecrire(apres)
      } else if (i !== -1) {
        // Modifiée entre-temps : on la repousse en fin de file pour la renvoyer.
        const [rec] = apres.splice(i, 1)
        apres.push(rec)
        ecrire(apres)
        break
      }
      envoyees++
    }
  } finally {
    enCours = false
  }
  return { envoyees, restantes: enAttente() }
}

/** Vide tout, sans envoyer. Réservé à la déconnexion. */
export function purger(): void {
  ecrire([])
}

/** Clé de ligne pour le journal quotidien. */
export const cleJour = (day: string): string => day

/** Clé de ligne pour un ressenti de séance. */
export const cleSeance = (week: number, dayIndex: number, slot = 0): string =>
  `${week}/${dayIndex}/${slot}`
