/**
 * Tes patterns : ce qui suit ta douleur, la tenue du carnet, et l'export.
 *
 * Un écran de lecture, pas un tableau de bord. Chaque ligne est une
 * comparaison simple entre les jours avec et sans une activité, effectifs
 * affichés : un « +1,2 » sans « sur 5 jours » laisserait croire à une loi.
 */
import { BoutonAction } from '../../components/BoutonAction'
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

const titreSection = {
  fontSize: 'var(--fs-meta)',
  fontWeight: 500,
  color: 'var(--accent)',
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
      <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
        Ta douleur comparée entre les jours avec et sans chaque activité, sur les{' '}
        {carnet.length} derniers jours. Seuls les jours entièrement notés comptent : une séance sans
        ressenti ne dit pas ce qui a été fait.
      </p>

      <h3 style={titreSection}>Ce qui suit ta douleur</h3>
      {patterns.length === 0 ? (
        <div className="glass" style={{ borderRadius: 16, padding: '14px 15px' }}>
          <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
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
                    fontSize: 'var(--fs-micro)',
                    fontWeight: 600,
                    padding: '3px 9px',
                    borderRadius: 'var(--pill)',
                    background: aggrave ? 'var(--adapte-fond)' : 'color-mix(in srgb, var(--neon) 22%, transparent)',
                    border: `1px solid ${aggrave ? 'transparent' : 'color-mix(in srgb, var(--neon-2) 45%, transparent)'}`,
                    color: aggrave ? 'var(--warning)' : 'var(--good)',
                  }}
                >
                  {aggrave ? `+${formatNumber(p.ecart)}` : formatNumber(p.ecart)}
                </span>
                <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--ink-3)' }}>
                  {p.mesure === 'reveilLendemain' ? 'raideur du lendemain' : 'douleur du soir'}
                </span>
              </div>
              <p style={{ fontSize: 'var(--fs-texte)', lineHeight: 1.45, margin: 0, letterSpacing: '-.15px' }}>
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
              fontSize: 'var(--fs-meta)',
            }}
          >
            <span style={{ color: 'var(--ink-2)' }}>{libelle}</span>
            <span style={{ fontWeight: 700 }}>{valeur}</span>
          </div>
        ))}
      </div>

      <h3 style={titreSection}>Aller plus loin</h3>
      <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--ink-2)', lineHeight: 1.55, margin: '0 0 12px 2px' }}>
        Le carnet complet en texte, avec les échelles et une consigne d'analyse. Colle-le dans Claude
        ou ChatGPT pour chercher des patterns plus fins que ces comparaisons.
      </p>
      <BoutonAction onClick={copier} icone={etatCopie === 'copie' ? 'check' : 'arrowUpRight'}>
        {etatCopie === 'copie' ? 'Copié' : etatCopie === 'echec' ? 'Copie impossible sur cet appareil' : 'Copier le carnet pour une IA'}
      </BoutonAction>
    </div>
  )
}
