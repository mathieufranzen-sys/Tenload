import { Icon } from './Icon'

/** Accès au profil : plus dans la navigation, un rond glass à côté du titre. */
export function ProfileButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Profil"
      className="glass"
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
        cursor: 'pointer',
        color: 'var(--ink)',
      }}
    >
      <Icon name="user" size={18} />
    </button>
  )
}
