/**
 * Le détail du calcul de l'indice du jour, en page plein écran.
 *
 * Ouverte depuis l'écran Aujourd'hui (la pastille « charge tendon » ou la
 * tuile « d'où viennent ces points »). Refonte du 21 septembre 2026 : une
 * carte par terme, avec sa jauge sur son propre plafond, et l'addition posée
 * en tête avec la barre empilée de 0 à 100.
 *
 * Elle montre les six termes avec leur valeur réelle, pas une explication
 * générique : c'est ce qui évite l'effet boîte noire un jour où l'indice
 * interdit une séance. L'explication du modèle, elle, vit dans Profil.
 *
 * L'arithmétique reste posée à l'écran et elle tombe juste : les points
 * ajoutés, moins le soin, plus l'écart nommé par sa cause quand un plancher
 * ou un arrondi déplace le total. Un calcul qu'on ne peut pas refaire de
 * tête est une boîte noire, surtout un jour où il interdit une séance.
 */
import { useEffect, type ReactNode } from 'react'
import { TEINTE_BANDE } from '../lib/teintes'
import type { Band, IndexBreakdown } from '../lib/tendonIndex'
import { Icon } from './Icon'

interface Terme {
  label: string
  valeur: number
  plafond: number
  detail: string
}

export function ChargeSheet({
  breakdown: b,
  band,
  veille,
  jourLibelle,
  onVoirVeille,
  onVoirSuivi,
  onClose,
}: {
  breakdown: IndexBreakdown
  band: Band
  /** Le calcul de la veille, pour dire ce qui a bougé. */
  veille?: IndexBreakdown
  /** « lundi 21 septembre » : le jour dont on lit le calcul. */
  jourLibelle: string
  /** Recule d'un jour, la page restant ouverte. Absent au bout de la fenêtre. */
  onVoirVeille?: () => void
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
      detail: 'Réveil 45 %, fin de journée 35 %, effort 20 %',
    },
    {
      label: 'Emballement de la charge',
      valeur: b.ratio,
      plafond: 30,
      detail: `Rapport aigu sur chronique : ${b.acr.toFixed(2).replace('.', ',')}`,
    },
    {
      label: 'Fraîcheur immédiate',
      valeur: b.freshness,
      plafond: 20,
      detail: 'Ce que tu as encaissé hier et avant-hier',
    },
    {
      label: 'Tendance',
      valeur: b.trend,
      plafond: 6,
      detail: 'Pente de la raideur matinale sur quatre jours',
    },
    {
      label: 'Monotonie',
      valeur: b.monotony,
      plafond: 8,
      detail: 'Une semaine sans jour léger use le tendon',
    },
    {
      label: 'Gestes protecteurs',
      valeur: -b.credits,
      plafond: -15,
      detail: 'Excentrique −6, repos −5, sauts −2, hydratation −2',
    },
  ]

  // Le sous-total est la somme des valeurs AFFICHÉES, pas celle des valeurs
  // internes : c'est la seule façon qu'une addition posée à l'écran tombe
  // juste quand on la refait de tête.
  const sousTotal = termes.reduce((total, t) => total + t.valeur, 0)
  const ecart = b.idx - sousTotal
  const plancherApplique = b.floor > 0 && b.idx > sousTotal

  /**
   * Ce qui sépare le sous-total de l'indice, nommé par sa cause. Quatre
   * seulement : un plancher de sécurité, les deux bornes de l'échelle, et le
   * reliquat d'arrondi des six termes arrondis un à un. Sans cette ligne le
   * ticket ne tomberait pas juste, et un ticket qui ne tombe pas juste est
   * pire que pas de ticket du tout.
   */
  const causeEcart = plancherApplique
    ? `Plancher de sécurité à ${b.floor}`
    : sousTotal < 0
      ? 'Ramené au plancher de l’échelle'
      : sousTotal > 100
        ? 'Ramené au plafond de l’échelle'
        : 'Arrondi'

  const ajoutes = termes.slice(0, 5).reduce((t, x) => t + x.valeur, 0)
  const soin = b.credits

  /**
   * Ce qui a bougé depuis la veille, terme par terme. Seulement les deux plus
   * gros mouvements, et seulement s'ils pèsent : c'est la phrase qui répond
   * à « pourquoi c'est monté », la question qu'on se pose en ouvrant la page.
   */
  const mouvement = (() => {
    if (!veille || veille.painInconnue || b.painInconnue) return null
    const d = b.idx - veille.idx
    if (d === 0) return `L'indice n'a pas bougé depuis la veille, à ${b.idx}.`
    const hier: Record<string, number> = {
      'Douleur déclarée': veille.pain,
      'Emballement de la charge': veille.ratio,
      'Fraîcheur immédiate': veille.freshness,
      Tendance: veille.trend,
      Monotonie: veille.monotony,
      'Gestes protecteurs': -veille.credits,
    }
    const causes = termes
      .map((t) => ({ label: t.label.toLowerCase(), delta: t.valeur - (hier[t.label] ?? 0) }))
      .filter((t) => Math.sign(t.delta) === Math.sign(d) && Math.abs(t.delta) >= 1)
      .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
      .slice(0, 2)
    const noms = causes.map((c) => c.label)
    return `L'indice est passé de ${veille.idx} à ${b.idx}${
      noms.length ? ` : ${d > 0 ? 'la hausse' : 'la baisse'} vient surtout de ${noms.join(' et de ')}.` : '.'
    }`
  })()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Calcul de la charge du tendon"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        overflowY: 'auto',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--shell-max)',
          margin: '0 auto',
          padding: 'calc(14px + env(safe-area-inset-top)) var(--page-x) calc(30px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <button onClick={onClose} aria-label="Revenir à aujourd'hui" className="rond">
            <Icon name="chevronLeft" size={20} />
          </button>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: '0 0 3px', fontSize: 'var(--fs-meta)', color: 'var(--accent)' }}>{jourLibelle}</p>
            <h2 className="display" style={{ margin: 0, fontSize: 'var(--fs-t-page)', lineHeight: 1.1 }}>
              {b.painInconnue ? 'Ce que l’indice sait encore' : `D'où viennent ces ${b.idx} points`}
            </h2>
          </div>
        </div>

        {/* La carte de tête pose l'addition en une ligne, puis la dessine :
            une barre empilée de 0 à 100 où chaque terme prend sa largeur,
            avec le seuil de l'orange repéré. */}
        <section className="carte" style={{ padding: '20px 20px 18px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span className="chiffre" style={{ fontSize: 'var(--fs-c-3xl)', lineHeight: 0.9, color: TEINTE_BANDE[band.key] }}>
              {b.idx}
            </span>
            <span style={{ fontSize: 'var(--fs-texte)', color: 'var(--accent)', lineHeight: 1.4, flex: 1, minWidth: 150 }}>
              = {ajoutes} point{ajoutes > 1 ? 's' : ''} ajouté{ajoutes > 1 ? 's' : ''}
              {soin > 0 ? ` − ${soin} point${soin > 1 ? 's' : ''} de soin` : ''}
              {ecart !== 0 ? ` ${ecart > 0 ? '+' : '−'} ${Math.abs(ecart)} (${causeEcart.toLowerCase()})` : ''}
            </span>
          </div>

          <div
            aria-hidden
            style={{
              position: 'relative',
              display: 'flex',
              height: 34,
              marginTop: 18,
              borderRadius: 'var(--pill)',
              background: 'color-mix(in srgb, var(--ink) 7%, transparent)',
              overflow: 'hidden',
            }}
          >
            {termes.slice(0, 5).map((t, i) =>
              t.valeur > 0 ? (
                <span key={t.label} style={{ width: `${t.valeur}%`, background: TEINTE_TERME[i] }} />
              ) : null,
            )}
            {soin > 0 && (
              <span
                style={{
                  width: `${soin}%`,
                  marginLeft: `-${soin}%`,
                  background:
                    'repeating-linear-gradient(135deg, color-mix(in srgb, var(--bg) 75%, transparent) 0 3px, transparent 3px 6px)',
                }}
              />
            )}
            <span
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: 2,
                background: TEINTE_BANDE.orange,
                opacity: 0.8,
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8,
              fontSize: 'var(--fs-detail)',
              color: 'var(--accent)',
            }}
          >
            <span>0</span>
            <span>Seuil orange à 50</span>
            <span>100</span>
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {termes.map((t, i) => {
            const soinLigne = t.plafond < 0
            const part = Math.min(1, Math.abs(t.valeur) / Math.abs(t.plafond))
            return (
              <section
                key={t.label}
                className="carte"
                style={{
                  padding: '16px 18px 18px',
                  borderColor: soinLigne ? 'var(--border-2)' : undefined,
                  background: soinLigne ? 'var(--surface-2)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontSize: 'var(--fs-lead)' }}>{t.label}</span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    <span
                      className="chiffre"
                      style={{
                        fontSize: 'var(--fs-c-m)',
                        color: t.valeur === 0 ? 'var(--ink-3)' : soinLigne ? 'var(--pale)' : TEINTE_TERME[i],
                      }}
                    >
                      {t.valeur > 0 ? '+' : t.valeur < 0 ? '−' : ''}
                      {Math.abs(t.valeur)}
                    </span>
                    <span style={{ fontSize: 'var(--fs-detail)', color: 'var(--sur-ink-3)' }}> / {t.plafond}</span>
                  </span>
                </div>
                <div
                  style={{
                    position: 'relative',
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--surface-3)',
                    marginTop: 10,
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      [soinLigne ? 'right' : 'left']: 0,
                      width: `${part * 100}%`,
                      borderRadius: 3,
                      background: soinLigne ? 'var(--pale)' : TEINTE_TERME[i],
                    }}
                  />
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 'var(--fs-meta)', lineHeight: 1.5, color: 'var(--sur-ink-2)' }}>
                  {t.detail}
                </p>
              </section>
            )
          })}
        </div>

        {mouvement && (
          <section
            className="carte"
            style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '16px 18px', marginTop: 12 }}
          >
            <span aria-hidden style={{ display: 'flex', gap: 4, flex: 'none' }}>
              <span style={{ width: 12, height: 30, borderRadius: 6, background: 'var(--accent-doux)', opacity: 0.6 }} />
              <span style={{ width: 12, height: 30, borderRadius: 6, background: TEINTE_BANDE[band.key] }} />
            </span>
            <p style={{ margin: 0, fontSize: 'var(--fs-texte)', lineHeight: 1.5 }}>{mouvement}</p>
          </section>
        )}

        {plancherApplique && (
          <Avertissement>
            Un plancher de {b.floor} s'applique : douleur déclarée élevée, ou épisode récent au-dessus de 60. Il ne
            peut pas être contourné par un total plus bas.
          </Avertissement>
        )}
        {b.stale && !b.painInconnue && (
          <Avertissement>Aucune douleur saisie depuis 24 h : la part douleur tourne sur un report.</Avertissement>
        )}
        {/* Le total affiché plus haut n'est pas faux, il est incomplet : le
            dire ici, à côté du détail terme par terme, est le seul endroit
            où la nuance se comprend vraiment. */}
        {b.painInconnue && (
          <Avertissement>
            Aucune douleur saisie depuis {b.joursSansDouleur ?? 'plus de 60'} jours. La part douleur, qui pèse 85 des
            100 points, est absente du total : ce qui reste ci-dessus ne mesure que la charge mécanique.
          </Avertissement>
        )}
        {b.chargeInconnue && (
          <Avertissement>
            Moins de cinq des sept derniers jours portent une charge attestée. L'emballement et la fraîcheur comparent
            donc une semaine trouée à un historique plus ancien, et concluent au calme : note tes séances pour que ces
            deux lignes redeviennent des mesures.
          </Avertissement>
        )}
        {b.confidence < 1 && !b.chargeInconnue && (
          <Avertissement sourd>
            Historique de charge encore court : la contribution mécanique est plafonnée tant que moins de dix des
            quatorze derniers jours portent une charge attestée.
          </Avertissement>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
          {onVoirVeille && (
            <button
              type="button"
              onClick={onVoirVeille}
              style={{
                padding: '13px 22px',
                borderRadius: 'var(--pill)',
                border: '1px solid var(--border-2)',
                fontSize: 'var(--fs-texte)',
                color: 'var(--ink)',
              }}
            >
              Voir le calcul de la veille
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onClose()
              onVoirSuivi()
            }}
            style={{
              padding: '13px 22px',
              borderRadius: 'var(--pill)',
              border: '1px solid var(--border-2)',
              fontSize: 'var(--fs-texte)',
              color: 'var(--ink)',
            }}
          >
            Voir l'historique
          </button>
        </div>
      </div>
    </div>
  )
}

/** Une teinte par terme, lisible sur blanc ; la douleur garde l'ocre de la bande jaune. */
const TEINTE_TERME = ['#a86b00', '#4f63f2', '#2b3aa6', '#8e9af6', '#656e5e', '#49de61']

function Avertissement({ children, sourd = false }: { children: ReactNode; sourd?: boolean }) {
  return (
    <p
      style={{
        fontSize: 'var(--fs-meta)',
        color: sourd ? 'var(--sur-ink-2)' : 'var(--warning)',
        lineHeight: 1.5,
        margin: '14px 4px 0',
      }}
    >
      {children}
    </p>
  )
}

