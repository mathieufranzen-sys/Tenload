/**
 * Écran Objectif, ex-Allures.
 *
 * Renommé le 21 septembre 2026 avec la refonte : il porte désormais les
 * dossards, et les allures n'en sont qu'une conséquence. De haut en bas :
 * l'allure marathon visée (la seule valeur qui règle tout), les sept zones,
 * la forme projetée, puis les dossards. Les réglages restent dans Profil ;
 * le bouton « modifier » y mène.
 */
import { useState } from 'react'
import planJson from '../data/plan.json'
import type { Plan, ZoneKey } from '../data/types'
import { addDays, daysBetween, formatDay, today as todayISO } from '../lib/dates'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { FeedbackRow } from '../lib/buildPain'
import type { EcartPatch, EcartRow } from '../lib/overrides'
import type { DossardRow } from '../lib/dossards'
import { MARATHON_KM, formatDuration, formatPace, zonePace, zoneHrRange } from '../lib/paces'
import type { AjustementForme } from '../lib/forme'
import { EnteteEcran } from '../components/EnteteEcran'
import { MeshBackground } from '../components/MeshBackground'
import { SectionDossards } from '../components/SectionDossards'
import { Segmented } from '../components/Segmented'

const plan = planJson as unknown as Plan

const ZONE_DESC: Record<ZoneKey, string> = {
  recup: 'Lendemain de sortie longue, footing de décrassage',
  ef: 'Le socle du plan, allure conversationnelle stricte',
  am: "L'allure du 4 avril, à ancrer dans le corps",
  semi: 'Allure du semi, fin de sortie longue avant un dossard',
  seuil: 'Effort soutenu tenable 40 à 60 minutes',
  vo2: 'Fractionné 800 m à 1 200 m, effort 9/10',
  rep: '400 m à 600 m, vivacité et économie de course',
}

/** À vélo, rien ne se pense en mètres : les mêmes zones se lisent en temps. */
const ZONE_DESC_VELO: Record<ZoneKey, string> = {
  recup: 'Lendemain de sortie longue, jambes qui tournent',
  ef: 'Le socle du plan, cadence confortable',
  am: "L'effort du 4 avril, soutenu mais tenable",
  semi: 'Allure du semi, soutenue sans être dure',
  seuil: 'Effort soutenu tenable 40 à 60 minutes',
  vo2: 'Fractionné 3 à 5 minutes, effort 9/10',
  rep: '30 secondes à 1 minute, sprints courts',
}

interface Props {
  load: LoadMap
  pain: PainMap
  feedback: FeedbackRow[]
  marathonPace: number
  fitnessPace: number
  goalLabel: string
  /** Ce que le ressenti a ajouté ou retiré à la forme projetée par le test. */
  forme: AjustementForme
  /** FC max en vigueur : c'est elle qui borne les zones cardiaques. */
  hrMax: number
  onOuvrirProfil: () => void
  /** Ouvre Profil → Réglages d'allure, où l'objectif se change. */
  onModifierAllure: () => void
  ecarts?: Map<string, EcartRow>
  dossards: DossardRow[]
  dossardsIndisponibles: boolean
  onSaveDossard?: (ligne: DossardRow) => void
  /** Forme du dernier test, sans ajustement : la base d'un recalage sur chrono. */
  formeTest: number
  onSaveEcart?: (week: number, dayIndex: number, slot: number, patch: EcartPatch) => void
  onRecalibrerForme?: (allure: number) => void
}

export function Paces({
  marathonPace,
  fitnessPace,
  goalLabel,
  forme,
  hrMax,
  onOuvrirProfil,
  onModifierAllure,
  ecarts,
  dossards,
  dossardsIndisponibles,
  onSaveDossard,
  formeTest,
  onSaveEcart,
  onRecalibrerForme,
}: Props) {
  const now = todayISO()
  const [discipline, setDiscipline] = useState<'course' | 'velo'>('course')

  const gt = marathonPace * MARATHON_KM
  const ft = fitnessPace * MARATHON_KM
  const gap = Math.round((ft - gt) / 60)

  // Progression réelle : la semaine où on en est, pas une fausse jauge tirée
  // de l'écart d'allure — on n'a pas d'historique de forme pour mesurer à
  // quelle vitesse cet écart se comble.
  const semaineCourante = plan.weeks.find((w) => now >= w.monday && now <= addDays(w.monday, 6))
  const nbSemaines = plan.weeks.length
  const progression = semaineCourante ? ((semaineCourante.n - 1) / nbSemaines) * 100 : 0
  const jRace = daysBetween(now, plan.meta.raceDate)

  const zones = Object.entries(plan.zones) as Array<[ZoneKey, (typeof plan.zones)[ZoneKey]]>

  return (
    <div style={{ position: 'relative', maxWidth: 'var(--shell-max)', margin: '0 auto', paddingBottom: 110 }}>
      <MeshBackground formes={false} />

      <div style={{ position: 'relative', zIndex: 5, padding: '0 var(--page-x) 0' }}>
        <EnteteEcran
          titre="objectif"
          contexte={
            <>
              {goalLabel} au marathon de Paris · {formatDay(plan.meta.raceDate)} 2027 · J-{jRace}
            </>
          }
          onOuvrirProfil={onOuvrirProfil}
        />

        {/* L'allure visée, en tête : c'est la seule valeur qui règle tout. */}
        <section className="carte-braise" style={{ padding: '20px 20px 22px', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--ink)' }}>allure marathon visée</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="chiffre" style={{ fontSize: 84, lineHeight: 0.95 }}>
                {formatPace(marathonPace)}
              </span>
              <span style={{ fontSize: 17, color: 'var(--sur-ink-2)' }}>/ km</span>
            </div>
            <button
              type="button"
              onClick={onModifierAllure}
              style={{
                padding: '11px 20px',
                borderRadius: 'var(--pill)',
                border: '1px solid rgba(255,220,196,.35)',
                fontSize: 15,
                color: 'var(--ink)',
                flex: 'none',
              }}
            >
              modifier
            </button>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--sur-ink-2)' }}>
            {formatDuration(Math.round(gt / 60))} sur 42,195 km. Une seule valeur règle tout : les sept zones et
            leurs fréquences cardiaques en découlent.
          </p>
        </section>

        {/* Les zones en barres qui s'allongent avec la vitesse, comme dans la
            maquette : l'échelle se lit avant les chiffres. L'allure marathon
            est la seule en pâle, c'est l'ancre des six autres. */}
        <div style={{ margin: '22px 0 14px' }}>
          <Segmented
            label="Lecture des zones"
            valeur={discipline}
            onChange={setDiscipline}
            options={[
              { cle: 'course', libelle: 'fréquence en course' },
              { cle: 'velo', libelle: 'fréquence à vélo' },
            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {zones.map(([k, z], i) => {
            const [lo, hi] = zoneHrRange(k, discipline, hrMax)
            const desc = discipline === 'velo' ? ZONE_DESC_VELO[k] : ZONE_DESC[k]
            const ancre = k === 'am'
            return (
              <div key={k}>
                <div
                  style={{
                    width: `${58 + (i / (zones.length - 1)) * 42}%`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    padding: '13px 20px',
                    borderRadius: 'var(--pill)',
                    background: ancre
                      ? 'var(--pale)'
                      : `color-mix(in srgb, var(--accent-2) ${22 + i * 11}%, var(--surface))`,
                    color: ancre ? 'var(--pale-ink)' : 'var(--ink)',
                    border: ancre ? 'none' : '1px solid rgba(255,170,120,.18)',
                  }}
                >
                  <span style={{ fontSize: 15.5, fontWeight: ancre ? 600 : 500, lineHeight: 1.2 }}>
                    {z.label.toLowerCase()}
                  </span>
                  <span className="chiffre" style={{ fontSize: 20, flex: 'none' }}>
                    {formatPace(zonePace(marathonPace, k))}
                  </span>
                </div>
                <div style={{ margin: '6px 20px 0', fontSize: 13, color: 'var(--sur-ink-3)', lineHeight: 1.4 }}>
                  {discipline === 'velo' ? 'FC vélo' : 'FC'} {lo}–{hi} · {desc.charAt(0).toLowerCase() + desc.slice(1)}
                </div>
              </div>
            )
          })}
        </div>
        {discipline === 'velo' && (
          <p style={{ margin: '12px 20px 0', fontSize: 12.5, color: 'var(--sur-ink-3)', lineHeight: 1.4 }}>
            À vélo, ta FC est inférieure de 20 bpm à la FC course à effort équivalent : les fourchettes en
            tiennent compte.
          </p>
        )}

        <section className="carte" style={{ padding: '20px 20px', marginTop: 20 }}>
          <p className="etiquette">forme projetée</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 8 }}>
            <div>
              <div className="chiffre" style={{ fontSize: 54, lineHeight: 1 }}>
                {formatDuration(Math.round(ft / 60))}
              </div>
              <div style={{ fontSize: 14, color: 'var(--accent)', marginTop: 6 }}>
                {formatPace(fitnessPace)}/km au marathon
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="chiffre" style={{ fontSize: 26 }}>
                {formatDuration(Math.round(gt / 60))}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--accent)' }}>objectif</div>
            </div>
          </div>

          {/* D'où vient l'ajustement : sans cette ligne, la forme bouge toute
              seule entre deux tests et rien ne dit pourquoi. */}
          {forme.ecart !== 0 && (
            <span className="puce" style={{ marginTop: 12 }}>
              {forme.ecart > 0 ? '+' : '−'}
              {Math.abs(forme.ecart)} s/km · ressenti des 28 derniers jours
            </span>
          )}

          <div style={{ marginTop: 18 }}>
            <div style={{ height: 10, borderRadius: 'var(--pill)', background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progression}%`,
                  height: '100%',
                  borderRadius: 'var(--pill)',
                  background: 'linear-gradient(90deg, var(--accent-2), var(--pale))',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, color: 'var(--sur-ink-2)' }}>
              <span>
                semaine {semaineCourante?.n ?? 1} sur {nbSemaines}
              </span>
              <span>{gap <= 0 ? 'objectif atteint' : `il reste ${gap} min à combler`}</span>
            </div>
          </div>
        </section>

        <SectionDossards
          plan={plan}
          now={now}
          lignes={dossards}
          ecarts={ecarts}
          formeMarathon={fitnessPace}
          formeTest={formeTest}
          indisponibles={dossardsIndisponibles}
          onSave={onSaveDossard}
          onSaveEcart={onSaveEcart}
          onRecalibrerForme={onRecalibrerForme}
        />
      </div>
    </div>
  )
}
