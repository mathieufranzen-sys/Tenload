/**
 * Carte de séance : le composant le plus vu de l'app.
 *
 * Le liseré vertical de 9 px porte l'identité du type de séance. C'est le repère
 * emprunté à Runna, et il fonctionne : on lit sa semaine sans lire les titres.
 */
import type { Session } from '../data/types'
import { formatDayLong, formatNumber } from '../lib/dates'
import { estimateDuration, formatDuration } from '../lib/paces'

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
  const subtitle = s.dist
    ? `${s.cat} · ${formatNumber(s.dist)} km`
    : s.dur
      ? `${s.cat} · ${formatDuration(s.dur[0])}`
      : s.cat

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px 17px 16px 26px',
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
      <h3
        style={{
          margin: '0 0 3px',
          fontSize: 'var(--fs-card)',
          fontWeight: 800,
          letterSpacing: '-.45px',
          lineHeight: 1.2,
          paddingRight: feedback ? 32 : 0,
        }}
      >
        {s.title}
      </h3>
      <div style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-meta)', fontWeight: 500 }}>
        {formatDayLong(day)}
        {s.type !== 'repos' && ` · ${duration}`}
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 500, marginTop: 9 }}>{subtitle}</div>

      {s.adapted && (
        <div style={{ marginTop: 9 }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: 11.5,
              fontWeight: 700,
              padding: '3.5px 9px',
              borderRadius: 'var(--pill)',
              background: 'rgba(250,178,25,.16)',
              color: '#FFD166',
            }}
          >
            {s.adapted}
          </span>
        </div>
      )}

      {feedback && (
        <div style={{ marginTop: 9, color: 'var(--ink-2)', fontSize: 13.5, fontWeight: 600 }}>
          Douleur {formatNumber(feedback.pain)}/10 · Effort {feedback.rpe}/10
        </div>
      )}
    </button>
  )
}
