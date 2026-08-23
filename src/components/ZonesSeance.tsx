/**
 * Où part le temps de la séance, zone par zone : libellé, barre, part et durée.
 *
 * Les six zones sont ordonnées : leur rang se lit dans l'intensité de l'encre,
 * de la récupération presque effacée aux répétitions en blanc plein. Une
 * échelle plutôt qu'une palette — six teintes ne se classent pas de mémoire.
 */
import planJson from '../data/plan.json'
import type { Plan } from '../data/types'
import type { PartZone } from '../lib/repartition'
import { encreZone } from '../lib/seanceStyle'

const plan = planJson as unknown as Plan

const mmss = (s: number): string => {
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function ZonesSeance({ parts }: { parts: PartZone[] }) {
  if (parts.length < 2) return null

  return (
    <section style={{ marginTop: 22 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 44px 56px',
          gap: 10,
          fontSize: 11.5,
          fontWeight: 500,
          color: 'var(--sur-ink-3)',
          marginBottom: 10,
        }}
      >
        <span>Zone</span>
        <span style={{ textAlign: 'right' }}>Part</span>
        <span style={{ textAlign: 'right' }}>Durée</span>
      </div>

      {parts.map((p) => {
        const z = plan.zones[p.zone]
        return (
          <div
            key={p.zone}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 44px 56px',
              gap: 10,
              alignItems: 'center',
              padding: '9px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  letterSpacing: '-.2px',
                  whiteSpace: 'nowrap',
                  minWidth: 92,
                }}
              >
                {z.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 9,
                  borderRadius: 'var(--pill)',
                  background: 'rgba(255,255,255,.08)',
                  overflow: 'hidden',
                  minWidth: 24,
                }}
              >
                <div
                  style={{
                    width: `${Math.max(3, p.part * 100)}%`,
                    height: '100%',
                    borderRadius: 'var(--pill)',
                    background: encreZone(p.zone),
                  }}
                />
              </div>
            </div>
            <span
              style={{
                textAlign: 'right',
                fontSize: 13.5,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Math.round(p.part * 100)} %
            </span>
            <span
              style={{
                textAlign: 'right',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--sur-ink-2)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {mmss(p.secondes)}
            </span>
          </div>
        )
      })}
    </section>
  )
}
