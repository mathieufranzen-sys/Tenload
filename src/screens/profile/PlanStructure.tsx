import planJson from '../../data/plan.json'
import type { Plan } from '../../data/types'
import { addDays, formatDay } from '../../lib/dates'

const plan = planJson as unknown as Plan

export function PlanStructure() {
  return (
    <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px 17px' }}>
      {plan.blocs.map((b, i) => {
        const semaines = plan.weeks.filter((w) => w.bloc === b.id)
        // Les semaines de dossard portent une sortie longue à zéro : c'est la
        // course qui la remplace. Les compter afficherait « 0 à 32 km ».
        const longues = semaines.map((w) => w.sl).filter((km) => km > 0)
        const slMin = Math.min(...longues)
        const slMax = Math.max(...longues)
        const derniere = semaines[semaines.length - 1]
        return (
          <div key={b.id} style={{ padding: '12px 0', borderBottom: i < plan.blocs.length - 1 ? '1px solid var(--border)' : undefined }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: 13,
                fontWeight: 600,
                padding: '5px 11px',
                borderRadius: 'var(--pill)',
                background: 'rgba(62,122,44,.14)',
                color: 'var(--accent)',
                marginBottom: 6,
              }}
            >
              bloc {b.id} · {b.name.toLowerCase()}
            </span>
            <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 4 }}>
              Semaines {b.weeks[0]} à {b.weeks[1]} · {formatDay(semaines[0].monday)} → {formatDay(addDays(derniere.monday, 6))} ·
              sortie longue {slMin} à {slMax} km
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.5 }}>{b.focus}</div>
          </div>
        )
      })}
    </div>
  )
}
