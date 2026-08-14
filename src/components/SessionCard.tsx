/**
 * Carte de séance : le composant le plus vu de l'app.
 *
 * Le liseré vertical de 9 px, à ras du bord, porte l'identité du type de
 * séance. C'est le repère qui permet de lire sa semaine sans lire les titres.
 * Le tag reprend la couleur du type, le chevron annonce que la carte s'ouvre.
 */
import type { Session } from '../data/types'
import { formatDayLong, formatNumber } from '../lib/dates'
import { estimateDuration, formatDuration } from '../lib/paces'
import { Icon } from './Icon'

interface Props {
  session: Session
  day: string
  marathonPace: number
  /** Ressenti déjà enregistré. */
  feedback?: { pain: number; rpe: number } | null
  onClick?: () => void
}

export function SessionCard({ session: s, day, marathonPace, feedback, onClick }: Props) {
  const [lo, hi] = estimateDuration(s, marathonPace)
  const duration = lo === hi ? formatDuration(lo) : `${formatDuration(lo)} - ${formatDuration(hi)}`
  // Le volume, quand le plan en fixe un : il complète le tag sans le doubler.
  const volume = s.dist ? `${formatNumber(s.dist)} km` : s.dur ? formatDuration(s.dur[0]) : null

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
        opacity: feedback ? 0.55 : 1,
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
          {s.title}
        </h3>
        <div style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 500 }}>
          {formatDayLong(day)}
          {s.type !== 'repos' && ` · ${duration}`}
        </div>

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
          {volume && s.type !== 'repos' && (
            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--sur-ink-2)' }}>{volume}</span>
          )}
        </div>

        {s.adapted && (
          <div style={{ marginTop: 9 }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 600,
                padding: '3.5px 9px',
                borderRadius: 'var(--pill)',
                background: 'rgba(250,178,25,.18)',
                color: '#FFD166',
                border: '1px solid rgba(250,178,25,.26)',
              }}
            >
              {s.adapted}
            </span>
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
