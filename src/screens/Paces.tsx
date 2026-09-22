/**
 * Écran Objectif, ex-Allures.
 *
 * Renommé le 21 septembre 2026 avec la refonte : il porte désormais les
 * dossards, et les allures n'en sont qu'une conséquence. Les zones, puis les
 * dossards. Depuis le 22 septembre 2026, l'allure marathon visée ne vit plus
 * que dans Profil → Réglages d'allure, et la forme projetée dans Suivi.
 */
import { Fragment, useState } from 'react'
import planJson from '../data/plan.json'
import type { Plan, ZoneKey } from '../data/types'
import { today as todayISO } from '../lib/dates'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { FeedbackRow } from '../lib/buildPain'
import type { EcartPatch, EcartRow } from '../lib/overrides'
import { chronoEquivalent, formatChrono, type DossardRow } from '../lib/dossards'
import { HALF_KM, MARATHON_KM, ZONE_OFFSETS, formatPace, zonePace, zoneHrRange } from '../lib/paces'
import { COULEUR_ZONE, ENCRE_ZONE } from '../lib/seanceStyle'
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
 * Le camaïeu des zones, dans la gamme bleue, la couleur secondaire des
 * allures (arbitré par Mathieu le 22 septembre 2026) : du bleu pâle de la
 * récupération au bleu nuit des répétitions.
 */
// Les couleurs d'allure vivent dans `seanceStyle.ts` : le déroulé d'une
// séance et ces barres doivent montrer la même zone de la même couleur.

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

/** Les quatre distances qui se courent, de la plus courte à la plus longue. */
const DISTANCES_EQUIVALENTES: Array<[string, number]> = [
  ['5 km', 5],
  ['10 km', 10],
  ['Semi-marathon', HALF_KM],
  ['Marathon', MARATHON_KM],
]

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
  hrMax,
  onOuvrirProfil,
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

        {/* Les zones en barres qui s'allongent avec la vitesse, comme dans la
            maquette : l'échelle se lit avant les chiffres. L'allure marathon
            est la seule en pâle, c'est l'ancre des six autres. */}
        <div style={{ margin: '0 0 14px' }}>
          <Segmented
            label="Lecture des zones"
            valeur={discipline}
            onChange={setDiscipline}
            options={[
              { cle: 'course', libelle: 'Course' },
              { cle: 'velo', libelle: 'Vélo' },
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
                    background: COULEUR_ZONE[k],
                    color: ENCRE_ZONE[k],
                  }}
                >
                  <span style={{ fontSize: 'var(--fs-texte)', fontWeight: ancre ? 600 : 500, lineHeight: 1.2 }}>
                    {z.label}
                  </span>
                  <span className="chiffre" style={{ fontSize: 'var(--fs-c-s)', flex: 'none' }}>
                    {formatPace(zonePace(marathonPace, k))}
                    {PLAGE_LENTE[k] != null && ` – ${formatPace(marathonPace + PLAGE_LENTE[k]!)}`}
                  </span>
                </div>
                <div style={{ margin: '6px 20px 0', fontSize: 'var(--fs-detail)', color: 'var(--sur-ink-3)', lineHeight: 1.4 }}>
                  {discipline === 'velo' ? 'FC vélo' : 'FC'} {lo}–{hi} · {desc.charAt(0).toLowerCase() + desc.slice(1)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Ce que ta forme du jour vaut sur les autres distances, et ce que
            l'objectif marathon y vaudrait : les deux colonnes se comparent
            ligne à ligne. Même équivalence que le recalage d'un chrono de
            course, à l'envers (`chronoEquivalent`). */}
        <section className="carte" style={{ padding: '18px 18px 16px', marginTop: 26 }}>
          <h2 className="display" style={{ margin: '0 0 4px', fontSize: 'var(--fs-t-carte)', lineHeight: 1.2 }}>
            Chronos équivalents
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: '0 16px',
              alignItems: 'baseline',
              marginTop: 10,
            }}
          >
            <span style={{ fontSize: 'var(--fs-detail)', color: 'var(--accent)' }} />
            <span style={{ fontSize: 'var(--fs-detail)', color: 'var(--accent)', textAlign: 'right' }}>Ta forme</span>
            <span style={{ fontSize: 'var(--fs-detail)', color: 'var(--bleu-700)', textAlign: 'right' }}>Objectif</span>
            {DISTANCES_EQUIVALENTES.map(([libelle, km]) => (
              <Fragment key={libelle}>
                <span
                  style={{
                    fontSize: 'var(--fs-texte)',
                    padding: '10px 0',
                    borderTop: '1px solid var(--border)',
                    color: 'var(--ink-2)',
                  }}
                >
                  {libelle}
                </span>
                <span
                  className="chiffre"
                  style={{ fontSize: 'var(--fs-c-s)', padding: '10px 0', borderTop: '1px solid var(--border)', textAlign: 'right' }}
                >
                  {formatChrono(chronoEquivalent(km, fitnessPace))}
                </span>
                <span
                  className="chiffre"
                  style={{
                    fontSize: 'var(--fs-c-s)',
                    padding: '10px 0',
                    borderTop: '1px solid var(--border)',
                    textAlign: 'right',
                    color: 'var(--bleu-700)',
                  }}
                >
                  {formatChrono(chronoEquivalent(km, marathonPace))}
                </span>
              </Fragment>
            ))}
          </div>
          <p style={{ margin: '12px 2px 0', fontSize: 'var(--fs-detail)', color: 'var(--sur-ink-3)', lineHeight: 1.45 }}>
            Des équivalences, pas des prévisions : elles supposent une course préparée et un jour sans vent.
          </p>
        </section>

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
