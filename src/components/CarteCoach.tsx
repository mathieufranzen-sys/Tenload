/**
 * Le mot du coach, partout sous la même forme.
 *
 * Il apparaissait à trois endroits — l'écran Aujourd'hui, la séance du jour,
 * le détail de séance — avec trois habillages différents. Trois formes pour
 * une seule voix, ce qui laissait croire à trois sources.
 *
 * La carte orange a servi jusqu'ici. Elle tombe avec le reste des couleurs de
 * séance : une carte teintée sur un écran où tout le reste est neutre se lit
 * comme une alerte, alors que c'est un encouragement. Ce qui alerte a son
 * propre composant, `AlertBox`.
 *
 * À la place, le traitement d'une citation, parce que c'est ce que c'est :
 * quelqu'un qui parle. Un grand guillemet en filigrane, un filet vertical, le
 * texte en encre pleine et un peu plus grand que le corps courant. Rien à
 * colorer — la voix se distingue par sa mise en page, pas par une teinte.
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
  style,
}: {
  texte: ReactNode
  but?: string | null
  compact?: boolean
  style?: CSSProperties
}) {
  const butNet = typeof but === 'string' ? but.replace(PREFIXE_BUT, '') : but

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: compact ? 16 : 20,
        padding: compact ? '13px 15px 14px' : '18px 18px 19px',
        overflow: 'hidden',
        background: 'rgba(255,255,255,.045)',
        border: '1px solid rgba(255,255,255,.09)',
        ...style,
      }}
    >
      {/* Le guillemet fermant, en filigrane et à cheval sur le bord haut :
          c'est lui qui annonce une parole avant qu'on ait lu le libellé. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: compact ? -22 : -30,
          right: compact ? 10 : 14,
          fontSize: compact ? 88 : 118,
          lineHeight: 1,
          fontWeight: 800,
          color: 'var(--ink)',
          opacity: 0.06,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        ”
      </span>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginBottom: compact ? 8 : 11,
        }}
      >
        {/* Trois traits décroissants : une onde de voix, assez petite pour
            n'être qu'une ponctuation devant le mot. */}
        <span
          aria-hidden
          style={{ display: 'inline-flex', alignItems: 'center', gap: 2.5, height: 11 }}
        >
          {[9, 6.5, 4].map((h, i) => (
            <span
              key={i}
              style={{
                width: 2,
                height: h,
                borderRadius: 1,
                background: 'var(--ink)',
                opacity: 0.42 - i * 0.08,
              }}
            />
          ))}
        </span>
        <span
          style={{
            fontSize: compact ? 10.5 : 11,
            fontWeight: 700,
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            color: 'var(--ink-2)',
          }}
        >
          Coach
        </span>
      </div>

      <div style={{ display: 'flex', gap: compact ? 11 : 13, alignItems: 'stretch' }}>
        <span
          aria-hidden
          style={{
            width: 2,
            flex: 'none',
            borderRadius: 1,
            background: 'rgba(255,255,255,.16)',
          }}
        />
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              color: 'var(--ink)',
              fontSize: compact ? 13.5 : 16,
              lineHeight: 1.5,
              letterSpacing: '-.15px',
            }}
          >
            {texte}
          </p>
          {butNet && (
            <div style={{ marginTop: compact ? 11 : 15 }}>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '1.1px',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                  marginBottom: 5,
                }}
              >
                À quoi ça sert
              </div>
              <p
                style={{
                  margin: 0,
                  color: 'var(--ink-2)',
                  fontSize: compact ? 12 : 14,
                  lineHeight: 1.5,
                }}
              >
                {butNet}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
