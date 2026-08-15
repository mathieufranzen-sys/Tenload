/**
 * Calibrage de la fréquence cardiaque maximale.
 *
 * Le tableau ci-dessous n'est pas décoratif : c'est le même calcul que celui
 * de l'écran Allures. Changer la valeur ici recalcule les zones là-bas, et la
 * prévisualisation évite d'avoir à changer d'écran pour vérifier l'effet.
 */
import { useState } from 'react'
import { HR_ZONES, hrRange } from '../../lib/paces'

interface Props {
  /** La FC max en vigueur, venue du profil. */
  hrMax: number
  /** Absent en mode instantanés : la carte reste alors en lecture seule. */
  onSave?: (patch: { hr_max: number }) => void
}

// Bornes de plausibilité. En dessous de 140 ou au-dessus de 220, c'est une
// faute de frappe, pas une mesure : accepter la valeur fausserait toutes les
// zones sans que rien ne le signale.
const MIN = 140
const MAX = 220

export function HeartRateZones({ hrMax, onSave }: Props) {
  const [saisie, setSaisie] = useState(String(hrMax))
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)

  const propose = Number(saisie)
  // Le tableau suit la saisie tant qu'elle est plausible, sinon il reste sur
  // la valeur enregistrée : on ne montre jamais de zones bâties sur une erreur.
  const apercu = Number.isFinite(propose) && propose >= MIN && propose <= MAX ? propose : hrMax

  function enregistrer() {
    if (!Number.isFinite(propose) || !Number.isInteger(propose)) {
      setErreur('Entre un nombre entier de battements par minute.')
      setConfirmation(null)
      return
    }
    if (propose < MIN || propose > MAX) {
      setErreur(`Valeur hors plage plausible (${MIN} à ${MAX} bpm).`)
      setConfirmation(null)
      return
    }
    onSave?.({ hr_max: propose })
    setErreur(null)
    setConfirmation(`Zones recalculées sur ${propose} bpm. L'écran Allures suit.`)
  }

  return (
    <>
      <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px 17px', marginBottom: 14 }}>
        <b style={{ fontSize: 16 }}>Ta fréquence cardiaque maximale</b>
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.5, margin: '6px 0 14px' }}>
          Strava calcule tes zones sur une FC max implicite d'environ 193, ce qui est faux : tu
          plafonnes autour de 180 sur un 3 km maximal. Une valeur trop haute te fait croire que tu
          cours en endurance alors que tu es un cran au-dessus.
        </p>
        <input
          type="number"
          inputMode="numeric"
          min={MIN}
          max={MAX}
          step="1"
          placeholder="181"
          value={saisie}
          disabled={!onSave}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enregistrer()}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'var(--surface-2)',
            border: `1px solid ${erreur ? 'var(--c-inter)' : 'var(--border-2)'}`,
            borderRadius: 14,
            padding: 14,
            fontSize: 19,
            fontWeight: 700,
            color: 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
        {erreur ? (
          <div style={{ color: 'var(--c-inter)', fontSize: 12.5, margin: '8px 2px 14px', fontWeight: 600 }}>
            {erreur}
          </div>
        ) : (
          <div style={{ color: 'var(--ink-3)', fontSize: 12.5, margin: '8px 2px 14px', fontWeight: 600 }}>
            En battements par minute, mesurée sur un effort maximal
          </div>
        )}
        <button
          onClick={enregistrer}
          disabled={!onSave}
          style={{
            display: 'block',
            width: '100%',
            padding: 15,
            borderRadius: 'var(--pill)',
            fontWeight: 700,
            fontSize: 16,
            background: 'var(--surface-2)',
            color: onSave ? 'var(--ink)' : 'var(--ink-3)',
            border: '1px solid var(--border-2)',
          }}
        >
          Recalibrer mes zones
        </button>
        {!onSave && (
          <p style={{ color: 'var(--ink-3)', fontSize: 12.5, marginTop: 10 }}>
            Connecte-toi pour changer ce réglage.
          </p>
        )}
        {confirmation && (
          <p style={{ color: 'var(--good)', fontSize: 13, fontWeight: 600, marginTop: 10 }}>
            {confirmation}
          </p>
        )}
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px 17px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <b style={{ fontSize: 16 }}>Tes cinq zones</b>
          <span style={{ color: 'var(--ink-3)', fontSize: 12.5, fontWeight: 600 }}>
            sur {apercu} bpm
            {apercu !== hrMax && <span style={{ color: '#FFD166' }}> · aperçu</span>}
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          {HR_ZONES.map((z, i) => {
            const [lo, hi] = hrRange(z, apercu)
            const bpm =
              i === 0 ? `moins de ${hi}` : i === HR_ZONES.length - 1 ? `plus de ${lo}` : `${lo} à ${hi}`
            const pct =
              i === 0
                ? `moins de ${Math.round(z.pct[1] * 100)} %`
                : i === HR_ZONES.length - 1
                  ? `plus de ${Math.round(z.pct[0] * 100)} %`
                  : `${Math.round(z.pct[0] * 100)} à ${Math.round(z.pct[1] * 100)} %`
            return (
              <div
                key={z.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 14.5,
                }}
              >
                <span>
                  {z.key} {z.label}
                </span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                  {bpm}{' '}
                  <span style={{ color: 'var(--ink-3)', fontWeight: 500, fontSize: 12.5 }}>{pct}</span>
                </span>
              </div>
            )
          })}
        </div>
        <p style={{ color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.5, margin: '14px 0 0' }}>
          Ton 25 km du 9 août à 140 de moyenne est du haut de Z2, pas du milieu : tu cours ton
          endurance un peu trop vite. Ton test de 3 km à 174 de moyenne était bien en Z5, donc
          maximal, et le 12:02 est une vraie valeur.
        </p>
      </div>
    </>
  )
}
