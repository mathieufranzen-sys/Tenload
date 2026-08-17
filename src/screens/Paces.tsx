/**
 * Écran Allures. Les réglages (recalibrer, changer l'objectif) vivent dans
 * Profil désormais — cet écran ne fait plus que lire : objectif, forme,
 * et les six zones, en allure, en FC, ou en FC vélo.
 */
import { useMemo, useState } from 'react'
import planJson from '../data/plan.json'
import type { Plan, ZoneKey } from '../data/types'
import { addDays, today as todayISO } from '../lib/dates'
import { adapt } from '../lib/adapt'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { FeedbackRow } from '../lib/buildPain'
import { MARATHON_KM, formatDuration, formatPace, zonePace, zoneHrRange } from '../lib/paces'
import { EnteteEcran } from '../components/EnteteEcran'
import { MeshBackground } from '../components/MeshBackground'
import { Segmented } from '../components/Segmented'

const plan = planJson as unknown as Plan

const ZONE_DESC: Record<ZoneKey, string> = {
  recup: 'Lendemain de sortie longue, footing de décrassage',
  ef: 'Le socle du plan, allure conversationnelle stricte',
  am: "L'allure du 11 avril, à ancrer dans le corps",
  seuil: 'Effort soutenu tenable 40 à 60 minutes',
  vo2: 'Fractionné 800 m à 1 200 m, effort 9/10',
  rep: '400 m à 600 m, vivacité et économie de course',
}

/** À vélo, rien ne se pense en mètres : les mêmes zones se lisent en temps. */
const ZONE_DESC_VELO: Record<ZoneKey, string> = {
  recup: 'Lendemain de sortie longue, jambes qui tournent',
  ef: 'Le socle du plan, cadence confortable',
  am: "L'effort du 11 avril, soutenu mais tenable",
  seuil: 'Effort soutenu tenable 40 à 60 minutes',
  vo2: 'Fractionné 3 à 5 minutes, effort 9/10',
  rep: '30 secondes à 1 minute, sprints courts',
}

type VueZone = 'allure' | 'fc' | 'velo'

interface Props {
  load: LoadMap
  pain: PainMap
  feedback: FeedbackRow[]
  marathonPace: number
  fitnessPace: number
  goalLabel: string
  /** FC max en vigueur : c'est elle qui borne les zones cardiaques. */
  hrMax: number
  onOuvrirProfil: () => void
}

export function Paces({ load, pain, feedback, marathonPace, fitnessPace, goalLabel, hrMax, onOuvrirProfil }: Props) {
  const now = todayISO()
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])
  const [vueZone, setVueZone] = useState<VueZone>('allure')

  const gt = marathonPace * MARATHON_KM
  const ft = fitnessPace * MARATHON_KM
  const gap = Math.round((ft - gt) / 60)

  // Progression réelle : la semaine où on en est sur les 35, pas une fausse
  // jauge tirée de l'écart d'allure — on n'a pas d'historique de forme pour
  // mesurer à quelle vitesse cet écart se comble.
  const semaineCourante = plan.weeks.find((w) => now >= w.monday && now <= addDays(w.monday, 6))
  const progression = semaineCourante ? Math.round(((semaineCourante.n - 1) / 35) * 100) : 0

  return (
    <div style={{ position: 'relative', maxWidth: 'var(--shell-max)', margin: '0 auto', paddingBottom: 90 }}>
      <MeshBackground band={A.band.key} formes={false} />

      <div style={{
        position: 'relative',
        zIndex: 5,
        padding: '0 var(--page-x) 0',
      }}>
        <EnteteEcran
          titre="Allures"
          contexte={<>Objectif {goalLabel} · calibré sur ton dernier test de 3 km</>}
          onOuvrirProfil={onOuvrirProfil}
        />

        <div
          style={{
            position: 'relative',
            borderRadius: 24,
            padding: '24px 20px',
            marginBottom: 14,
            overflow: 'hidden',
            background: 'rgba(255,255,255,.07)',
            border: '1px solid rgba(255,255,255,.14)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            boxShadow: 'var(--glass-lueur)',
          }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '1.3px', textTransform: 'uppercase', color: 'var(--sur-ink-2)' }}>
            Objectif
          </div>
          <h2 style={{ margin: '6px 0 4px', fontSize: 30, fontWeight: 700, letterSpacing: '-.8px' }}>
            {formatDuration(Math.round(gt / 60))}
          </h2>
          <p style={{ color: 'var(--sur-ink-2)', fontSize: 14.5, fontWeight: 500, margin: 0 }}>
            soit {formatPace(marathonPace)}/km sur 42,195 km, le 11 avril 2027
          </p>
          {/* Les trois allures qui figuraient ici doublonnaient le tableau des
              zones, juste en dessous. */}
          <div style={{ height: 1, background: 'rgba(255,255,255,.14)', margin: '20px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 600 }}>Forme actuelle projetée</div>
              <div style={{ fontSize: 24, fontWeight: 650, letterSpacing: '-.6px', marginTop: 2 }}>{formatDuration(Math.round(ft / 60))}</div>
              <div style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 600 }}>{formatPace(fitnessPace)}/km</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 600 }}>Écart à combler</div>
              <div style={{ fontSize: 24, fontWeight: 650, letterSpacing: '-.6px', marginTop: 2 }}>
                {gap <= 0 ? 'objectif atteint' : `−${gap} min`}
              </div>
              <div style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 600 }}>{gap <= 0 ? '' : 'sur 35 semaines'}</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 8, borderRadius: 'var(--pill)', background: 'rgba(255,255,255,.14)', overflow: 'hidden' }}>
              <div style={{ width: `${progression}%`, height: '100%', background: '#fff' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, color: 'var(--sur-ink-2)', fontSize: 12, fontWeight: 600 }}>
              <span>Semaine {semaineCourante?.n ?? 1} sur 35</span>
              <span>11 avril 2027</span>
            </div>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px 17px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <b style={{ fontSize: 16 }}>Tes six zones</b>
          </div>
          <Segmented
            label="Lecture des zones"
            valeur={vueZone}
            onChange={setVueZone}
            options={[
              { cle: 'allure', libelle: 'Allure' },
              { cle: 'fc', libelle: 'FC' },
              { cle: 'velo', libelle: 'FC vélo' },
            ]}
          />
          <div style={{ marginTop: 4 }}>
            {(Object.entries(plan.zones) as Array<[ZoneKey, (typeof plan.zones)[ZoneKey]]>).map(([k, z]) => {
              const [lo, hi] = zoneHrRange(k, vueZone === 'velo' ? 'velo' : 'course', hrMax)
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--glass-border)' }}>
                  <div style={{ width: 4.5, height: 34, borderRadius: 3, flex: 'none', background: `var(--g-${z.color})` }} />
                  <div style={{ flex: 1 }}>
                    <b style={{ display: 'block', fontSize: 15.5, fontWeight: 700, letterSpacing: '-.2px' }}>{z.label}</b>
                    {/* Interlignage resserré : ces descriptions tiennent sur
                        deux lignes, et l'interligne du corps de texte les
                        faisait respirer comme un paragraphe. */}
                    <span
                      style={{
                        display: 'block',
                        color: 'var(--sur-ink-2)',
                        fontSize: 13,
                        fontWeight: 500,
                        lineHeight: 1.28,
                        marginTop: 2,
                      }}
                    >
                      {vueZone === 'velo' ? ZONE_DESC_VELO[k] : ZONE_DESC[k]}
                    </span>
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 650, letterSpacing: '-.4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {vueZone === 'allure' ? (
                      <>
                        {formatPace(zonePace(marathonPace, k))}
                        <em style={{ fontStyle: 'normal', fontSize: 12.5, color: 'var(--sur-ink-2)', fontWeight: 600 }}> /km</em>
                      </>
                    ) : (
                      <>
                        {lo}–{hi}
                        <em style={{ fontStyle: 'normal', fontSize: 12.5, color: 'var(--sur-ink-2)', fontWeight: 600 }}> bpm</em>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {vueZone === 'velo' && (
            <p style={{ color: 'var(--sur-ink-3)', fontSize: 12, lineHeight: 1.32, margin: '12px 0 0' }}>
              Chez toi, la FC à vélo est inférieure de 20 bpm à la FC course à effort équivalent —
              les fourchettes ci-dessus en tiennent compte.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

