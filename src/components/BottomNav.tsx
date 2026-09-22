import { Icon } from './Icon'

/** `profile` reste un onglet valable : on peut toujours s'y trouver, il n'a
 *  simplement plus d'entrée dans la barre — on y arrive par ProfileButton. */
export type Onglet = 'today' | 'plan' | 'track' | 'paces' | 'profile'

/**
 * La clé `paces` est gardée pour ne toucher à aucun appelant : l'écran est
 * devenu « Objectif » le 21 septembre 2026, parce qu'il porte désormais les
 * dossards, et que les allures n'en sont qu'une conséquence.
 */
const ONGLETS: Array<{ key: Onglet; icon: 'capsule' | 'calendar' | 'chart' | 'target'; label: string }> = [
  { key: 'today', icon: 'capsule', label: "Aujourd'hui" },
  { key: 'plan', icon: 'calendar', label: 'Programme' },
  { key: 'track', icon: 'chart', label: 'Suivi' },
  { key: 'paces', icon: 'target', label: 'Objectif' },
]

export function BottomNav({ actif, onChange }: { actif: Onglet; onChange: (o: Onglet) => void }) {
  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        // Barre posée sur le bas de l'écran, comme dans la maquette, plutôt
        // que flottante : elle prend la zone sûre à son compte et le contenu
        // ne passe plus dessous en transparence.
        background: 'color-mix(in srgb, var(--bg) 90%, transparent)',
        backdropFilter: 'blur(24px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'max(6px, calc(env(safe-area-inset-bottom, 0px) - 10px))',
      }}
    >
      <div style={{ display: 'flex', maxWidth: 'var(--shell-max)', margin: '0 auto', padding: '8px 8px 0' }}>
        {ONGLETS.map((o) => {
          const courant = o.key === actif
          return (
            <button
              key={o.key}
              onClick={() => onChange(o.key)}
              aria-current={courant ? 'page' : undefined}
              style={{
                flex: 1,
                padding: '4px 2px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                color: courant ? 'var(--ink)' : 'var(--ink-3)',
                fontSize: 12,
                fontWeight: courant ? 600 : 500,
              }}
            >
              <Icon
                name={o.icon}
                size={22}
                style={{ strokeWidth: 1.6, color: courant ? 'var(--accent)' : undefined }}
              />
              <span>{o.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
