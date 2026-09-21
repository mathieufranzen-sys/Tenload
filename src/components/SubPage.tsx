import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'

/** Sous-page en tiroir, glissée depuis la droite — le drill-down des réglages. */
export function SubPage({
  ouvert,
  titre,
  surtitre,
  onBack,
  children,
}: {
  ouvert: boolean
  titre: string
  /** La petite ligne d'accent au-dessus du titre : « carnet », une date. */
  surtitre?: string
  onBack: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!ouvert) return
    const surEchap = (e: KeyboardEvent) => e.key === 'Escape' && onBack()
    window.addEventListener('keydown', surEchap)
    return () => window.removeEventListener('keydown', surEchap)
  }, [ouvert, onBack])

  return (
    <div
      aria-hidden={!ouvert}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        background: 'var(--bg)',
        // Une sous-page reste un écran de l'app : la même lueur en haut.
        backgroundImage:
          'radial-gradient(110% 320px at 10% -80px, rgba(232, 116, 47, 0.2), transparent 70%)',
        overflowY: 'auto',
        maxWidth: 'var(--shell-max)',
        margin: '0 auto',
        transform: ouvert ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
      }}
    >
      <div style={{ padding: 'calc(14px + env(safe-area-inset-top)) var(--page-x) 40px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
          <button
            onClick={onBack}
            aria-label="Retour"
            className="rond"
            style={{ cursor: 'pointer' }}
          >
            <Icon name="chevronLeft" size={20} />
          </button>
          <div style={{ minWidth: 0, paddingTop: surtitre ? 0 : 8 }}>
            {surtitre && (
              <p style={{ margin: '0 0 3px', fontSize: 13.5, color: 'var(--accent)' }}>{surtitre}</p>
            )}
            <h2 className="display" style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>
              {titre}
            </h2>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
