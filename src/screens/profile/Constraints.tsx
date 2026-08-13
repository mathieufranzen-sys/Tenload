import planJson from '../../data/plan.json'
import type { Plan } from '../../data/types'
import { Icon } from '../../components/Icon'

const plan = planJson as unknown as Plan

/** Les règles non négociables du plan — vérifiées par reference/check_plan.py. */
export function Constraints() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 17px' }}>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.5, margin: '0 0 4px' }}>
        Inscrites dans le plan pour protéger le tendon. Aucune adaptation ne peut les casser.
      </p>
      {plan.meta.constraints.map((c, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 10,
            padding: '13px 0',
            borderBottom: i < plan.meta.constraints.length - 1 ? '1px solid var(--border)' : undefined,
            fontSize: 14.5,
            lineHeight: 1.45,
          }}
        >
          <span style={{ color: 'var(--good)', flex: 'none', marginTop: 2 }}>
            <Icon name="check" size={16} />
          </span>
          <span>{c}</span>
        </div>
      ))}
    </div>
  )
}
