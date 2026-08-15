/**
 * Le détail du calcul de l'indice du jour, en feuille modale.
 *
 * Ouverte depuis le badge « Calcul de la charge » de l'écran Aujourd'hui.
 * Elle montre les six termes avec leur valeur réelle, pas une explication
 * générique : c'est ce qui évite l'effet boîte noire un jour où l'indice
 * interdit une séance. L'explication du modèle, elle, vit dans Profil.
 */
import { useEffect } from 'react'
import type { Band, IndexBreakdown } from '../lib/tendonIndex'
import { Icon } from './Icon'

interface Terme {
  label: string
  valeur: number
  plafond: number
  couleur: string
  detail: string
}

export function ChargeSheet({
  breakdown: b,
  band,
  onVoirSuivi,
  onClose,
}: {
  breakdown: IndexBreakdown
  band: Band
  onVoirSuivi: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const surEchap = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', surEchap)
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', surEchap)
      document.body.style.overflow = precedent
    }
  }, [onClose])

  const termes: Terme[] = [
    {
      label: 'Douleur déclarée',
      valeur: b.pain,
      plafond: 85,
      couleur: 'var(--critical)',
      detail: 'Réveil 45 %, fin de journée 35 %, effort 20 %',
    },
    {
      label: 'Emballement de la charge',
      valeur: b.ratio,
      plafond: 30,
      couleur: 'var(--series-1)',
      detail: `Rapport aigu sur chronique : ${b.acr.toFixed(2)}`,
    },
    {
      label: 'Fraîcheur immédiate',
      valeur: b.freshness,
      plafond: 20,
      couleur: 'var(--series-1)',
      detail: 'Ce que tu as encaissé hier et avant-hier',
    },
    {
      label: 'Tendance',
      valeur: b.trend,
      plafond: 6,
      couleur: 'var(--warning)',
      detail: 'Pente de la raideur matinale sur quatre jours',
    },
    {
      label: 'Monotonie',
      valeur: b.monotony,
      plafond: 8,
      couleur: 'var(--warning)',
      detail: 'Une semaine sans jour léger use le tendon',
    },
    {
      label: 'Gestes protecteurs',
      valeur: -b.credits,
      plafond: -15,
      couleur: 'var(--series-3)',
      detail: 'Excentrique −6, repos −5, sauts −2, hydratation −2',
    },
  ]

  const brut = termes.reduce((total, t) => total + t.valeur, 0)
  const plancherApplique = b.floor > 0 && b.idx > Math.round(brut)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Calcul de la charge du tendon"
      style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column' }}
    >
      <button
        aria-label="Fermer"
        onClick={onClose}
        style={{
          flex: 1,
          background: 'rgba(0,0,0,.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          border: 0,
          cursor: 'pointer',
        }}
      />
      <div
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border-2)',
          borderRadius: '26px 26px 0 0',
          maxWidth: 'var(--shell-max)',
          width: '100%',
          margin: '0 auto',
          maxHeight: '88dvh',
          overflowY: 'auto',
          padding: '10px var(--page-x) calc(24px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div
          aria-hidden
          style={{ width: 36, height: 4, borderRadius: 3, background: 'var(--surface-3)', margin: '0 auto 16px' }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-.4px' }}>Calcul de la charge</h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>
              Aujourd'hui ·{' '}
              <b style={{ color: band.color, fontWeight: 700 }}>
                {b.idx} sur 100, {band.name.toLowerCase()}
              </b>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--surface-2)',
              flex: 'none',
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          {termes.map((t) => (
            <div key={t.label} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 600 }}>
                  <b style={{ width: 8, height: 8, borderRadius: 2, background: t.couleur, flex: 'none' }} />
                  {t.label}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 650,
                    fontVariantNumeric: 'tabular-nums',
                    color: t.valeur === 0 ? 'var(--ink-3)' : 'var(--ink)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.valeur > 0 ? '+' : ''}
                  {t.valeur}
                  <small style={{ color: 'var(--ink-3)', fontWeight: 600, fontSize: 12 }}> / {t.plafond}</small>
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3, paddingLeft: 16, lineHeight: 1.4 }}>
                {t.detail}
              </div>
            </div>
          ))}

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              padding: '14px 0 0',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 650 }}>Indice</span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 650,
                letterSpacing: '-.6px',
                color: band.color,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {b.idx}
            </span>
          </div>

          {plancherApplique && (
            <p style={{ fontSize: 12.5, color: 'var(--warning)', lineHeight: 1.45, margin: '10px 0 0', fontWeight: 500 }}>
              Un plancher de {b.floor} s'applique : douleur déclarée élevée, ou épisode récent au-dessus de 60. Il ne
              peut pas être contourné par un total plus bas.
            </p>
          )}
          {b.stale && !b.painInconnue && (
            <p style={{ fontSize: 12.5, color: 'var(--warning)', lineHeight: 1.45, margin: '10px 0 0', fontWeight: 500 }}>
              Aucune douleur saisie depuis 24 h : la part douleur tourne sur un report.
            </p>
          )}
          {/* Le total affiché plus haut n'est pas faux, il est incomplet : le
              dire ici, à côté du détail terme par terme, est le seul endroit
              où la nuance se comprend vraiment. */}
          {b.painInconnue && (
            <p style={{ fontSize: 12.5, color: 'var(--warning)', lineHeight: 1.45, margin: '10px 0 0', fontWeight: 500 }}>
              Aucune douleur saisie depuis {b.joursSansDouleur ?? 'plus de 60'} jours. La part douleur, qui pèse 85 des
              100 points, est absente du total : ce qui reste ci-dessus ne mesure que la charge mécanique.
            </p>
          )}
          {b.confidence < 1 && (
            <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45, margin: '10px 0 0', fontWeight: 500 }}>
              Historique de charge encore court : la contribution mécanique est plafonnée tant que moins de dix jours
              sur vingt-huit portent une charge connue.
            </p>
          )}

          <button
            onClick={() => {
              onClose()
              onVoirSuivi()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              width: '100%',
              marginTop: 20,
              padding: 14,
              borderRadius: 'var(--pill)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              color: 'var(--ink)',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Voir l'historique
            <Icon name="chevronRight" size={15} style={{ opacity: 0.7 }} />
          </button>
        </div>
      </div>
    </div>
  )
}
