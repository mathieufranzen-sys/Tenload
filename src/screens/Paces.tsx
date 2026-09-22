/**
 * Écran Objectif, ex-Allures.
 *
 * Renommé le 21 septembre 2026 avec la refonte : il porte désormais les
 * dossards, et les allures n'en sont qu'une conséquence. De haut en bas :
 * l'allure marathon visée (la seule valeur qui règle tout), les sept zones,
 * la forme projetée, puis les dossards. Les réglages restent dans Profil ;
 * le bouton « modifier » y mène.
 */
import { useMemo, useState } from 'react'
import planJson from '../data/plan.json'
import type { Plan, ZoneKey } from '../data/types'
import { addDays, mondayOf, today as todayISO } from '../lib/dates'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { FeedbackRow } from '../lib/buildPain'
import type { EcartPatch, EcartRow } from '../lib/overrides'
import type { DossardRow } from '../lib/dossards'
import { MARATHON_KM, ZONE_OFFSETS, formatPace, zonePace, zoneHrRange } from '../lib/paces'
import { MIN_SEANCES, serieForme } from '../lib/forme'
import { CarteForme } from '../components/CarteForme'
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

/**
 * Le camaïeu des zones, pris dans les seules couleurs de Trailblazer : les
 * neutres pour les allures lentes, le néon pour l'allure marathon (l'ancre),
 * puis les quatre verts de plus en plus sombres jusqu'aux répétitions. Le
 * mélange précédent donnait des olives boueuses (retour du 22 septembre).
 */
const TEINTE_ZONE: Array<{ fond: string; encre: string }> = [
  { fond: '#dbdad2', encre: '#142800' },
  { fond: '#c2c2b8', encre: '#142800' },
  { fond: '#65f67b', encre: '#142800' },
  { fond: '#2e731a', encre: '#ffffff' },
  { fond: '#2c5601', encre: '#ffffff' },
  { fond: '#274312', encre: '#ffffff' },
  { fond: '#142800', encre: '#ffffff' },
]

/**
 * La borne lente des zones qui se courent en plage, en s/km au-dessus de
 * l'allure marathon. L'endurance va de sa propre allure à celle de la
 * récupération, la récupération descend jusqu'à 6:30 pour un objectif de
 * 3 h 15 (+113). Donné par Mathieu le 22 septembre 2026. Les autres zones
 * restent une allure : ce sont des cibles, pas des plafonds.
 */
const PLAGE_LENTE: Partial<Record<ZoneKey, number>> = {
  ef: ZONE_OFFSETS.recup,
  recup: 113,
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
  feedback,
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

  // La tendance de la carte « Forme projetée » : les trois derniers lundis et
  // aujourd'hui, la forme telle que l'app l'affichait ces jours-là.
  const tendance = useMemo(() => {
    const lundi = mondayOf(now)
    const dates = [addDays(lundi, -21), addDays(lundi, -14), addDays(lundi, -7), now]
    return serieForme(formeTest, feedback, dates).map((f) => ({ minutes: Math.round((f.allure * MARATHON_KM) / 60) }))
  }, [formeTest, feedback, now])

  // Du plus lent au plus rapide : l'allure semi, ajoutée après coup, était
  // rangée en fin de liste, derrière les répétitions.
  const zones = (Object.entries(plan.zones) as Array<[ZoneKey, (typeof plan.zones)[ZoneKey]]>).sort(
    ([a], [b]) => zonePace(marathonPace, b) - zonePace(marathonPace, a),
  )

  return (
    <div style={{ position: 'relative', maxWidth: 'var(--shell-max)', margin: '0 auto', paddingBottom: 110 }}>
      <MeshBackground formes={false} />

      <div style={{ position: 'relative', zIndex: 5, padding: '0 var(--page-x) 0' }}>
        <EnteteEcran
          titre="Objectif"
          onOuvrirProfil={onOuvrirProfil}
        />

        {/* L'allure visée, en tête : c'est la seule valeur qui règle tout. */}
        <section className="carte" style={{ padding: '20px 20px 22px', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--ink)' }}>Allure marathon visée</p>
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
                border: '1px solid color-mix(in srgb, var(--ink) 35%, transparent)',
                fontSize: 15,
                color: 'var(--ink)',
                flex: 'none',
              }}
            >
              Modifier
            </button>
          </div>
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
              { cle: 'course', libelle: 'Fréquence en course' },
              { cle: 'velo', libelle: 'Fréquence à vélo' },
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
                    width: `${74 + (i / (zones.length - 1)) * 26}%`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    padding: '13px 20px',
                    borderRadius: 'var(--pill)',
                    background: TEINTE_ZONE[i].fond,
                    color: TEINTE_ZONE[i].encre,
                  }}
                >
                  <span style={{ fontSize: 15.5, fontWeight: ancre ? 600 : 500, lineHeight: 1.2 }}>
                    {z.label}
                  </span>
                  <span className="chiffre" style={{ fontSize: 20, flex: 'none' }}>
                    {formatPace(zonePace(marathonPace, k))}
                    {PLAGE_LENTE[k] != null && ` – ${formatPace(marathonPace + PLAGE_LENTE[k]!)}`}
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

        <CarteForme
          minutes={Math.round(ft / 60)}
          objectif={Math.round(gt / 60)}
          tendance={tendance}
          lue={forme.seances >= MIN_SEANCES}
          ecartRessenti={forme.ecart}
        />

        <SectionDossards
          periode="avenir"
          allureMarathon={marathonPace}
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
