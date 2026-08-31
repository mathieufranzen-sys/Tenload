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
import { allureUnique, estimateDuration, formatDuration, formatPace } from '../lib/paces'
import { familleDe } from '../lib/insights'

export function StatsSeance({
  session: s,
  marathonPace,
  allureReelle = null,
}: {
  session: Session
  marathonPace: number
  /**
   * Allure calculée sur ce qui a vraiment été fait, quand la distance ET la
   * durée réelles sont saisies. Elle prime sur l'allure du plan : afficher
   * 5:27 sous un 20 km couru en 2 h ferait mentir les trois chiffres à la
   * fois, puisque les deux autres sont déjà les vrais.
   */
  allureReelle?: number | null
}) {
  const estCourse = familleDe(s.type) === 'course'
  const [dmin, dmax] = estimateDuration(s, marathonPace)

  // Une seule allure, ou aucune : à côté de la distance et de la durée
  // TOTALES, l'allure d'un seul bloc invite à une division qui ne tombe pas
  // juste et fait douter des trois chiffres à la fois.
  const allureCible = allureReelle ?? (estCourse ? allureUnique(s, marathonPace) : null)

  /**
   * Au-delà de l'heure, les minutes seules ne se lisent plus : 138 se traduit
   * mentalement en 2 h 18, autant l'écrire. En dessous, la minute reste
   * l'unité naturelle d'une séance.
   */
  const enHeures = dmax >= 60
  const duree = enHeures
    ? dmin === dmax
      ? formatDuration(dmin)
      : `${formatDuration(dmin)} - ${formatDuration(dmax)}`
    : dmin === dmax
      ? `${dmin}`
      : `${dmin}-${dmax}`

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
          {dmin > 0 && <Chiffre valeur={duree} unite={enHeures ? '' : 'min'} taille="appui" />}
        </>
      ) : (
        <Chiffre valeur={duree} unite={enHeures ? '' : 'min'} taille="cle" />
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
