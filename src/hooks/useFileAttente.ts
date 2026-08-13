/** Nombre de saisies pas encore confirmées par le serveur, mis à jour en direct. */
import { useSyncExternalStore } from 'react'
import { enAttente, souscrire } from '../lib/offlineQueue'

export function useFileAttente(): number {
  return useSyncExternalStore(souscrire, enAttente, () => 0)
}
