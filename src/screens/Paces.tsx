/**
 * Écran Allures, porté depuis reference/tendo-v3.html (`vPaces`).
 */
import { useState } from 'react'
import planJson from '../data/plan.json'
import type { Plan, ZoneKey } from '../data/types'
import { today } from '../lib/dates'
import { MARATHON_KM, formatDuration, formatPace, zonePace } from '../lib/paces'

const plan = planJson as unknown as Plan

const ZONE_DESC: Record<ZoneKey, string> = {
  recup: 'Lendemain de sortie longue, footing de décrassage',
  ef: 'Le socle du plan, allure conversationnelle stricte',
  am: "L'allure du 11 avril, à ancrer dans le corps",
  seuil: 'Effort soutenu tenable 40 à 60 minutes',
  vo2: 'Fractionné 800 m à 1 200 m, effort 9/10',
  rep: '400 m à 600 m, vivacité et économie de course',
}

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
  fitnessPace: number
  test3k: number | null
  goalLabel: string
  /** Absent en mode instantanés : les deux cartes de réglage restent en lecture seule. */
  onSave?: (patch: ProfilPatch) => void
}

export function Paces({ marathonPace, fitnessPace, test3k, goalLabel, onSave }: Props) {
  const gt = marathonPace * MARATHON_KM
  const ft = fitnessPace * MARATHON_KM
  const gap = Math.round((ft - gt) / 60)
  const couleurEcart = gap <= 0 ? 'var(--good)' : gap <= 12 ? 'var(--warning)' : 'var(--serious)'

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
    <div style={{ maxWidth: 'var(--shell-max)', margin: '0 auto', padding: '22px var(--page-x) 90px' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-.6px' }}>Allures</h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, fontWeight: 500, margin: '3px 0 0' }}>
          Objectif {goalLabel} · calibré sur ton dernier test de 3 km
        </p>
      </header>

      <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 13, overflow: 'hidden', background: 'var(--g-long)', color: '#fff' }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '1.3px', textTransform: 'uppercase', color: 'rgba(255,255,255,.85)' }}>
          Objectif
        </div>
        <h2 style={{ margin: '6px 0 4px', fontSize: 26, fontWeight: 800, letterSpacing: '-.7px' }}>
          {formatDuration(Math.round(gt / 60))}
        </h2>
        <p style={{ color: 'rgba(255,255,255,.8)', fontSize: 14.5, fontWeight: 500, margin: 0 }}>
          soit {formatPace(marathonPace)}/km sur 42,195 km, le 11 avril 2027
        </p>
        <div style={{ display: 'flex', gap: 22, marginTop: 16 }}>
          <HeroStat value={`${formatPace(marathonPace)}`} label="allure marathon" />
          <HeroStat value={`${formatPace(zonePace(marathonPace, 'seuil'))}`} label="seuil" />
          <HeroStat value={`${formatPace(zonePace(marathonPace, 'vo2'))}`} label="intervalles" />
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 17px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ color: 'var(--ink-2)', fontSize: 13, fontWeight: 600 }}>Forme actuelle projetée</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.9px', marginTop: 2 }}>{formatDuration(Math.round(ft / 60))}</div>
            <div style={{ color: 'var(--ink-2)', fontSize: 13, fontWeight: 600 }}>{formatPace(fitnessPace)}/km</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--ink-2)', fontSize: 13, fontWeight: 600 }}>Écart à combler</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.9px', marginTop: 2, color: couleurEcart }}>
              {gap <= 0 ? 'objectif atteint' : `−${gap} min`}
            </div>
            <div style={{ color: 'var(--ink-2)', fontSize: 13, fontWeight: 600 }}>{gap <= 0 ? '' : 'sur 35 semaines'}</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ height: 10, borderRadius: 'var(--pill)', background: 'var(--surface-3)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.max(4, Math.min(100, 100 - gap * 4))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--series-1), var(--series-3))',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, color: 'var(--ink-2)', fontSize: 12, fontWeight: 600 }}>
            <span>{formatDuration(Math.round(ft / 60))} aujourd'hui</span>
            <span>{formatDuration(Math.round(gt / 60))} visé</span>
          </div>
        </div>
        <p style={{ color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.5, margin: '14px 0 0' }}>
          Les six zones sont ancrées sur l'objectif, pas sur ta forme du jour. C'est volontaire :
          l'allure marathon doit s'installer dans le corps pendant huit mois, pas se découvrir en
          avril.
        </p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 17px', marginBottom: 14 }}>
        <b style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>Tes six zones</b>
        {(Object.entries(plan.zones) as Array<[ZoneKey, (typeof plan.zones)[ZoneKey]]>).map(([k, z]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 4.5, height: 34, borderRadius: 3, flex: 'none', background: `var(--g-${z.color})` }} />
            <div style={{ flex: 1 }}>
              <b style={{ display: 'block', fontSize: 15.5, fontWeight: 700, letterSpacing: '-.2px' }}>{z.label}</b>
              <span style={{ color: 'var(--ink-2)', fontSize: 13, fontWeight: 500 }}>{ZONE_DESC[k]}</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.5px' }}>
              {formatPace(zonePace(marathonPace, k))}
              <em style={{ fontStyle: 'normal', fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600 }}> /km</em>
            </div>
          </div>
        ))}
      </div>

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

        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

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
        {!onSave && (
          <p style={{ color: 'var(--ink-3)', fontSize: 12.5, marginTop: 10 }}>Connecte-toi pour changer ces réglages.</p>
        )}
        {confirmation && (
          <p style={{ color: 'var(--good)', fontSize: 13, fontWeight: 600, marginTop: 10 }}>{confirmation}</p>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius)', padding: '15px 16px' }}>
        <h4 style={{ margin: '0 0 6px', fontSize: 15.5, fontWeight: 800 }}>D'où viennent ces chiffres</h4>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: '#D6D9DE' }}>
          {test3k
            ? `Ton dernier test de 3 km (${versMMSS(test3k)}) projette la forme ci-dessus.`
            : 'Ta forme projetée vient de ton dernier test de 3 km.'}{' '}
          Les six zones s'en déduisent par un écart fixe par rapport à l'allure marathon : seuil
          −20 s/km, intervalles −40, répétitions −55, endurance facile +50, récupération +75.
          Elles sont ancrées sur l'objectif, pas sur cette forme projetée — voir la carte
          au-dessus.
        </p>
      </div>
    </div>
  )
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <b style={{ display: 'block', fontSize: 22, fontWeight: 800, letterSpacing: '-.5px' }}>{value}</b>
      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{label}</span>
    </div>
  )
}
