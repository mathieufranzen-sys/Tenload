/**
 * Les trois tuiles de haut d'écran, en verre dépoli sur le dégradé.
 */
import type { CSSProperties, ReactNode } from 'react'
import { formatNumber } from '../lib/dates'
import type { Insights } from '../lib/insights'

export function InsightTiles({ insights }: { insights: Insights }) {
  const { seances, seancesTotal, km7, km7Jours, chargeVeille, chargeEcart } = insights
  const maxJour = Math.max(...km7Jours, 1)

  return (
    <div style={{ display: 'flex', gap: 9 }}>
      <Tile label="Séances">
        <Valeur nombre={`${seancesTotal.realise}`} suffixe={`/${seancesTotal.prevu}`} />
        <div style={sousTexte}>
          <b style={fort}>
            {seances.course.realise}/{seances.course.prevu}
          </b>{' '}
          course ·{' '}
          <b style={fort}>
            {seances.velo.realise}/{seances.velo.prevu}
          </b>{' '}
          vélo ·{' '}
          <b style={fort}>
            {seances.renfo.realise}/{seances.renfo.prevu}
          </b>{' '}
          renfo
        </div>
      </Tile>

      <Tile label="Km · 7 j">
        <Valeur nombre={formatNumber(km7)} suffixe=" km" />
        <div style={{ display: 'flex', gap: 2.5, marginTop: 7, alignItems: 'flex-end', height: 15 }}>
          {km7Jours.map((km, i) => (
            <span
              key={i}
              title={`${formatNumber(km)} km`}
              style={{
                flex: 1,
                borderRadius: 1.5,
                // 2 px minimum : un jour sans course reste visible comme un jour,
                // sinon la barre disparaît et on croit à un trou dans la donnée.
                height: `${Math.max(12, (km / maxJour) * 100)}%`,
                background: i === km7Jours.length - 1 ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.34)',
              }}
            />
          ))}
        </div>
      </Tile>

      <Tile label="Hier">
        <Valeur nombre={chargeVeille != null ? `${chargeVeille}` : '—'} />
        <div style={sousTexte}>
          charge tendon
          {chargeEcart != null && (
            <>
              <br />
              <b style={fort}>
                {chargeEcart > 0 ? '+' : chargeEcart < 0 ? '−' : ''}
                {Math.abs(chargeEcart)}
              </b>{' '}
              vs avant-hier
            </>
          )}
        </div>
      </Tile>
    </div>
  )
}

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="glass" style={{ flex: 1, borderRadius: 17, padding: '11px 11px 10px', minWidth: 0 }}>
      <div
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '.7px',
          textTransform: 'uppercase',
          color: 'var(--sur-ink-2)',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function Valeur({ nombre, suffixe }: { nombre: string; suffixe?: string }) {
  return (
    <div
      style={{
        fontSize: 19,
        fontWeight: 650,
        letterSpacing: '-.5px',
        marginTop: 5,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {nombre}
      {suffixe && (
        <small style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--sur-ink-2)', letterSpacing: 0 }}>
          {suffixe}
        </small>
      )}
    </div>
  )
}

const sousTexte: CSSProperties = {
  fontSize: 9,
  fontWeight: 500,
  color: 'var(--sur-ink-3)',
  marginTop: 5,
  lineHeight: 1.35,
}

const fort: CSSProperties = { color: 'rgba(255,255,255,.85)', fontWeight: 700 }
