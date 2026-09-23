/**
 * La marque d'une séance : son icône de discipline, et l'échelle d'intensité
 * qui sépare les séances que l'icône confond.
 *
 * Tout est en encre neutre. Voir `seanceStyle.ts` pour le pourquoi.
 */
import type { SessionType } from '../data/types'
import { styleSeance } from '../lib/seanceStyle'
import { Icon } from './Icon'

/**
 * Quatre barres montantes, celles de l'intensité remplies. Une échelle plutôt
 * qu'un chiffre : elle se compare d'une carte à l'autre sans être lue.
 */
export function EchelleIntensite({
  niveau,
  hauteur = 13,
}: {
  niveau: number
  hauteur?: number
}) {
  if (niveau <= 0) return null
  return (
    <span
      aria-hidden
      style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: hauteur }}
    >
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          style={{
            width: 3,
            borderRadius: 1.5,
            // La barre éteinte reste visible : sans elle, l'échelle n'a plus
            // de longueur totale et « 2 sur 4 » se lirait comme « 2 ».
            height: `${(0.34 + (n - 1) * 0.22) * hauteur}px`,
            background: n <= niveau ? 'var(--ink)' : 'var(--sur-ink-3)',
            opacity: n <= niveau ? 1 : 0.3,
          }}
        />
      ))}
    </span>
  )
}

/**
 * Le carré d'icône qui remplace le liseré de couleur en tête de carte.
 * `plein` le pose sur un fond glass ; sinon il flotte sur le fond déjà teinté
 * de la feuille de séance.
 */
export function MarqueSeance({
  type,
  taille = 44,
  plein = true,
}: {
  type: SessionType
  taille?: number
  plein?: boolean
}) {
  const st = styleSeance(type)
  return (
    <span
      role="img"
      aria-label={st.famille}
      style={{
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
        width: taille,
        height: taille,
        borderRadius: '50%',
        background: plein ? 'var(--surface-3)' : 'transparent',
        border: '1px solid transparent',
        color: 'var(--accent)',
      }}
    >
      <Icon name={st.icone} size={Math.round(taille * 0.48)} />
    </span>
  )
}
