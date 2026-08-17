/**
 * Le rappel d'un ressenti déjà enregistré, en haut de la section « Ton
 * ressenti » quand la séance est notée.
 *
 * C'était deux filets de 8 px sous un dégradé continu, hérités du curseur en
 * biseau : depuis que la saisie se fait sur une barre pleine, le rappel ne
 * ressemblait plus du tout à ce qu'on venait de régler. On reprend donc
 * exactement la même barre, au repos — la valeur enregistrée doit se
 * reconnaître au premier coup d'œil comme celle qu'on a posée.
 *
 * « Modifier » redevient un lien discret dans l'en-tête plutôt qu'un bouton
 * pleine largeur : une séance notée est un état stable, la reprise est
 * l'exception.
 */
import { BarreRessenti, LabelRessenti } from './BarreRessenti'
import { DOULEUR_MOT, EFFORT_MOT, rangRessenti } from '../lib/ressenti'
import { Icon } from './Icon'

export function RessentiJauges({
  pain,
  rpe,
  onModifier,
}: {
  pain: number
  rpe: number
  /** Absent en lecture seule : la feuille n'est alors pas modifiable. */
  onModifier?: () => void
}) {
  return (
    <div
      className="glass"
      style={{ borderRadius: 'var(--radius)', padding: '15px 16px 17px', marginBottom: 13 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 15,
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14.5,
            fontWeight: 700,
            letterSpacing: '-.2px',
            color: '#6ee7b7',
          }}
        >
          <Icon name="check" size={17} />
          Séance notée
        </span>
        {onModifier && (
          <button
            onClick={onModifier}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px 2px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--sur-ink-2)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              cursor: 'pointer',
            }}
          >
            Modifier
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div>
          <LabelRessenti>Douleur au tendon</LabelRessenti>
          <BarreRessenti valeur={pain} court={DOULEUR_MOT[rangRessenti(pain)]} teinte="douleur" />
        </div>
        <div>
          <LabelRessenti>Effort perçu</LabelRessenti>
          <BarreRessenti valeur={rpe} court={EFFORT_MOT[rangRessenti(rpe)]} teinte="neutre" />
        </div>
      </div>
    </div>
  )
}
