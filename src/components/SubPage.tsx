import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'

/** Sous-page en tiroir, glissée depuis la droite — le drill-down des réglages. */
export function SubPage({
  ouvert,
  titre,
  onBack,
  children,
}: {
  ouvert: boolean
  titre: string
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
        overflowY: 'auto',
        maxWidth: 'var(--shell-max)',
        margin: '0 auto',
        transform: ouvert ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
      }}
    >
      <div style={{ padding: '14px var(--page-x) 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <button
            onClick={onBack}
            aria-label="Retour"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--surface)',
              flex: 'none',
            }}
          >
            <Icon name="chevronLeft" size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-.4px' }}>{titre}</h2>
        </div>
        {children}
      </div>
    </div>
  )
}
