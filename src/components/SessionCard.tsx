/**
 * Carte de séance : le composant le plus vu de l'app.
 *
 * Le liseré vertical de 9 px, à ras du bord, porte l'identité du type de
 * séance. C'est le repère qui permet de lire sa semaine sans lire les titres.
 * Le tag reprend la couleur du type, le chevron annonce que la carte s'ouvre.
 */
import type { Session } from '../data/types'
import { formatNumber } from '../lib/dates'
import { estimateDuration, formatDuration } from '../lib/paces'
import { Icon } from './Icon'

interface Props {
  session: Session
  marathonPace: number
  /** Ressenti déjà enregistré. */
  feedback?: { pain: number; rpe: number } | null
  onClick?: () => void
}

export function SessionCard({ session: s, marathonPace, feedback, onClick }: Props) {
  const [lo, hi] = estimateDuration(s, marathonPace)
  const duration = lo === hi ? formatDuration(lo) : `${formatDuration(lo)} - ${formatDuration(hi)}`
  // La distance seulement : le repli sur `s.dur` répétait la durée à côté
  // d'elle-même, « 40 min - 45 min · 40 min ». Une séance sans distance n'en
  // a pas, et la ligne s'arrête à la durée.
  const volume = s.dist ? `${formatNumber(s.dist)} km` : null

  return (
    <button
      onClick={onClick}
      className="glass"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        color: 'inherit',
        borderRadius: 20,
        padding: '16px 14px 16px 24px',
        marginBottom: 11,
        overflow: 'hidden',
        // Une séance sautée s'efface plus qu'une séance notée : elle reste
        // lisible dans la semaine, mais elle ne réclame plus rien.
        opacity: s.saute ? 0.38 : feedback ? 0.55 : 1,
        transition: 'transform var(--dur-fast), background var(--dur-fast)',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 9,
          background: `var(--g-${s.type})`,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            margin: '0 0 4px',
            fontSize: 18.5,
            fontWeight: 650,
            letterSpacing: '-.4px',
            lineHeight: 1.2,
          }}
        >
          <span style={s.saute ? { textDecoration: 'line-through' } : undefined}>{s.title}</span>
        </h3>
        {/* Les deux chiffres de la séance sur la même ligne, juste sous le
            titre. La date n'y est plus : ces cartes s'affichent toujours dans
            un contexte qui la porte déjà — le jour consulté sur Aujourd'hui,
            l'en-tête du jour sur Programme — et elle occupait la place des
            deux seuls chiffres qui décident de la séance. */}
        {s.type !== 'repos' && (
          <div style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 500 }}>
            {[duration, volume].filter(Boolean).join(' · ')}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px 4px 8px',
              borderRadius: 'var(--pill)',
              background: `color-mix(in srgb, var(--c-${s.type}) 16%, transparent)`,
              border: `1px solid color-mix(in srgb, var(--c-${s.type}) 34%, transparent)`,
              fontSize: 11.5,
              fontWeight: 650,
              letterSpacing: '.2px',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: `var(--c-${s.type})`,
                flex: 'none',
              }}
            />
            {s.cat}
          </span>
        </div>

        {(s.adapted || s.ecart) && (
          <div style={{ marginTop: 9, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {/* Bleu pour une décision de Mathieu, ambre pour le moteur
                d'adaptation : la couleur dit d'où vient le changement. */}
            {s.ecart && <Etiquette teinte="78,140,255" encre="#9DC1FF">{s.ecart}</Etiquette>}
            {s.adapted && <Etiquette teinte="250,178,25" encre="#FFD166">{s.adapted}</Etiquette>}
          </div>
        )}

        {feedback && (
          <div style={{ marginTop: 9, color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 500 }}>
            Douleur {formatNumber(feedback.pain)}/10 · Effort {feedback.rpe}/10
          </div>
        )}
      </div>

      {onClick && (
        <Icon
          name="chevronRight"
          size={19}
          style={{ color: 'var(--sur-ink-3)', flex: 'none', strokeWidth: 1.7 }}
        />
      )}
    </button>
  )
}

function Etiquette({
  teinte,
  encre,
  children,
}: {
  teinte: string
  encre: string
  children: string
}) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        padding: '3.5px 9px',
        borderRadius: 'var(--pill)',
        background: `rgba(${teinte},.18)`,
        color: encre,
        border: `1px solid rgba(${teinte},.26)`,
      }}
    >
      {children}
    </span>
  )
}
