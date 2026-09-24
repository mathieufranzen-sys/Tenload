/**
 * Un dossard ajouté, posé dans le Programme au jour de la course.
 *
 * Demandé par Mathieu le 24 septembre 2026. La carte se distingue d'une
 * séance à dessein : **elle ne fait pas partie du plan**. Le plan ne change
 * pas, la charge ne bouge pas, les contraintes ne la voient pas ; c'est un
 * rendez-vous affiché à sa date, et c'est à lui de déplacer ou de remplacer
 * la séance qui tombe le même jour s'il le souhaite.
 *
 * Elle reprend le bleu clair des cartes de dossard d'Objectif : deux endroits,
 * un seul objet.
 */
import { daysBetween, formatNumber } from '../lib/dates'
import { formatChrono, type Dossard } from '../lib/dossards'
import { Icon } from './Icon'

export function CarteDossardJour({
  dossard: d,
  now,
  onOuvrir,
}: {
  dossard: Dossard
  now: string
  /** Ouvre la page du dossard, dans Objectif. */
  onOuvrir?: () => void
}) {
  const jours = daysBetween(now, d.day)
  const passe = jours < 0

  const contenu = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="flag" size={15} style={{ color: passe ? 'var(--ink-3)' : 'var(--bleu-700)' }} />
        <span
          className="etiquette"
          style={{ fontSize: 'var(--fs-micro)', color: passe ? 'var(--ink-3)' : 'var(--bleu-700)' }}
        >
          Dossard hors plan
        </span>
        {!passe && (
          <span
            className="puce"
            style={{
              marginLeft: 'auto',
              flex: 'none',
              background: jours === 0 ? 'var(--neon)' : '#ffffff',
              color: jours === 0 ? 'var(--pale-ink)' : 'var(--bleu-700)',
              fontWeight: 600,
            }}
          >
            {jours === 0 ? "Aujourd'hui" : `Dans ${jours} j`}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div
            className="display"
            style={{ fontSize: 'var(--fs-t-ligne)', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {d.nom}
          </div>
          <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--ink-2)', marginTop: 2 }}>
            {formatNumber(Math.round(d.km * 10) / 10)} km
            {d.objectifS != null ? ` · objectif ${formatChrono(d.objectifS)}` : ''}
          </div>
        </div>
        {onOuvrir && (
          <Icon name="chevronRight" size={18} style={{ marginLeft: 'auto', flex: 'none', color: 'var(--ink-3)' }} />
        )}
      </div>
    </>
  )

  const style = {
    display: 'block',
    width: '100%',
    textAlign: 'left' as const,
    color: 'inherit',
    padding: '12px 14px',
    borderRadius: 22,
    background: passe ? 'var(--surface)' : 'var(--bleu-50)',
    border: `1px solid ${passe ? 'var(--border)' : 'var(--bleu-100)'}`,
  }

  return onOuvrir ? (
    <button type="button" onClick={onOuvrir} style={style}>
      {contenu}
    </button>
  ) : (
    <div style={style}>{contenu}</div>
  )
}
