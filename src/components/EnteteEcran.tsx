/**
 * L'en-tête commun aux cinq écrans : titre, ligne de contexte, bouton profil.
 *
 * Il est collant. Sur un iPhone à Dynamic Island, le contenu qui défile
 * remontait jusque sous l'heure et l'îlot, et un titre à moitié caché par
 * l'horloge est pire qu'un titre absent. En restant en haut, l'en-tête occupe
 * lui-même la zone sûre et sert de fond au reste du défilement.
 *
 * Son fond est le bandeau plein de `collant.ts`, à bord net (26 octobre
 * 2026). Le Programme le pose lui-même autour du titre ET du sélecteur :
 * l'en-tête y est alors nu (`dansBandeau`), sinon deux fonds se superposent.
 */
import type { ReactNode } from 'react'
import { ProfileButton } from './ProfileButton'
import { BAS_BANDEAU, FOND_BANDEAU } from './collant'

export function EnteteEcran({
  titre,
  contexte,
  onOuvrirProfil,
  dansBandeau = false,
}: {
  titre: string
  /** Posé dans un bandeau collant plus grand : ni collant, ni fond. */
  dansBandeau?: boolean
  contexte?: ReactNode
  /** Absent sur l'écran Profil lui-même, qui n'a pas à s'ouvrir depuis lui-même. */
  onOuvrirProfil?: () => void
}) {
  return (
    <header
      style={{
        ...(dansBandeau
          ? null
          : {
              position: 'sticky' as const,
              top: 0,
              zIndex: 20,
              // Le retrait horizontal de la page est repris ici, puis annulé
              // par la marge négative : le bandeau couvre toute la largeur.
              margin: '0 calc(-1 * var(--page-x))',
              ...FOND_BANDEAU,
            }),
        // Dans le bandeau du Programme, l'écart au sélecteur reste celui d'avant.
        padding: `calc(20px + env(safe-area-inset-top)) ${dansBandeau ? 0 : 'var(--page-x)'} ${dansBandeau ? 26 : BAS_BANDEAU}px`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 className="display" style={{ margin: 0, fontSize: 'var(--fs-t-ecran)', lineHeight: 1.05 }}>
          {titre}
        </h1>
        {contexte && (
          <p style={{ color: 'var(--accent)', fontSize: 'var(--fs-meta)', fontWeight: 500, margin: '6px 0 0' }}>
            {contexte}
          </p>
        )}
      </div>
      {onOuvrirProfil && <ProfileButton onClick={onOuvrirProfil} />}
    </header>
  )
}
