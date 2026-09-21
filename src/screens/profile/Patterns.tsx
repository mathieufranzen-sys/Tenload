/**
 * Tes patterns : ce qui suit ta douleur, la tenue du carnet, et l'export.
 *
 * Un écran de lecture, pas un tableau de bord. Chaque ligne est une
 * comparaison simple entre les jours avec et sans une activité, effectifs
 * affichés : un « +1,2 » sans « sur 5 jours » laisserait croire à une loi.
 */
import { useState } from 'react'
import {
  ECART_MIN,
  MIN_JOURS,
  exporterPourIA,
  phrasePattern,
  tenueDuCarnet,
  trouverPatterns,
  type JourCarnet,
} from '../../lib/carnet'
import { formatNumber } from '../../lib/dates'
import { Icon } from '../../components/Icon'

const titreSection = {
  fontSize: 11,
  fontWeight: 750,
  letterSpacing: '1.1px',
  textTransform: 'uppercase' as const,
  color: 'var(--ink-3)',
  margin: '24px 0 9px 2px',
}

export function Patterns({ carnet }: { carnet: JourCarnet[] }) {
  const patterns = trouverPatterns(carnet)
  const tenue = tenueDuCarnet(carnet)
  const [etatCopie, setEtatCopie] = useState<'idle' | 'copie' | 'echec'>('idle')

  async function copier() {
    const texte = exporterPourIA(carnet, patterns, tenue)
    try {
      await navigator.clipboard.writeText(texte)
      setEtatCopie('copie')
    } catch {
      // Le presse-papiers est refusé hors geste ou hors contexte sécurisé :
      // la feuille de partage d'iOS prend le relais.
      try {
        await navigator.share({ title: 'Carnet Tenload', text: texte })
        setEtatCopie('copie')
      } catch {
        setEtatCopie('echec')
      }
    }
  }

  return (
    <div>
      <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
        Ta douleur comparée entre les jours avec et sans chaque activité, sur les{' '}
        {carnet.length} derniers jours. Seuls les jours entièrement notés comptent : une séance sans
        ressenti ne dit pas ce qui a été fait.
      </p>

      <h3 style={titreSection}>Ce qui suit ta douleur</h3>
      {patterns.length === 0 ? (
        <div className="glass" style={{ borderRadius: 16, padding: '14px 15px' }}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
            Rien de net pour l'instant. Il faut au moins {MIN_JOURS} jours complets avec et{' '}
            {MIN_JOURS} sans une activité, et un écart d'au moins {formatNumber(ECART_MIN)} point.
          </p>
        </div>
      ) : (
        patterns.map((p) => {
          const aggrave = p.ecart > 0
          return (
            <div key={p.cle} className="glass" style={{ borderRadius: 16, padding: '13px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: '.9px',
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: 'var(--pill)',
                    background: aggrave ? 'rgba(251,191,36,.16)' : 'rgba(111,224,176,.18)',
                    border: `1px solid ${aggrave ? 'rgba(251,191,36,.32)' : 'rgba(111,224,176,.3)'}`,
                    color: aggrave ? '#fcd34d' : 'var(--good)',
                  }}
                >
                  {aggrave ? `+${formatNumber(p.ecart)}` : formatNumber(p.ecart)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {p.mesure === 'reveilLendemain' ? 'raideur du lendemain' : 'douleur du soir'}
                </span>
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.45, margin: 0, letterSpacing: '-.15px' }}>
                {phrasePattern(p)}
              </p>
            </div>
          )
        })
      )}

      <h3 style={titreSection}>La tenue du carnet</h3>
      <div className="glass" style={{ borderRadius: 16, padding: '4px 15px' }}>
        {[
          ['Jours entièrement notés', `${tenue.complets} sur ${tenue.jours}`],
          ['Raideur au réveil saisie', `${tenue.reveilsSaisis} jours`],
          ['Douleur du soir saisie', `${tenue.soirsSaisis} jours`],
          ['Excentrique', `${tenue.excentrique} jours`],
          ['Séances sautées', `${tenue.sautees}`],
          ['Séances non notées', `${tenue.nonNotees}`],
        ].map(([libelle, valeur], i, tout) => (
          <div
            key={libelle}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '11px 0',
              borderBottom: i < tout.length - 1 ? '1px solid var(--border)' : undefined,
              fontSize: 14,
            }}
          >
            <span style={{ color: 'var(--ink-2)' }}>{libelle}</span>
            <span style={{ fontWeight: 700 }}>{valeur}</span>
          </div>
        ))}
      </div>

      <h3 style={titreSection}>Aller plus loin</h3>
      <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: '0 0 12px 2px' }}>
        Le carnet complet en texte, avec les échelles et une consigne d'analyse. Colle-le dans Claude
        ou ChatGPT pour chercher des patterns plus fins que ces comparaisons.
      </p>
      <button
        onClick={copier}
        className="glass"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          color: 'inherit',
          borderRadius: 16,
          padding: '14px',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <Icon name={etatCopie === 'copie' ? 'check' : 'clip'} size={17} />
        {etatCopie === 'copie' ? 'Copié' : etatCopie === 'echec' ? 'Copie impossible sur cet appareil' : 'Copier le carnet pour une IA'}
      </button>
    </div>
  )
}
