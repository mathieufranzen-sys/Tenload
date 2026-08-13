import type { AdaptResult } from '../lib/adapt'
import { Icon } from './Icon'

const NIVEAU = [
  { bg: 'rgba(12,163,12,.09)', border: 'rgba(12,163,12,.32)', ink: '#5BE05B', titre: 'Plan inchangé' },
  { bg: 'rgba(250,178,25,.09)', border: 'rgba(250,178,25,.32)', ink: '#FFD166', titre: 'Plan adapté — vigilance' },
  { bg: 'rgba(236,131,90,.1)', border: 'rgba(236,131,90,.35)', ink: '#FFA579', titre: 'Plan adapté — recul' },
  { bg: 'rgba(208,59,59,.12)', border: 'rgba(208,59,59,.4)', ink: '#FF8A8A', titre: 'Plan suspendu — alerte' },
] as const

/** Bandeau des règles actives du moteur d'adaptation (bande du jour, allures, feu vert). */
export function AlertBox({ adapt }: { adapt: AdaptResult }) {
  if (!adapt.rules.length) return null
  const n = NIVEAU[adapt.level]

  return (
    <div
      style={{
        background: n.bg,
        border: `1px solid ${n.border}`,
        borderRadius: 'var(--radius)',
        padding: '15px 16px',
        marginBottom: 13,
      }}
    >
      <h4
        style={{
          margin: '0 0 6px',
          fontSize: 15.5,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: n.ink,
        }}
      >
        <Icon name={adapt.level >= 2 ? 'alert' : 'up'} size={18} />
        {n.titre}
      </h4>
      {adapt.rules.map((r) => (
        <p key={r.id} style={{ margin: '0 0 8px', fontSize: 14.5, lineHeight: 1.5, color: '#D6D9DE' }}>
          <b style={{ color: 'inherit' }}>{r.title}.</b>
          <br />
          {r.action}
        </p>
      ))}
      <p style={{ color: 'var(--ink-2)', fontSize: 13, margin: '10px 0 0' }}>
        Les séances concernées portent un repère orange dans le programme.
      </p>
    </div>
  )
}
