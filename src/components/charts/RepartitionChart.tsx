/**
 * La semaine en anneau : la part de chaque intensité, en temps.
 *
 * Les quatre allures de course suivent la gamme bleue, du plus pâle au plus
 * foncé à mesure que l'effort monte : c'est un ordre, pas quatre catégories
 * sans rapport, et c'est la même gamme que les zones d'Objectif. Le vélo
 * prend le vert de Suivi, le renfo le gris. La légende porte les minutes et
 * les pourcentages : l'anneau donne la proportion d'un coup d'œil, les
 * chiffres la disent sans demander de distinguer deux bleus.
 */
import { useState } from 'react'
import {
  LIBELLE_REPARTITION,
  ORDRE_REPARTITION,
  type CategorieRepartition,
} from '../../lib/repartition'
import { formatDuration } from '../../lib/paces'

export const COULEUR_REPARTITION: Record<CategorieRepartition, string> = {
  endurance: 'var(--bleu-200)',
  marathon: 'var(--bleu-400)',
  seuil: 'var(--bleu-600)',
  vitesse: 'var(--bleu-800)',
  velo: 'var(--neon-2)',
  renfo: 'var(--accent-doux)',
}

const R = 70
const EPAISSEUR = 26
const TAILLE = 2 * R + EPAISSEUR
/** L'écart entre deux parts, en degrés : la couleur du fond les sépare. */
const ECART = 1.6

function arc(debut: number, fin: number): string {
  const c = TAILLE / 2
  const pt = (a: number) => {
    const rad = ((a - 90) * Math.PI) / 180
    return `${c + R * Math.cos(rad)} ${c + R * Math.sin(rad)}`
  }
  const grand = fin - debut > 180 ? 1 : 0
  return `M ${pt(debut)} A ${R} ${R} 0 ${grand} 1 ${pt(fin)}`
}

export function RepartitionChart({ minutes }: { minutes: Record<CategorieRepartition, number> }) {
  const [survol, setSurvol] = useState<CategorieRepartition | null>(null)
  const total = ORDRE_REPARTITION.reduce((a, k) => a + minutes[k], 0)
  const presentes = ORDRE_REPARTITION.filter((k) => minutes[k] > 0)
  const course = minutes.endurance + minutes.marathon + minutes.seuil + minutes.vitesse
  const pct = (m: number) => (total ? Math.round((m / total) * 100) : 0)

  let angle = 0
  const parts = presentes.map((k) => {
    const etendue = (minutes[k] / total) * 360
    const p = { k, debut: angle, fin: angle + etendue }
    angle += etendue
    return p
  })

  const focus = survol ?? null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: TAILLE, height: TAILLE, flex: 'none', margin: '0 auto' }}>
        <svg width={TAILLE} height={TAILLE} viewBox={`0 0 ${TAILLE} ${TAILLE}`} role="img" aria-label="Répartition de la semaine par intensité">
          {parts.length === 1 ? (
            <circle cx={TAILLE / 2} cy={TAILLE / 2} r={R} fill="none" stroke={COULEUR_REPARTITION[parts[0].k]} strokeWidth={EPAISSEUR} />
          ) : (
            parts.map((p) => (
              <path
                key={p.k}
                d={arc(p.debut + ECART / 2, Math.max(p.debut + ECART / 2 + 0.1, p.fin - ECART / 2))}
                fill="none"
                stroke={COULEUR_REPARTITION[p.k]}
                strokeWidth={focus === p.k ? EPAISSEUR + 6 : EPAISSEUR}
                opacity={focus && focus !== p.k ? 0.45 : 1}
                onPointerEnter={() => setSurvol(p.k)}
                onPointerLeave={() => setSurvol(null)}
                style={{ cursor: 'default', transition: 'opacity .15s, stroke-width .15s' }}
              >
                <title>{`${LIBELLE_REPARTITION[p.k]} : ${formatDuration(minutes[p.k])}, ${pct(minutes[p.k])} %`}</title>
              </path>
            ))
          )}
        </svg>
        {/* Au centre, la part qu'on survole, sinon le total de la semaine. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div>
            <div className="chiffre" style={{ fontSize: 'var(--fs-c-s)', lineHeight: 1, whiteSpace: 'nowrap' }}>
              {focus ? `${pct(minutes[focus])} %` : formatDuration(total)}
            </div>
            <div style={{ fontSize: 'var(--fs-detail)', color: 'var(--ink-2)', marginTop: 4 }}>
              {focus ? LIBELLE_REPARTITION[focus] : 'Au total'}
            </div>
          </div>
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: '1 1 150px', minWidth: 0 }}>
        {ORDRE_REPARTITION.map((k) => (
          <li
            key={k}
            onPointerEnter={() => minutes[k] > 0 && setSurvol(k)}
            onPointerLeave={() => setSurvol(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 0',
              fontSize: 'var(--fs-meta)',
              opacity: minutes[k] > 0 ? 1 : 0.45,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: COULEUR_REPARTITION[k], flex: 'none' }} />
            <span style={{ flex: 1, minWidth: 0 }}>{LIBELLE_REPARTITION[k]}</span>
            <span style={{ color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
              {minutes[k] > 0 ? `${formatDuration(minutes[k])} · ${pct(minutes[k])} %` : '—'}
            </span>
          </li>
        ))}
        {course > 0 && (
          <li style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 'var(--fs-detail)', color: 'var(--ink-2)' }}>
            En course, {Math.round((minutes.endurance / course) * 100)} % du temps en endurance
          </li>
        )}
      </ul>
    </div>
  )
}
