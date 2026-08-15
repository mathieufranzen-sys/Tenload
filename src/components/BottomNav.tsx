import { Icon } from './Icon'

/** `profile` reste un onglet valable : on peut toujours s'y trouver, il n'a
 *  simplement plus d'entrée dans la barre — on y arrive par ProfileButton. */
export type Onglet = 'today' | 'plan' | 'track' | 'paces' | 'profile'

const ONGLETS: Array<{ key: Onglet; icon: 'sun' | 'clip' | 'chart' | 'gauge'; label: string }> = [
  { key: 'today', icon: 'sun', label: "Aujourd'hui" },
  { key: 'plan', icon: 'clip', label: 'Programme' },
  { key: 'track', icon: 'chart', label: 'Suivi' },
  { key: 'paces', icon: 'gauge', label: 'Allures' },
]

export function BottomNav({ actif, onChange }: { actif: Onglet; onChange: (o: Onglet) => void }) {
  return (
    <nav
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        // La sécurité du home indicator vient déjà de env() : un gros supplément
        // par-dessus faisait flotter la barre trop haut au-dessus du bord.
        bottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
        zIndex: 40,
        width: 'calc(100% - 28px)',
        maxWidth: 400,
      }}
    >
      <div
        className="glass"
        style={{
          display: 'flex',
          borderRadius: 26,
          padding: '4px',
          backdropFilter: 'blur(34px) saturate(1.7)',
          WebkitBackdropFilter: 'blur(34px) saturate(1.7)',
        }}
      >
        {ONGLETS.map((o) => {
          const courant = o.key === actif
          return (
            <button
              key={o.key}
              onClick={() => onChange(o.key)}
              aria-current={courant ? 'page' : undefined}
              style={{
                flex: 1,
                padding: '9px 2px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                borderRadius: 21,
                background: courant ? 'rgba(255,255,255,.14)' : 'transparent',
                color: courant ? 'var(--ink)' : 'var(--sur-ink-3)',
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              <Icon name={o.icon} size={21} style={{ strokeWidth: 1.9 }} />
              <span>{o.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
