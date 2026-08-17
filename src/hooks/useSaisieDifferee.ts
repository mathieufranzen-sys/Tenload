/**
 * Une valeur qui s'affiche tout de suite et ne s'écrit qu'un peu plus tard.
 *
 * Le carnet du jour écrivait à chaque mouvement du curseur. Chaque écriture
 * recalcule l'indice, donc la bande, donc le mot du coach et parfois le bloc
 * « je ne sais pas » — autant de textes de hauteurs différentes EN AMONT du
 * curseur dans la page. Le contenu sautait sous le pouce pendant le geste, et
 * on relâchait sur une autre valeur que celle visée.
 *
 * Le geste reste fluide : c'est l'état local qui suit le doigt. Seule
 * l'écriture attend le silence.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

/** Silence à observer après le dernier mouvement avant d'écrire. */
const DELAI = 700

export function useSaisieDifferee(
  /** La valeur telle qu'elle est en base. Fait foi tant que rien n'attend. */
  distante: number | null,
  ecrire: (v: number) => void,
  delai = DELAI,
): [number | null, (v: number) => void] {
  const [locale, setLocale] = useState(distante)
  /** L'écriture qu'il reste à faire, null quand tout est à jour. */
  const enAttente = useRef<(() => void) | null>(null)
  const minuteur = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Tant qu'une saisie attend, la valeur distante est en retard sur ce que
  // Mathieu vient de régler : l'appliquer ferait reculer le curseur sous son
  // doigt à chaque rafraîchissement du provider.
  useEffect(() => {
    if (!enAttente.current) setLocale(distante)
  }, [distante])

  // Quitter l'écran ne doit pas jeter la dernière saisie. Perdre une douleur
  // notée coûte bien plus cher qu'un saut de mise en page.
  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current)
      enAttente.current?.()
      enAttente.current = null
    },
    [],
  )

  const changer = useCallback(
    (v: number) => {
      setLocale(v)
      enAttente.current = () => ecrire(v)
      if (minuteur.current) clearTimeout(minuteur.current)
      minuteur.current = setTimeout(() => {
        enAttente.current = null
        ecrire(v)
      }, delai)
    },
    [ecrire, delai],
  )

  return [locale, changer]
}
