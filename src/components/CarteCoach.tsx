/**
 * Le mot du coach, partout sous la même forme.
 *
 * Refonte du 21 septembre 2026 : la carte « braise », seul fond coloré de
 * l'app avec la carte de tête, et le texte en serif italique. C'est une
 * parole, elle doit se lire comme une voix et pas comme une donnée de plus :
 * l'italique d'une serif porte ça mieux qu'un guillemet en filigrane.
 */
import type { CSSProperties, ReactNode } from 'react'

/** Le préfixe vit dans les données du plan ; ici il devient un intertitre. */
const PREFIXE_BUT = /^À quoi ça sert\s*:\s*/i

export function CarteCoach({
  texte,
  /** Ce que la séance travaille, quand elle a un objet physiologique clair. */
  but,
  /** Version resserrée, pour la carte de séance du jour. */
  compact = false,
  titre = 'le mot du coach',
  style,
}: {
  texte: ReactNode
  but?: string | null
  compact?: boolean
  titre?: string
  style?: CSSProperties
}) {
  const butNet = typeof but === 'string' ? but.replace(PREFIXE_BUT, '') : but

  return (
    <div
      className="carte-braise"
      style={{ padding: compact ? '16px 18px' : '20px 20px 22px', ...style }}
    >
      <p className="etiquette" style={{ color: 'var(--pale)', opacity: 0.85 }}>
        {titre}
      </p>
      <p
        className="display-it"
        style={{
          margin: compact ? '8px 0 0' : '12px 0 0',
          color: 'var(--ink)',
          fontSize: compact ? 18 : 23,
          lineHeight: 1.32,
        }}
      >
        {texte}
      </p>
      {butNet && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid rgba(255,200,160,.16)',
          }}
        >
          <p className="etiquette" style={{ marginBottom: 6 }}>
            à quoi ça sert
          </p>
          <p style={{ margin: 0, color: 'var(--sur-ink-2)', fontSize: 14.5, lineHeight: 1.5 }}>
            {butNet}
          </p>
        </div>
      )}
    </div>
  )
}
