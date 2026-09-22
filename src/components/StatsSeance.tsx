/**
 * Les chiffres de la séance, sur une seule ligne.
 *
 * Le premier porte l'identité de la séance — sa distance, ou sa durée quand
 * le plan ne fixe pas de distance — et garde une taille nettement supérieure.
 * Les deux suivants l'accompagnent : ce sont des conséquences, pas des
 * décisions.
 */
import type { ReactNode } from 'react'
import type { Session } from '../data/types'
import { styleSeance } from '../lib/seanceStyle'
import { EchelleIntensite } from './MarqueSeance'
import { formatNumber } from '../lib/dates'
import { allureUnique, estimateDuration, formatPace } from '../lib/paces'
import { familleDe } from '../lib/insights'

/** « 1 h 05 », « 45 min » : la forme la plus courte d'une durée. */
const courte = (min: number): string => {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

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

  const intensite = styleSeance(s.type).intensite
  const colonnes: Array<{ valeur: ReactNode; label: string }> = []
  if (s.type === 'repos') {
    colonnes.push({ valeur: 'Repos', label: 'Aucune charge' })
  } else {
    if (s.dist) colonnes.push({ valeur: `${formatNumber(s.dist)} km`, label: 'Distance' })
    if (dmin > 0)
      colonnes.push(
        // Une seule valeur, le milieu de la fourchette arrondi à 5 min, comme
        // le « Temps estimé » d'AllTrails : « 1 h à 1 h 5 » se coupait sur
        // deux lignes dans une colonne étroite. La durée réelle, elle, est
        // unique par nature.
        dmin === dmax
          ? { valeur: courte(dmin), label: allureReelle != null ? 'Durée réelle' : 'Durée' }
          : { valeur: courte(Math.round((dmin + dmax) / 10) * 5), label: 'Temps estimé' },
      )
    if (allureCible != null) colonnes.push({ valeur: formatPace(allureCible), label: allureReelle != null ? 'Allure tenue' : 'Allure' })
    if (intensite > 0)
      colonnes.push({ valeur: <EchelleIntensite niveau={intensite} hauteur={20} />, label: 'Intensité' })
  }

  // La rangée de chiffres d'une fiche AllTrails : chaque valeur en haut, son
  // libellé dessous, des filets verticaux entre les colonnes. Elle remplace
  // les trois tailles de chiffres d'avant, qui hiérarchisaient des valeurs
  // que l'œil compare plutôt qu'il ne les classe.
  return (
    <div style={{ display: 'flex', margin: '22px 0 4px' }}>
      {colonnes.map((c, i) => (
        <div
          key={c.label}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            padding: i === 0 ? '2px 12px 2px 0' : '2px 12px',
            borderLeft: i === 0 ? 'none' : '1px solid var(--border-2)',
          }}
        >
          <div style={{ fontSize: 'var(--fs-t-liste)', fontWeight: 600, lineHeight: 1.2, minHeight: 24, display: 'flex', alignItems: 'flex-end' }}>
            {c.valeur}
          </div>
          <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--ink-2)', marginTop: 5 }}>{c.label}</div>
        </div>
      ))}
    </div>
  )
}
