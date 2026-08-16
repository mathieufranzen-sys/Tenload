/**
 * Les chiffres de la séance, sur une seule ligne.
 *
 * Le premier porte l'identité de la séance — sa distance, ou sa durée quand
 * le plan ne fixe pas de distance — et garde une taille nettement supérieure.
 * Les deux suivants l'accompagnent : ce sont des conséquences, pas des
 * décisions.
 */
import type { Session } from '../data/types'
import { formatNumber } from '../lib/dates'
import { allureUnique, estimateDuration, formatPace } from '../lib/paces'
import { familleDe } from '../lib/insights'

export function StatsSeance({
  session: s,
  marathonPace,
  distanceNotee = null,
}: {
  session: Session
  marathonPace: number
  /**
   * Distance notée dans le ressenti, quand le plan n'en fixe aucune : le vélo,
   * dont ce n'est jamais le cas, ou une séance qu'un écart a convertie en
   * course sans distance de remplacement (`s.dist` reste alors vide aussi).
   */
  distanceNotee?: number | null
}) {
  const estCourse = familleDe(s.type) === 'course'
  const [dmin, dmax] = estimateDuration(s, marathonPace)

  // Une seule allure, ou aucune : à côté de la distance et de la durée
  // TOTALES, l'allure d'un seul bloc invite à une division qui ne tombe pas
  // juste et fait douter des trois chiffres à la fois.
  const allureCible = estCourse ? allureUnique(s, marathonPace) : null

  const duree = dmin === dmax ? `${dmin}` : `${dmin}-${dmax}`

  if (s.type === 'repos') {
    return (
      <div style={{ margin: '26px 0 4px' }}>
        <Chiffre valeur="Repos" unite="" taille="cle" />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        gap: '10px 22px',
        margin: '26px 0 4px',
      }}
    >
      {s.dist ? (
        <>
          <Chiffre valeur={formatNumber(s.dist)} unite="km" taille="cle" />
          {dmin > 0 && <Chiffre valeur={duree} unite="min" taille="appui" />}
        </>
      ) : (
        <>
          <Chiffre valeur={duree} unite="min" taille="cle" />
          {/* Même disposition que la course, rôles inversés : la durée reste
              le chiffre clé, la distance notée l'accompagne. */}
          {distanceNotee != null && (
            <Chiffre valeur={formatNumber(distanceNotee)} unite="km" taille="appui" />
          )}
        </>
      )}
      {allureCible != null && (
        <Chiffre valeur={formatPace(allureCible)} unite="/km" taille="appui" />
      )}
    </div>
  )
}

function Chiffre({
  valeur,
  unite,
  taille,
}: {
  valeur: string
  unite: string
  taille: 'cle' | 'appui'
}) {
  const cle = taille === 'cle'
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: cle ? 8 : 5 }}>
      <span
        style={{
          fontSize: cle ? 56 : 27,
          fontWeight: cle ? 300 : 700,
          letterSpacing: cle ? '-2px' : '-.8px',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {valeur}
      </span>
      {unite && (
        <span
          style={{
            fontSize: cle ? 20 : 14,
            fontWeight: 500,
            color: 'var(--sur-ink-2)',
            letterSpacing: '-.3px',
          }}
        >
          {unite}
        </span>
      )}
    </div>
  )
}
