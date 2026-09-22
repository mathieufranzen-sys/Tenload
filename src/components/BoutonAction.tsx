/**
 * Le bouton d'action de l'app, un seul dessin partout.
 *
 * Arbitré par Mathieu le 22 septembre 2026 : « Ouvrir le carnet » est la
 * référence. Pilule néon (Button/Accent de Trailblazer), libellé à gauche,
 * pastille blanche ronde à droite avec l'icône de ce qui va se passer. Avant,
 * « Ajouter » était une petite puce sans flèche et « Enregistrer » une
 * pilule sans pastille : trois formes pour le même geste.
 */
import type { CSSProperties, ReactNode } from 'react'
import { Icon } from './Icon'

export function BoutonAction({
  children,
  onClick,
  icone = 'arrowUpRight',
  disabled,
  type = 'button',
  style,
}: {
  children: ReactNode
  onClick?: () => void
  /** Ce qui va se passer : ouvrir (flèche en biais), ajouter, valider, avancer. */
  icone?: 'arrowUpRight' | 'arrowRight' | 'plus' | 'check'
  disabled?: boolean
  type?: 'button' | 'submit'
  style?: CSSProperties
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="bouton-pale"
      style={{
        ...(disabled ? { background: 'var(--surface-3)', color: 'var(--ink-3)', cursor: 'default' } : null),
        ...style,
      }}
    >
      {children}
      <span className="pastille" style={disabled ? { color: 'var(--ink-3)' } : undefined}>
        <Icon name={icone} size={18} />
      </span>
    </button>
  )
}
