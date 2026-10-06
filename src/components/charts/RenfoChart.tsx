/**
 * La progression du renfo, une ligne par exercice suivi : une courbe courte
 * et ce que l'exercice a gagné. La charge pour un exercice lesté, sinon les
 * répétitions, les secondes ou les contacts. Pas d'axe : on y lit un sens,
 * pas une valeur, et la valeur est écrite à côté.
 */
import { formatNumber } from '../../lib/dates'
import { seriesParExercice, type RenfoRow } from '../../lib/renfo'

const L = 96
const H = 28

export function RenfoChart({ historique }: { historique: RenfoRow[] }) {
  const exos = seriesParExercice(historique)
  if (!exos.length)
    return (
      <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 'var(--fs-texte)', lineHeight: 1.5 }}>
        Note la charge de tes exercices dans une séance de renfo : leur progression s&apos;affiche ici
        dès deux séances.
      </p>
    )

  return (
    <div>
      {exos.map(({ exo, lignes }, i) => {
        const enKg = exo.mesure === 'reps' && lignes.some((r) => r.kg > 0)
        const vals = lignes.map((r) => (enKg ? r.kg : r.valeur))
        const unite = enKg ? ' kg' : exo.mesure === 'duree' ? ' s' : exo.mesure === 'contacts' ? ' contacts' : ' rép.'
        const min = Math.min(...vals)
        const max = Math.max(...vals)
        const y = (v: number) => (max === min ? H / 2 : H - 3 - ((v - min) / (max - min)) * (H - 6))
        const x = (k: number) => 3 + (k / (vals.length - 1)) * (L - 6)
        const points = vals.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
        return (
          <div
            key={exo.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              borderTop: i ? '1px solid var(--border)' : undefined,
            }}
          >
            <span style={{ fontSize: 'var(--fs-texte)', minWidth: 0 }}>
              {exo.nom}
              <span style={{ display: 'block', color: 'var(--ink-3)', fontSize: 'var(--fs-detail)' }}>
                {lignes.length} séances
              </span>
            </span>
            <svg width={L} height={H} viewBox={`0 0 ${L} ${H}`} aria-hidden>
              <polyline points={points} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={x(vals.length - 1)} cy={y(vals[vals.length - 1])} r={3} fill="var(--chart-1)" />
            </svg>
            <span style={{ fontSize: 'var(--fs-texte)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {formatNumber(vals[0])} → <b>{formatNumber(vals[vals.length - 1])}</b>
              {unite}
            </span>
          </div>
        )
      })}
    </div>
  )
}
