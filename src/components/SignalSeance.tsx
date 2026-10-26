/**
 * L'icône de signal d'une carte de séance (`signal.ts`) : un triangle pour
 * une contrainte cassée, un tracé de pouls pour la douleur, des curseurs pour
 * le volume. La forme double la couleur, pour se lire même sans elle.
 */
import type { NiveauSignal } from '../lib/signal'

const LIBELLE: Record<NiveauSignal, string> = {
  alerte: 'Contrainte du plan non respectée',
  douleur: 'Séance adaptée par la douleur',
  adapte: 'Séance adaptée par le volume',
}

export function SignalSeance({
  niveau,
  taille = 24,
  surAplat = false,
}: {
  niveau: NiveauSignal
  taille?: number
  /** Posée sur l'aplat de son propre niveau (message de la fiche) : pastille blanche, sinon elle s'y fond. */
  surAplat?: boolean
}) {
  return (
    <span
      role="img"
      aria-label={LIBELLE[niveau]}
      title={LIBELLE[niveau]}
      style={{
        width: taille,
        height: taille,
        borderRadius: '50%',
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        background: surAplat ? 'var(--surface-2)' : `var(--signal-${niveau}-fond)`,
        color: `var(--signal-${niveau}-encre)`,
      }}
    >
      <svg width={taille * 0.58} height={taille * 0.58} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {niveau === 'alerte' && (
          <>
            <path d="M12 3.5 2.5 20.5h19L12 3.5Z" />
            <path d="M12 10v4.5M12 17.4v.01" />
          </>
        )}
        {niveau === 'douleur' && <path d="M2 12h4l2.5-6 4 13 3-9 1.5 2H22" />}
        {niveau === 'adapte' && (
          <>
            <path d="M4 7h10M4 17h6" />
            <circle cx="17.5" cy="7" r="2.6" />
            <circle cx="14" cy="17" r="2.6" />
          </>
        )}
      </svg>
    </span>
  )
}
