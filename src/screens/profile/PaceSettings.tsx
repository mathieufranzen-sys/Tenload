/**
 * Réglages d'allure : recalibrer la forme, changer l'objectif marathon.
 * Vivait dans Allures, déménagé ici pour laisser cet écran aux zones et
 * aux comparaisons — les réglages sont une action ponctuelle, pas une lecture.
 */
import { useState } from 'react'
import { MARATHON_KM, formatDuration, formatPace } from '../../lib/paces'
import { today } from '../../lib/dates'

const OBJECTIFS = [
  { label: 'Sub-3', totalS: 2 * 3600 + 59 * 60 + 30 },
  { label: '3 h 15', totalS: 3 * 3600 + 15 * 60 },
  { label: '3 h 25', totalS: 3 * 3600 + 25 * 60 },
]

function versMMSS(sec: number | null): string {
  if (sec == null) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

interface ProfilPatch {
  fitness_pace_s?: number
  test_3k_s?: number
  test_3k_date?: string
  marathon_pace_s?: number
  goal_label?: string
}

interface Props {
  marathonPace: number
  test3k: number | null
  /** Absent en mode instantanés : les deux cartes restent en lecture seule. */
  onSave?: (patch: ProfilPatch) => void
}

export function PaceSettings({ marathonPace, test3k, onSave }: Props) {
  const [saisie, setSaisie] = useState(versMMSS(test3k))
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)

  function recalibrer() {
    const m = saisie.trim().match(/^(\d{1,2})[:.](\d{1,2})$/)
    if (!m) {
      setErreur('Format attendu : mm:ss, par exemple 12:02')
      setConfirmation(null)
      return
    }
    const sec = Number(m[1]) * 60 + Number(m[2])
    if (sec < 480 || sec > 1500) {
      setErreur('Temps hors plage plausible (8:00 à 25:00)')
      setConfirmation(null)
      return
    }
    const fitPace = Math.round(sec / 3 + 48)
    onSave?.({ fitness_pace_s: fitPace, test_3k_s: sec, test_3k_date: today() })
    setErreur(null)
    setConfirmation(`Forme projetée : ${formatDuration(Math.round((fitPace * MARATHON_KM) / 60))} (${formatPace(fitPace)}/km)`)
  }

  function changerObjectif(totalS: number, label: string) {
    const pace = Math.round(totalS / MARATHON_KM)
    onSave?.({ marathon_pace_s: pace, goal_label: label })
    setConfirmation(`Objectif ${formatDuration(Math.round(totalS / 60))} · allure marathon ${formatPace(pace)}/km`)
  }

  return (
    <>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 17px', marginBottom: 14 }}>
        <b style={{ fontSize: 16 }}>Recalibrer</b>
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.5, margin: '6px 0 14px' }}>
          Après une séance test ou une course, entre ton temps sur 3 km. Ça met à jour ta forme
          projetée et l'écart, sans toucher aux allures d'entraînement.
        </p>
        <input
          type="text"
          inputMode="numeric"
          placeholder="12:02"
          value={saisie}
          disabled={!onSave}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && recalibrer()}
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
          <div style={{ color: 'var(--c-inter)', fontSize: 12.5, margin: '8px 2px 14px', fontWeight: 600 }}>{erreur}</div>
        ) : (
          <div style={{ color: 'var(--ink-3)', fontSize: 12.5, margin: '8px 2px 14px', fontWeight: 600 }}>
            Format mm:ss — temps total sur 3 km
          </div>
        )}
        <button
          onClick={recalibrer}
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
          Mettre à jour ma forme
        </button>
        {!onSave && (
          <p style={{ color: 'var(--ink-3)', fontSize: 12.5, marginTop: 10 }}>Connecte-toi pour changer ces réglages.</p>
        )}
        {confirmation && (
          <p style={{ color: 'var(--good)', fontSize: 13, fontWeight: 600, marginTop: 10 }}>{confirmation}</p>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 17px' }}>
        <b style={{ fontSize: 16 }}>Changer l'objectif</b>
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.5, margin: '6px 0 12px' }}>
          Toutes les allures du plan se recalculent. Le point de décision est prévu après le semi
          test du 30 janvier.
        </p>
        <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--pill)', padding: 3, gap: 2 }}>
          {OBJECTIFS.map((o) => {
            const pace = Math.round(o.totalS / MARATHON_KM)
            const actif = Math.abs(pace - marathonPace) < 2
            return (
              <button
                key={o.label}
                aria-pressed={actif}
                disabled={!onSave}
                onClick={() => changerObjectif(o.totalS, o.label)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: 'var(--pill)',
                  fontSize: 14,
                  fontWeight: 700,
                  background: actif ? '#0C0D10' : 'transparent',
                  color: actif ? 'var(--ink)' : 'var(--ink-2)',
                }}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
