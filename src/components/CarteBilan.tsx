/**
 * La carte du bilan de la semaine, au-dessus du mot du coach, le dimanche et
 * le lundi. Le dimanche soir parce que c'est là que la semaine se referme ; le
 * lundi matin parce qu'on ne relit pas toujours l'app le dimanche, et que la
 * semaine qui commence est justement celle dont la carte parle.
 */
import type { CSSProperties } from 'react'
import type { BilanSemaine } from '../lib/bilan'
import { DAYS_LONG, formatDay, formatNumber, weekdayIndex } from '../lib/dates'

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

export function CarteBilan({ bilan: b, style }: { bilan: BilanSemaine; style?: CSSProperties }) {
  const lignes: Array<[string, string]> = [
    [
      'Séances',
      `${b.faites} sur ${b.prevues}${b.sautees ? ` · ${pluriel(b.sautees, 'sautée')}` : ''}${b.nonNotees ? ` · ${b.nonNotees} à noter` : ''}`,
    ],
  ]
  if (b.kmPrevus > 0) lignes.push(['Course', `${formatNumber(b.kmRealises)} km sur ${formatNumber(b.kmPrevus)} prévus`])
  lignes.push([
    'Charge',
    b.ecartCharge == null
      ? b.nonNotees
        ? 'inconnue tant que tout n’est pas noté'
        : 'pas de référence'
      : b.ecartCharge === 0
        ? 'conforme au plan'
        : `${b.ecartCharge > 0 ? '+' : ''}${b.ecartCharge} % par rapport au plan`,
  ])
  lignes.push([
    'Raideur au réveil',
    b.raideur == null
      ? 'moins de trois matins notés'
      : `${formatNumber(b.raideur)} en moyenne${b.raideurPrecedente != null ? `, contre ${formatNumber(b.raideurPrecedente)} la semaine d’avant` : ''}`,
  ])
  lignes.push([
    'Pic de douleur',
    b.pic
      ? `${formatNumber(b.pic.valeur)} ${b.pic.moment === 'soir' ? 'le soir' : b.pic.moment === 'réveil' ? 'au réveil' : 'à l’effort'}, ${DAYS_LONG[weekdayIndex(b.pic.day)].toLowerCase()}`
      : 'aucune saisie',
  ])
  lignes.push(['Excentrique', `${pluriel(b.excentrique, 'jour')} sur 7`])

  return (
    <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '15px 16px', ...style }}>
      <div style={{ fontSize: 11, fontWeight: 750, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
        Bilan de la semaine {b.n}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', margin: '3px 0 8px' }}>
        du {formatDay(b.du)} au {formatDay(b.au)}
      </div>

      {lignes.map(([libelle, valeur], i) => (
        <div
          key={libelle}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 14,
            padding: '10px 0',
            borderBottom: i < lignes.length - 1 ? '1px solid var(--border)' : undefined,
            fontSize: 14,
          }}
        >
          <span style={{ color: 'var(--ink-2)', flex: 'none' }}>{libelle}</span>
          <span style={{ fontWeight: 650, textAlign: 'right' }}>{valeur}</span>
        </div>
      ))}

      {b.suivante.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 750,
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              margin: '16px 0 6px',
            }}
          >
            La semaine prochaine
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>
            {b.suivante.map((phrase) => (
              <li key={phrase} style={{ marginBottom: 4 }}>
                {phrase}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
