/**
 * Les quatre tuiles sous la carte de charge, en grille de deux.
 *
 * Refonte du 21 septembre 2026 : le grand chiffre en serif, l'unité et le
 * libellé en accent dessous. La quatrième tuile n'est pas un chiffre mais la
 * porte du calcul de l'indice, à l'endroit où l'œil vient de lire les trois
 * nombres qui le nourrissent.
 */
import type { ReactNode } from 'react'
import { formatNumber } from '../lib/dates'
import type { Insights } from '../lib/insights'
import { Icon } from './Icon'

export function InsightTiles({
  insights,
  indice,
  onCalcul,
}: {
  insights: Insights
  /** L'indice affiché, pour la tuile du calcul. Absent quand il est inconnu. */
  indice: number | null
  onCalcul: () => void
}) {
  const { seances, seancesTotal, km7, km7Jours, chargeVeille, chargeEcart } = insights
  const maxJour = Math.max(...km7Jours, 1)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Tuile>
        <Valeur nombre={formatNumber(km7)} unite="km" />
        <div style={{ display: 'flex', gap: 3, marginTop: 10, alignItems: 'flex-end', height: 16 }}>
          {km7Jours.map((km, i) => (
            <span
              key={i}
              title={`${formatNumber(km)} km`}
              style={{
                flex: 1,
                borderRadius: 2,
                // Un plancher : un jour sans course reste visible comme un
                // jour, sinon on croit à un trou dans la donnée.
                height: `${Math.max(12, (km / maxJour) * 100)}%`,
                background: i === km7Jours.length - 1 ? 'var(--pale)' : 'var(--accent-2)',
                opacity: i === km7Jours.length - 1 ? 1 : 0.55,
              }}
            />
          ))}
        </div>
        <Libelle>7 derniers jours</Libelle>
      </Tuile>

      <Tuile>
        <Valeur nombre={`${seancesTotal.realise}`} unite={`/${seancesTotal.prevu}`} />
        <Libelle>séances de la semaine</Libelle>
        <div style={{ fontSize: 12.5, color: 'var(--sur-ink-3)', marginTop: 4, lineHeight: 1.4 }}>
          course {seances.course.realise}/{seances.course.prevu} · vélo {seances.velo.realise}/
          {seances.velo.prevu} · renfo {seances.renfo.realise}/{seances.renfo.prevu}
        </div>
      </Tuile>

      <Tuile>
        <Valeur
          nombre={
            chargeEcart == null
              ? '—'
              : `${chargeEcart > 0 ? '+' : chargeEcart < 0 ? '−' : ''}${Math.abs(chargeEcart)}`
          }
        />
        <Libelle>
          {chargeVeille != null ? `indice, ${chargeVeille} hier` : 'indice, hier inconnu'}
        </Libelle>
      </Tuile>

      <button
        type="button"
        onClick={onCalcul}
        className="carte"
        style={{
          padding: '16px 16px',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 12,
          borderColor: 'var(--border-2)',
          background: 'var(--surface-2)',
        }}
      >
        <Icon name="clip" size={20} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 15, lineHeight: 1.3, color: 'var(--ink)' }}>
          {indice == null ? 'le détail du calcul' : `d'où viennent ces ${indice} points`}
        </span>
      </button>
    </div>
  )
}

function Tuile({ children }: { children: ReactNode }) {
  return (
    <div className="carte" style={{ padding: '16px 16px 15px', minWidth: 0 }}>
      {children}
    </div>
  )
}

function Valeur({ nombre, unite }: { nombre: string; unite?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span className="chiffre" style={{ fontSize: 40, lineHeight: 1 }}>
        {nombre}
      </span>
      {unite && <span style={{ fontSize: 15, color: 'var(--accent)' }}>{unite}</span>}
    </div>
  )
}

function Libelle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13.5, color: 'var(--accent)', marginTop: 8 }}>{children}</div>
}
