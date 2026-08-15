/**
 * Jauge de l'indice de charge du tendon.
 *
 * L'anneau porte la valeur, la bande porte la consigne, la barre du bas
 * décompose les contributions. Cette décomposition n'est pas décorative : elle
 * évite l'effet boîte noire, et c'est elle qui rend l'indice acceptable un jour
 * où il interdit une séance.
 */
import { bandOf, type IndexBreakdown } from '../lib/tendonIndex'

interface Props {
  breakdown: IndexBreakdown
  /** Appelé au clic sur « voir le détail ». */
  onDetail?: () => void
}

const R = 52
const C = 2 * Math.PI * R

export function TendonGauge({ breakdown: b, onDetail }: Props) {
  const band = bandOf(b.idx)
  const parts = [
    { label: 'Douleur déclarée', value: b.pain, color: 'var(--critical)' },
    { label: 'Charge récente', value: b.ratio + b.freshness, color: 'var(--series-1)' },
    { label: 'Tendance et monotonie', value: b.trend + b.monotony, color: 'var(--warning)' },
    { label: 'Gestes protecteurs', value: -b.credits, color: 'var(--series-3)' },
  ].filter((p) => p.value !== 0)
  const total = parts.reduce((a, p) => a + Math.abs(p.value), 0) || 1

  return (
    <section
      style={{
        background: `linear-gradient(160deg, ${band.color}12, var(--surface) 60%)`,
        border: `1px solid ${band.color}44`,
        borderRadius: 'var(--radius)',
        padding: '16px 17px',
      }}
    >
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 'none', width: 124, height: 124 }}>
          <svg viewBox="0 0 124 124" style={{ width: 124, height: 124, transform: 'rotate(-90deg)' }}>
            <circle cx="62" cy="62" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="11" />
            <circle
              cx="62"
              cy="62"
              r={R}
              fill="none"
              stroke={band.color}
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - b.idx / 100)}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1 }}>
                {b.idx}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--ink-2)',
                  letterSpacing: '.4px',
                }}
              >
                SUR 100
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: band.color,
            }}
          >
            Charge du tendon · {band.name}
          </div>
          <h2
            style={{
              fontSize: 19,
              fontWeight: 800,
              letterSpacing: '-.45px',
              margin: '3px 0 5px',
              lineHeight: 1.2,
            }}
          >
            {band.headline}
          </h2>
          <p style={{ color: '#C8CCD2', fontSize: 13.5, lineHeight: 1.45, margin: 0 }}>
            {band.detail}
          </p>
        </div>
      </div>

      {b.stale && !b.painInconnue && (
        <p style={{ color: 'var(--warning)', fontSize: 12.5, fontWeight: 600, margin: '12px 0 0' }}>
          Aucune douleur saisie depuis 24 h : l'indice tourne sur une estimation.
        </p>
      )}
      {b.painInconnue && (
        <p style={{ color: 'var(--warning)', fontSize: 12.5, fontWeight: 600, margin: '12px 0 0' }}>
          Aucune douleur saisie depuis {b.joursSansDouleur ?? 'plus de 60'} jours : l'indice ne mesure plus que la
          charge mécanique.
        </p>
      )}
      {b.confidence < 1 && (
        <p style={{ color: 'var(--ink-3)', fontSize: 12.5, fontWeight: 600, margin: '10px 0 0' }}>
          Historique de charge encore court : la part mécanique de l'indice est plafonnée.
        </p>
      )}

      <div
        style={{
          display: 'flex',
          height: 7,
          borderRadius: 'var(--pill)',
          overflow: 'hidden',
          marginTop: 15,
          gap: 2,
          background: 'var(--surface-3)',
        }}
      >
        {parts.map((p) => (
          <div
            key={p.label}
            style={{ width: `${(Math.abs(p.value) / total) * 100}%`, background: p.color }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 9 }}>
        {parts.map((p) => (
          <span
            key={p.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--ink-2)',
            }}
          >
            <b style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flex: 'none' }} />
            {p.label} {p.value > 0 ? '+' : ''}
            {p.value}
          </span>
        ))}
      </div>

      {onDetail && (
        <button
          onClick={onDetail}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            color: 'var(--ink-2)',
            fontSize: 13.5,
            fontWeight: 600,
            padding: '11px 0 2px',
          }}
        >
          Voir l'historique et le détail du calcul
        </button>
      )}
    </section>
  )
}
