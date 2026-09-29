/**
 * Le compteur de l'ouverture du volume, en huit semaines d'une ligne chacune.
 *
 * Demandé par Mathieu le 29 septembre 2026, en dernier graphique de Suivi et
 * « un peu plus visuel » qu'un chiffre : un carré par jour, parce que ce qui
 * compte ici est la série, et qu'un trou dans le carnet doit se voir comme un
 * trou. Plein, un jour propre et relevé ; pâle, un jour propre sans relevé,
 * qui compte dans la série mais pas dans les 42 relevés ; en creux, ce qui
 * reste à tenir.
 */
import { addDays, formatDay, formatNumber } from '../../lib/dates'
import type { ProgresVolume } from '../../lib/adapt'
import type { PainMap } from '../../lib/tendonIndex'

const W = 320
const COTE = 30
const ECART = 5
const MARGE = 30

export function OuvertureChart({ progres, pain, now }: { progres: ProgresVolume; pain: PainMap; now: string }) {
  const { jours, joursRequis, releves, relevesRequis, atteint, remise } = progres
  const faits = Math.min(jours, joursRequis)
  // La fenêtre part du premier jour de la série en cours ; une fois atteinte,
  // elle montre les huit dernières semaines.
  const debut = addDays(now, -(faits - 1))
  const semaines = Math.ceil(joursRequis / 7)
  const H = semaines * (COTE + ECART)
  const releve = (d: string) => {
    const p = pain[d]
    return p != null && [p.wake, p.effort, p.evening].some((v) => v != null)
  }

  return (
    <div>
      <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="chiffre" style={{ fontSize: 'var(--fs-c-l)' }}>{faits}</span>
        <span style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-texte)' }}>jours sur {joursRequis}</span>
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Jours sans douleur au-dessus de 2" style={{ marginTop: 14 }}>
        {Array.from({ length: semaines }, (_, s) => (
          <text key={s} x={0} y={s * (COTE + ECART) + COTE / 2 + 4} fontSize={10} fill="var(--chart-texte)">
            S{s + 1}
          </text>
        ))}
        {Array.from({ length: joursRequis }, (_, i) => {
          const d = addDays(debut, i)
          const passe = d <= now
          const x = MARGE + (i % 7) * (COTE + ECART)
          const y = Math.floor(i / 7) * (COTE + ECART)
          const fill = !passe
            ? 'none'
            : releve(d)
              ? 'var(--good)'
              : 'color-mix(in srgb, var(--good) 28%, transparent)'
          return (
            <rect
              key={d}
              x={x}
              y={y}
              width={COTE}
              height={COTE}
              rx={7}
              fill={fill}
              stroke={passe ? 'none' : 'var(--border-2)'}
              strokeWidth={1.2}
              strokeDasharray={passe ? undefined : '3 3'}
            >
              <title>{`${formatDay(d)}${passe ? (releve(d) ? ' : relevé' : ' : sans relevé') : ' : à venir'}`}</title>
            </rect>
          )
        })}
      </svg>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-meta)', color: 'var(--ink-2)' }}>
          <span>Relevés du carnet</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Math.min(releves, relevesRequis)} sur {relevesRequis}
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--surface)', marginTop: 6, overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(100, (releves / relevesRequis) * 100)}%`,
              height: '100%',
              borderRadius: 4,
              background: 'var(--good)',
            }}
          />
        </div>
      </div>

      <p style={{ margin: '14px 0 0', color: 'var(--ink-2)', fontSize: 'var(--fs-meta)', lineHeight: 1.5 }}>
        {atteint
          ? 'Huit semaines sans douleur au-dessus de 2 : le vélo du mercredi est devenu une course facile.'
          : `Au plus tôt le ${formatDay(addDays(now, joursRequis - faits))}, si aucune douleur ne dépasse 2. Le vélo du mercredi devient alors une course facile.`}
        {remise && ` Dernière remise à zéro le ${formatDay(remise.day)}, à ${formatNumber(remise.valeur)} sur 10.`}
      </p>
    </div>
  )
}
