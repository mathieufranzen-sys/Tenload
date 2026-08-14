/**
 * Le point du jour : les seules saisies qui nourrissent l'indice de charge.
 *
 * Volontairement limité à ce qui compte pour le modèle — trois curseurs
 * n'existent pas ici (`stretching` est en base mais n'entre dans aucun terme
 * de `tendonIndex.ts`, l'exposer laisserait croire qu'il compte).
 */
import type { DailyLogRow } from '../lib/buildPain'
import { formatNumber } from '../lib/dates'
import { useJournal } from '../hooks/DataProvider'
import { useFileAttente } from '../hooks/useFileAttente'

interface Props {
  day: string
}

const GESTES: Array<{ champ: 'eccentric' | 'icing' | 'jumps'; label: string; effet: string }> = [
  { champ: 'eccentric', label: 'Excentrique', effet: '−6' },
  { champ: 'icing', label: 'Glaçage', effet: '−2' },
  { champ: 'jumps', label: 'Sauts', effet: '−2' },
]

export function JournalDuJour({ day }: Props) {
  const { ligne, enregistrerLog } = useJournal()
  const enAttente = useFileAttente()
  const l = ligne(day)

  return (
    <section
      className="glass"
      style={{
        borderRadius: 'var(--radius)',
        padding: '16px 17px',
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '1.3px',
            textTransform: 'uppercase',
            color: 'var(--sur-ink-2)',
            margin: 0,
          }}
        >
          Le point du jour
        </h2>
        {enAttente > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)' }}>
            {enAttente} saisie{enAttente > 1 ? 's' : ''} en attente
          </span>
        )}
      </div>

      <Curseur
        label="Raideur au réveil"
        valeur={l?.pain_wake ?? null}
        onChange={(v) => enregistrerLog(day, { pain_wake: v })}
      />
      <Curseur
        label="Douleur en fin de journée"
        valeur={l?.pain_evening ?? null}
        onChange={(v) => enregistrerLog(day, { pain_evening: v })}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {GESTES.map((g) => {
          const actif = Boolean(l?.[g.champ])
          return (
            <button
              key={g.champ}
              type="button"
              onClick={() => enregistrerLog(day, { [g.champ]: !actif } as Partial<DailyLogRow>)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 'var(--pill)',
                border: `1px solid ${actif ? 'rgba(52,211,153,.6)' : 'rgba(255,255,255,.2)'}`,
                background: actif ? 'rgba(52,211,153,.2)' : 'rgba(255,255,255,.06)',
                color: actif ? '#6ee7b7' : 'var(--sur-ink-2)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {g.label}
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{g.effet}</span>
            </button>
          )
        })}
        {/* Hydratation n'est pas un booléen en base (`hydration_l` est en litres) :
            le toggle écrit 2 L ou efface la saisie, seuil retenu pour le crédit. */}
        {(() => {
          const actif = (l?.hydration_l ?? 0) >= 2
          return (
            <button
              type="button"
              onClick={() => enregistrerLog(day, { hydration_l: actif ? null : 2 })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 'var(--pill)',
                border: `1px solid ${actif ? 'rgba(52,211,153,.6)' : 'rgba(255,255,255,.2)'}`,
                background: actif ? 'rgba(52,211,153,.2)' : 'rgba(255,255,255,.06)',
                color: actif ? '#6ee7b7' : 'var(--sur-ink-2)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hydratation ≥ 2 L
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>−2</span>
            </button>
          )
        })()}
      </div>
      <p style={{ fontSize: 12, color: 'var(--sur-ink-3)', lineHeight: 1.4, margin: '10px 0 0' }}>
        L'effet se voit sur l'indice de demain : c'est ce que tu fais aujourd'hui qui protège le
        tendon du lendemain.
      </p>
    </section>
  )
}

function Curseur({
  label,
  valeur,
  onChange,
}: {
  label: string
  valeur: number | null
  onChange: (v: number) => void
}) {
  // Chaque mouvement du curseur écrit : la file d'attente fusionne les appels
  // rapprochés en une seule saisie, pas besoin d'attendre un relâchement.
  const affiche = valeur ?? 0
  // Trait plein blanc jusqu'à la valeur : l'accent-color seul ne se voyait pas,
  // le track custom (global.css) a besoin d'un dégradé --track explicite.
  const pct = (affiche / 10) * 100
  const track = `linear-gradient(90deg, #fff 0%, #fff ${pct}%, rgba(255,255,255,.18) ${pct}%, rgba(255,255,255,.18) 100%)`

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13.5,
          fontWeight: 500,
          marginBottom: 6,
        }}
      >
        <span>{label}</span>
        <span
          style={{
            color: valeur === null ? 'var(--sur-ink-3)' : 'var(--ink)',
            fontWeight: valeur === null ? 500 : 650,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {valeur === null ? 'non saisi' : `${formatNumber(affiche)}/10`}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={affiche}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', ['--track' as string]: track }}
      />
    </div>
  )
}
