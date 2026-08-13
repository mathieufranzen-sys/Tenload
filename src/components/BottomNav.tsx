import { Icon } from './Icon'

export type Onglet = 'today' | 'plan' | 'track' | 'paces' | 'profile'

const ONGLETS: Array<{ key: Onglet; icon: 'sun' | 'clip' | 'chart' | 'gauge' | 'user'; label: string }> = [
  { key: 'today', icon: 'sun', label: "Aujourd'hui" },
  { key: 'plan', icon: 'clip', label: 'Programme' },
  { key: 'track', icon: 'chart', label: 'Suivi' },
  { key: 'paces', icon: 'gauge', label: 'Allures' },
  { key: 'profile', icon: 'user', label: 'Profil' },
]

export function BottomNav({ actif, onChange }: { actif: Onglet; onChange: (o: Onglet) => void }) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: 'flex',
        justifyContent: 'center',
        background: 'rgba(15,17,21,.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{ display: 'flex', width: '100%', maxWidth: 'var(--shell-max)' }}>
        {ONGLETS.map((o) => {
          const courant = o.key === actif
          return (
            <button
              key={o.key}
              onClick={() => onChange(o.key)}
              aria-current={courant ? 'page' : undefined}
              style={{
                flex: 1,
                padding: '9px 2px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                color: courant ? 'var(--ink)' : 'var(--ink-3)',
                fontSize: 10.5,
                fontWeight: 700,
              }}
            >
              <Icon name={o.icon} size={23} style={{ strokeWidth: 1.9 }} />
              <span>{o.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
