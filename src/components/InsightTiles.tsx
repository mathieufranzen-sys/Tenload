/**
 * Les trois indicateurs de la semaine, sur une seule ligne, dans la carte de
 * charge depuis le 22 septembre 2026 : trois cartes de plus sous la jauge
 * faisaient une rangée de blocs gris, alors qu'elles lisent la même chose.
 *
 * La tuile « d'où viennent ces points » est partie le 22 septembre 2026 : la
 * carte de charge entière ouvre désormais le détail du calcul, un bouton de
 * plus disait la même chose en plus petit.
 */
import type { ReactNode } from 'react'
import { formatNumber } from '../lib/dates'
import type { Insights } from '../lib/insights'

export function InsightTiles({ insights }: { insights: Insights }) {
  const { seances, seancesTotal, km7, km7Jours, chargeVeille, chargeEcart } = insights
  const maxJour = Math.max(...km7Jours, 1)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid var(--border)',
      }}
    >
      <Tuile premiere>
        <Valeur nombre={formatNumber(km7)} unite="km" />
        <div style={{ display: 'flex', gap: 2, marginTop: 8, alignItems: 'flex-end', height: 12 }}>
          {km7Jours.map((km, i) => (
            <span
              key={i}
              title={`${formatNumber(km)} km`}
              style={{
                flex: 1,
                borderRadius: 2,
                // Un plancher : un jour sans course reste visible comme un
                // jour, sinon on croit à un trou dans la donnée.
                height: `${Math.max(14, (km / maxJour) * 100)}%`,
                background: i === km7Jours.length - 1 ? 'var(--ink)' : 'var(--border-2)',
              }}
            />
          ))}
        </div>
        <Libelle>7 derniers jours</Libelle>
      </Tuile>

      <Tuile>
        <Valeur nombre={`${seancesTotal.realise}`} unite={`/${seancesTotal.prevu}`} />
        <Libelle>Séances de la semaine</Libelle>
        <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.35 }}>
          {seances.course.realise}/{seances.course.prevu} course · {seances.velo.realise}/{seances.velo.prevu} vélo ·{' '}
          {seances.renfo.realise}/{seances.renfo.prevu} renfo
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
        <Libelle>{chargeVeille != null ? `Indice, ${chargeVeille} hier` : 'Indice, hier inconnu'}</Libelle>
      </Tuile>
    </div>
  )
}

/** Une colonne, séparée de la précédente par un filet vertical, comme les chiffres d'une séance. */
function Tuile({ children, premiere }: { children: ReactNode; premiere?: boolean }) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: premiere ? '0 10px 0 0' : '0 10px',
        borderLeft: premiere ? undefined : '1px solid var(--border)',
      }}
    >
      {children}
    </div>
  )
}

function Valeur({ nombre, unite }: { nombre: string; unite?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
      <span className="chiffre" style={{ fontSize: 'var(--fs-c-m)', lineHeight: 1 }}>
        {nombre}
      </span>
      {unite && <span style={{ fontSize: 'var(--fs-detail)', color: 'var(--accent)' }}>{unite}</span>}
    </div>
  )
}

function Libelle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 'var(--fs-detail)', color: 'var(--accent)', marginTop: 7, lineHeight: 1.3 }}>{children}</div>
}
