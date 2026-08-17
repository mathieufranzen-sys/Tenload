/**
 * L'en-tête commun aux cinq écrans : titre, ligne de contexte, bouton profil.
 *
 * Il est collant. Sur un iPhone à Dynamic Island, le contenu qui défile
 * remontait jusque sous l'heure et l'îlot, et un titre à moitié caché par
 * l'horloge est pire qu'un titre absent. En restant en haut, l'en-tête occupe
 * lui-même la zone sûre et sert de fond au reste du défilement.
 *
 * Le flou du fond est masqué en dégradé plutôt que coupé net : un
 * `backdrop-filter` qui s'arrête sur une ligne droite dessine une arête
 * visible au milieu de l'écran, ce qui se remarque d'autant plus que le fond
 * est un dégradé.
 */
import type { ReactNode } from 'react'
import { ProfileButton } from './ProfileButton'

/**
 * Hauteur du fondu, en pixels, et retrait bas de l'en-tête : les deux valeurs
 * sont la même. Le fondu doit tomber ENTIÈREMENT sous le texte — exprimé en
 * pourcentage, il commençait au milieu de la ligne de contexte et le contenu
 * qui défile se lisait au travers.
 */
const FONDU = 26
const MASQUE = `linear-gradient(180deg, #000 0, #000 calc(100% - ${FONDU}px), transparent 100%)`

export function EnteteEcran({
  titre,
  contexte,
  onOuvrirProfil,
}: {
  titre: string
  contexte: ReactNode
  /** Absent sur l'écran Profil lui-même, qui n'a pas à s'ouvrir depuis lui-même. */
  onOuvrirProfil?: () => void
}) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        // Le retrait horizontal de la page est repris ici, puis annulé par la
        // marge négative : sans ça le fond flouté s'arrêterait avant les bords.
        margin: '0 calc(-1 * var(--page-x))',
        padding: `calc(20px + env(safe-area-inset-top)) var(--page-x) ${FONDU}px`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
        backdropFilter: 'blur(16px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
        background: `linear-gradient(180deg, rgba(8,9,11,.86) 0%, rgba(8,9,11,.78) calc(100% - ${FONDU}px), rgba(8,9,11,0) 100%)`,
        maskImage: MASQUE,
        WebkitMaskImage: MASQUE,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 25, fontWeight: 600, letterSpacing: '-.5px' }}>{titre}</h1>
        <p style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 500, margin: '3px 0 0' }}>
          {contexte}
        </p>
      </div>
      {onOuvrirProfil && <ProfileButton onClick={onOuvrirProfil} />}
    </header>
  )
}
