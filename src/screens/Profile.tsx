/**
 * Écran Profil, qui remplace Coach de reference/tendo-v3.html : les mêmes
 * rubriques, en liste avec sous-pages plutôt qu'en défilement continu.
 * L'export/import a été retiré : Supabase persiste déjà tout.
 *
 * Les rubriques sont groupées par nature — ce que dit le plan, ce que dit le
 * corps, ce qui se règle. Six lignes à plat se lisaient comme un menu système,
 * sans hiérarchie.
 */
import { useMemo } from 'react'
import { adapt } from '../lib/adapt'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { FeedbackRow } from '../lib/buildPain'
import { addDays, today as todayISO } from '../lib/dates'
import { Icon } from '../components/Icon'
import { SubPage } from '../components/SubPage'
import { MeshBackground } from '../components/MeshBackground'
import { EnteteEcran } from '../components/EnteteEcran'
import { Constraints } from './profile/Constraints'
import { TendonIndexInfo } from './profile/TendonIndexInfo'
import { HeartRateZones } from './profile/HeartRateZones'
import { PlanStructure } from './profile/PlanStructure'
import { PaceSettings } from './profile/PaceSettings'
import { Reminders } from './profile/Reminders'
import { ANoter } from './profile/ANoter'
import { Patterns } from './profile/Patterns'
import { construireCarnet } from '../lib/carnet'
import type { ActivityRow } from '../lib/load'
import type { EcartRow } from '../lib/overrides'
import planJson from '../data/plan.json'
import type { Plan } from '../data/types'
import { compterEnRetard, type SeanceANoter } from '../lib/aNoter'

export type SectionKey =
  | 'contraintes'
  | 'indice'
  | 'coeur'
  | 'structure'
  | 'allure'
  | 'rappels'
  | 'anoter'
  | 'patterns'

type IconeRubrique = 'alert' | 'clip' | 'chart' | 'heart' | 'gauge' | 'run' | 'sun'

interface Rubrique {
  key: SectionKey
  titre: string
  description: string
  icone: IconeRubrique
}

const GROUPES: Array<{ titre: string; rubriques: Rubrique[] }> = [
  {
    titre: 'Le plan',
    rubriques: [
      { key: 'contraintes', titre: 'Tes contraintes', description: 'Les règles non négociables', icone: 'alert' },
      { key: 'structure', titre: 'Structure des 34 semaines', description: 'Les cinq blocs du plan', icone: 'clip' },
    ],
  },
  {
    titre: 'Ton corps',
    rubriques: [
      { key: 'anoter', titre: 'Séances à noter', description: 'Les journées que l’indice ne mesure pas', icone: 'clip' },
      { key: 'patterns', titre: 'Tes patterns', description: 'Ce qui suit ta douleur, et l’export pour une IA', icone: 'chart' },
      { key: 'indice', titre: 'Indice de charge du tendon', description: 'Les bandes et le détail du calcul', icone: 'chart' },
      { key: 'coeur', titre: 'Fréquence cardiaque', description: 'Recalibre ta FC max et tes zones', icone: 'heart' },
    ],
  },
  {
    titre: 'Réglages',
    rubriques: [
      { key: 'allure', titre: 'Réglages d’allure', description: 'Recalibrer ta forme, changer l’objectif', icone: 'gauge' },
      { key: 'rappels', titre: 'Rappels du carnet', description: 'Raideur à 8 h, point du soir à 23 h', icone: 'sun' },
    ],
  },
]

const TOUTES = GROUPES.flatMap((g) => g.rubriques)

interface ProfilPatch {
  fitness_pace_s?: number
  test_3k_s?: number
  test_3k_date?: string
  marathon_pace_s?: number
  goal_label?: string
  hr_max?: number
}

interface Props {
  /** Absent en démo et en mode instantanés : rien à abonner alors. */
  userId?: string
  load: LoadMap
  pain: PainMap
  feedback: FeedbackRow[]
  marathonPace: number
  test3k: number | null
  /** FC max en vigueur, venue du profil. */
  hrMax: number
  /** Absent en mode instantanés : les réglages d'allure restent alors en lecture seule. */
  onSaveProfil?: (patch: ProfilPatch) => void
  /** Absent en mode instantanés : il n'y a alors pas de session à fermer. */
  onDeconnexion?: () => void
  /** Séances en attente de ressenti, calculées une fois dans `App`. */
  aNoter: SeanceANoter[]
  /** Pour le carnet : les écarts disent ce qui a été sauté, l'historique ce qui précède l'app. */
  ecarts?: Map<string, EcartRow>
  activities: ActivityRow[]
  /** Absent en mode instantanés : les séances ne s'ouvrent alors pas. */
  onOuvrirSeance?: (x: SeanceANoter) => void
  /**
   * Sous-page ouverte, pilotée depuis `App` : l'écran Suivi doit pouvoir
   * envoyer droit sur « Séances à noter », et un état local ici l'en
   * empêchait.
   */
  section: SectionKey | null
  onSection: (s: SectionKey | null) => void
}

export function Profile({
  userId,
  load,
  pain,
  feedback,
  marathonPace,
  test3k,
  hrMax,
  onSaveProfil,
  onDeconnexion,
  aNoter,
  ecarts,
  activities,
  onOuvrirSeance,
  section,
  onSection,
}: Props) {
  const now = todayISO()
  // Quatre-vingt-dix jours : assez pour voir revenir un pattern une douzaine
  // de fois, et le carnet ne se calcule que si la page est ouverte.
  const carnet = useMemo(
    () =>
      section === 'patterns'
        ? construireCarnet({
            weeks: (planJson as unknown as Plan).weeks,
            ecarts,
            feedback,
            pain,
            load,
            activities,
            du: addDays(now, -89),
            au: now,
          })
        : [],
    [section, ecarts, feedback, pain, load, activities, now],
  )
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])
  const enRetard = compterEnRetard(aNoter)
  const active = TOUTES.find((s) => s.key === section)

  return (
    <>
      <div style={{ position: 'relative', maxWidth: 'var(--shell-max)', margin: '0 auto', paddingBottom: 90 }}>
        <MeshBackground band={A.band.key} formes={false} />

        <div style={{
        position: 'relative',
        zIndex: 5,
        padding: '0 var(--page-x) 0',
      }}>
          <EnteteEcran titre="profil" contexte={<>Règles du plan, calcul de l'indice, réglages</>} />

          {GROUPES.map((groupe) => (
            <section key={groupe.titre} style={{ marginBottom: 22 }}>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--accent)',
                  margin: '0 0 10px 2px',
                }}
              >
                {groupe.titre}
              </h2>
              {groupe.rubriques.map((r) => (
                <button
                  key={r.key}
                  onClick={() => onSection(r.key)}
                  className="carte"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    width: '100%',
                    textAlign: 'left',
                    color: 'inherit',
                    borderRadius: 22,
                    padding: '14px 16px',
                    marginBottom: 9,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      flex: 'none',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'var(--surface-3)',
                      color: 'var(--accent)',
                    }}
                  >
                    <Icon name={r.icone} size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b className="display" style={{ display: 'block', fontSize: 19, fontWeight: 400, lineHeight: 1.2 }}>
                      {r.titre}
                      {r.key === 'anoter' && enRetard > 0 && (
                        <span
                          style={{
                            marginLeft: 7,
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: '.4px',
                            padding: '2.5px 7px',
                            borderRadius: 'var(--pill)',
                            background: 'rgba(242,207,107,.18)',
                            border: '1px solid rgba(242,207,107,.28)',
                            color: 'var(--warning)',
                            verticalAlign: 'middle',
                          }}
                        >
                          {enRetard}
                        </span>
                      )}
                    </b>
                    <span style={{ display: 'block', color: 'var(--sur-ink-2)', fontSize: 13.5, marginTop: 2 }}>
                      {r.description}
                    </span>
                  </div>
                  <Icon
                    name="chevronRight"
                    size={18}
                    style={{ color: 'var(--sur-ink-3)', flex: 'none', strokeWidth: 1.7 }}
                  />
                </button>
              ))}
            </section>
          ))}

          {onDeconnexion && (
            <button
              onClick={onDeconnexion}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                padding: 14,
                borderRadius: 'var(--pill)',
                border: '1px solid var(--border-2)',
                fontSize: 15,
                color: 'var(--sur-ink-2)',
                cursor: 'pointer',
              }}
            >
              se déconnecter
            </button>
          )}
        </div>
      </div>

      <SubPage ouvert={section != null} titre={active?.titre ?? ''} onBack={() => onSection(null)}>
        {section === 'contraintes' && <Constraints />}
        {section === 'indice' && <TendonIndexInfo idx={A.detail.idx} band={A.band} />}
        {section === 'allure' && <PaceSettings marathonPace={marathonPace} test3k={test3k} onSave={onSaveProfil} />}
        {section === 'coeur' && <HeartRateZones hrMax={hrMax} onSave={onSaveProfil} />}
        {section === 'structure' && <PlanStructure />}
        {section === 'rappels' && <Reminders userId={userId} />}
        {section === 'anoter' && <ANoter seances={aNoter} onOuvrir={onOuvrirSeance} />}
        {section === 'patterns' && <Patterns carnet={carnet} />}
      </SubPage>
    </>
  )
}
