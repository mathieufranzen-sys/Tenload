/**
 * Le mot du coach, partout sous la même forme.
 *
 * Il apparaissait à trois endroits — l'écran Aujourd'hui, la séance du jour,
 * le détail de séance — avec trois habillages différents : une carte teintée
 * par le ton du message, une pastille ronde suivie d'une ligne, un bandeau
 * orange. Trois formes pour une seule voix, ce qui laissait croire à trois
 * sources. C'est le bandeau orange du détail de séance qui l'emporte.
 *
 * Le ton du message (`bravo`, `vigilance`) ne colore plus la carte : ce qui
 * alerte a son propre composant, `AlertBox`, juste au-dessus sur le même
 * écran. Deux objets qui changent de couleur pour dire la même chose se
 * concurrencent au lieu de se renforcer.
 */
import type { ReactNode } from 'react'

export function CarteCoach({
  texte,
  /** Ce que la séance travaille, quand elle a un objet physiologique clair. */
  but,
  /** Version resserrée, pour la carte de séance du jour. */
  compact = false,
  style,
}: {
  texte: ReactNode
  but?: string | null
  compact?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: compact ? 16 : 22,
        padding: compact ? '13px 14px 14px' : '17px 18px 18px',
        overflow: 'hidden',
        background:
          'linear-gradient(145deg, rgba(217,119,87,.20), rgba(217,119,87,.05) 58%, rgba(255,255,255,.04))',
        border: '1px solid rgba(217,119,87,.28)',
        ...style,
      }}
    >
      <div
        style={{
          fontSize: compact ? 9.5 : 10,
          fontWeight: 700,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: '#F0A683',
          marginBottom: compact ? 7 : 9,
        }}
      >
        Coach
      </div>
      <p
        style={{
          margin: 0,
          color: '#E4E7EB',
          fontSize: compact ? 13 : 15.5,
          lineHeight: 1.55,
        }}
      >
        {texte}
      </p>
      {but && (
        <p
          style={{
            margin: compact ? '10px 0 0' : '13px 0 0',
            paddingTop: compact ? 10 : 13,
            borderTop: '1px solid rgba(217,119,87,.22)',
            color: 'var(--sur-ink-2)',
            fontSize: compact ? 12 : 14,
            lineHeight: 1.5,
          }}
        >
          {but}
        </p>
      )}
    </div>
  )
}
