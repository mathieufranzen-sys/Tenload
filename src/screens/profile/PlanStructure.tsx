import planJson from '../../data/plan.json'
import type { Plan } from '../../data/types'
import { addDays, formatDay } from '../../lib/dates'

const plan = planJson as unknown as Plan

export function PlanStructure() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 17px' }}>
      {plan.blocs.map((b, i) => {
        const semaines = plan.weeks.filter((w) => w.bloc === b.id)
        const slMin = Math.min(...semaines.map((w) => w.sl))
        const slMax = Math.max(...semaines.map((w) => w.sl))
        const derniere = semaines[semaines.length - 1]
        return (
          <div key={b.id} style={{ padding: '12px 0', borderBottom: i < plan.blocs.length - 1 ? '1px solid var(--border)' : undefined }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: '.5px',
                textTransform: 'uppercase',
                padding: '5px 11px',
                borderRadius: 'var(--pill)',
                background: `${b.color}22`,
                color: b.color,
                marginBottom: 6,
              }}
            >
              Bloc {b.id} · {b.name}
            </span>
            <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 4 }}>
              Semaines {b.weeks[0]} à {b.weeks[1]} · {formatDay(semaines[0].monday)} → {formatDay(addDays(derniere.monday, 6))} ·
              sortie longue {slMin} à {slMax} km
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.45 }}>{b.focus}</div>
          </div>
        )
      })}
    </div>
  )
}
