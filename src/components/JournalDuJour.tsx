/**
 * Le point du jour : les seules saisies qui nourrissent l'indice de charge.
 *
 * Volontairement limité à ce qui compte pour le modèle — `stretching` et
 * `icing` sont en base mais n'entrent dans aucun terme de `tendonIndex.ts`,
 * les exposer laisserait croire qu'ils comptent.
 */
import type { DailyLogRow } from '../lib/buildPain'
import { DOULEUR_MOT, rangRessenti } from '../lib/ressenti'
import { JaugeRessenti } from './JaugeRessenti'
import { useJournal } from '../hooks/DataProvider'
import { useSaisieDifferee } from '../hooks/useSaisieDifferee'
import { useFileAttente } from '../hooks/useFileAttente'

interface Props {
  day: string
}

const GESTES: Array<{ champ: 'eccentric' | 'jumps'; label: string; effet: string }> = [
  { champ: 'eccentric', label: 'Excentrique', effet: '−6' },
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

      {/* Mêmes jauges que la feuille de séance, et surtout le même vocabulaire :
          le carnet n'affichait qu'un nombre sur dix, alors que c'est la même
          douleur au même tendon. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        <CurseurCarnet
          label="Raideur au réveil"
          valeur={l?.pain_wake ?? null}
          onEcrire={(v) => enregistrerLog(day, { pain_wake: v })}
        />
        <CurseurCarnet
          label="Douleur en fin de journée"
          valeur={l?.pain_evening ?? null}
          onEcrire={(v) => enregistrerLog(day, { pain_evening: v })}
        />
      </div>

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

/**
 * Un curseur du carnet : il suit le doigt tout de suite, il écrit après.
 *
 * L'écriture recalcule l'indice, donc la bande, donc le mot du coach et le
 * bloc de tête, tous plus haut dans la page et tous de hauteurs variables.
 * Écrire à chaque mouvement faisait sauter le contenu sous le pouce en plein
 * geste. Voir `useSaisieDifferee`.
 */
function CurseurCarnet({
  label,
  valeur,
  onEcrire,
}: {
  label: string
  valeur: number | null
  onEcrire: (v: number) => void
}) {
  const [affichee, changer] = useSaisieDifferee(valeur, onEcrire)

  return (
    <JaugeRessenti
      label={label}
      valeur={affichee}
      onChange={changer}
      court={affichee == null ? 'Non saisi' : DOULEUR_MOT[rangRessenti(affichee)]}
      teinte="douleur"
      pas={0.5}
    />
  )
}
