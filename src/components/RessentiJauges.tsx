/**
 * Les deux valeurs du ressenti d'une séance, en barres graduées.
 *
 * Même grammaire que les curseurs de saisie : la douleur porte le dégradé de
 * gravité (c'est elle qui décide si le plan s'adapte), l'effort perçu reste
 * neutre — un 9 sur une séance de qualité est une bonne nouvelle, pas une
 * alerte, le colorer en rouge ferait mentir la lecture.
 */
import { formatNumber } from '../lib/dates'

const DEGRADE_DOULEUR =
  'linear-gradient(90deg,#0ca30c 0%,#7fc41c 20%,#f5951f 45%,#e6624c 68%,#a52424 100%)'

export function RessentiJauges({ pain, rpe }: { pain: number; rpe: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Jauge label="Douleur au tendon" valeur={pain} remplissage={DEGRADE_DOULEUR} />
      <Jauge label="Effort perçu" valeur={rpe} remplissage="rgba(255,255,255,.85)" />
    </div>
  )
}

function Jauge({
  label,
  valeur,
  remplissage,
}: {
  label: string
  valeur: number
  remplissage: string
}) {
  const pct = Math.max(0, Math.min(100, (valeur / 10) * 100))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--sur-ink-2)' }}>{label}</span>
        <span style={{ fontSize: 17, fontWeight: 650, letterSpacing: '-.3px', fontVariantNumeric: 'tabular-nums' }}>
          {formatNumber(valeur)}
          <small style={{ fontSize: 11, fontWeight: 600, color: 'var(--sur-ink-3)' }}>/10</small>
        </span>
      </div>
      {/* Le dégradé couvre toute la largeur et se laisse recouvrir à droite :
          la teinte à un niveau donné ne dépend pas de la valeur du jour. */}
      <div
        style={{
          position: 'relative',
          height: 8,
          borderRadius: 'var(--pill)',
          background: 'rgba(255,255,255,.12)',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: remplissage }} />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${pct}%`,
            right: 0,
            background: 'rgba(10,11,13,.82)',
          }}
        />
      </div>
    </div>
  )
}
