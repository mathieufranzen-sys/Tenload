/**
 * Écran Objectif, ex-Allures.
 *
 * Renommé le 21 septembre 2026 avec la refonte : il porte désormais les
 * dossards, et les allures n'en sont qu'une conséquence. Les zones, puis les
 * dossards. Depuis le 22 septembre 2026, l'allure marathon visée ne vit plus
 * que dans Profil → Réglages d'allure, et la forme projetée dans Suivi.
 */
import planJson from '../data/plan.json'
import type { Plan, ZoneKey } from '../data/types'
import { today as todayISO } from '../lib/dates'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { FeedbackRow } from '../lib/buildPain'
import type { EcartPatch, EcartRow } from '../lib/overrides'
import type { DossardRow } from '../lib/dossards'
import { ZONE_OFFSETS, formatPace, zonePace, zoneHrRange } from '../lib/paces'
import { COULEUR_ZONE, ENCRE_ZONE } from '../lib/seanceStyle'
import type { AjustementForme } from '../lib/forme'
import { EnteteEcran } from '../components/EnteteEcran'
import { MeshBackground } from '../components/MeshBackground'
import { SectionDossards } from '../components/SectionDossards'

const plan = planJson as unknown as Plan


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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {zones.map(([k, z], i) => {
            const [lo, hi] = zoneHrRange(k, 'course', hrMax)
            const [loV, hiV] = zoneHrRange(k, 'velo', hrMax)
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
                  {/* Les deux fourchettes et rien d'autre : la description
                      de la zone faisait sauter la ligne (retour du
                      23 septembre). */}
                  FC {lo}–{hi} · à vélo FC {loV}–{hiV}
                </div>
              </div>
            )
          })}
        </div>

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
