import { Icon } from './Icon'

/** Accès au profil : plus dans la navigation, un rond cerclé à côté du titre, comme les autres boutons ronds de la maquette. */
export function ProfileButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Profil"
      className="rond"
      style={{ cursor: 'pointer' }}
    >
      <Icon name="user" size={18} />
    </button>
  )
}
