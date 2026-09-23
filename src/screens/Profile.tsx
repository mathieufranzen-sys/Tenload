/**
 * Écran Profil, qui remplace Coach de reference/tendo-v3.html : les mêmes
 * rubriques, en liste avec sous-pages plutôt qu'en défilement continu.
 * L'export/import a été retiré : Supabase persiste déjà tout.
 *
 * Les rubriques sont groupées par nature — ce que dit le plan, ce que dit le
 * corps, ce qui se règle. Six lignes à plat se lisaient comme un menu système,
 * sans hiérarchie.
 */
import { type ReactNode, useMemo } from 'react'
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
  | 'dossards'
  | 'bilans'
  | 'programme'
  | 'reglages'

type IconeRubrique = 'alert' | 'clip' | 'chart' | 'heart' | 'gauge' | 'run' | 'sun' | 'flag'

interface Rubrique {
  key: SectionKey
  titre: string
  description: string
  icone: IconeRubrique
}

/**
 * Deux niveaux depuis le 23 septembre 2026. Le premier est TON suivi :
 * ce que tu consultes ou saisis, une carte par rubrique. Le second range ce
 * qui se lit une fois et se règle rarement, derrière deux portes.
 */
const PERSONNEL: Rubrique[] = [
  { key: 'bilans', titre: 'Bilans de la semaine', description: 'Chaque semaine terminée et son bilan', icone: 'clip' },
  { key: 'anoter', titre: 'Séances à noter', description: 'Les journées que l’indice ne mesure pas encore', icone: 'clip' },
  { key: 'patterns', titre: 'Patterns', description: 'Les liens entre douleur et entraînement', icone: 'chart' },
  { key: 'dossards', titre: 'Dossards passés', description: 'Les courses courues, leurs chronos et le mot du coach', icone: 'flag' },
  { key: 'rappels', titre: 'Rappels du carnet', description: 'La raideur à 8 h, le point du soir à 23 h', icone: 'sun' },
]

const PROGRAMME: Rubrique[] = [
  { key: 'contraintes', titre: 'Contraintes', description: 'Les règles non négociables du plan', icone: 'alert' },
  { key: 'structure', titre: 'Structure des 34 semaines', description: 'Les cinq blocs, de la reprise à l’affûtage', icone: 'clip' },
  { key: 'indice', titre: 'Indice de charge du tendon', description: 'Les bandes et le détail du calcul', icone: 'chart' },
]

const PARAMETRES: Rubrique[] = [
  { key: 'allure', titre: 'Réglages d’allure', description: 'La forme projetée et l’objectif marathon', icone: 'gauge' },
  { key: 'coeur', titre: 'Fréquence cardiaque', description: 'La FC max et les zones cardiaques', icone: 'heart' },
]

/** Les deux portes du second niveau. */
const PORTES: Array<{ key: SectionKey; titre: string; description: string; icone: IconeRubrique; rubriques: Rubrique[] }> = [
  {
    key: 'programme',
    titre: 'Informations du programme',
    description: 'Contraintes, structure des 34 semaines, indice de charge',
    icone: 'clip',
    rubriques: PROGRAMME,
  },
  {
    key: 'reglages',
    titre: 'Paramètres',
    description: 'Allures et fréquence cardiaque',
    icone: 'gauge',
    rubriques: PARAMETRES,
  },
]

const TOUTES: Rubrique[] = [
  ...PERSONNEL,
  ...PROGRAMME,
  ...PARAMETRES,
  ...PORTES.map(({ key, titre, description, icone }) => ({ key, titre, description, icone })),
]

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
  /** La liste des dossards passés, construite par `App` qui en a les données. */
  dossardsPasses?: ReactNode
  /** Les bilans des semaines terminées, construits par `App` qui en a les données. */
  bilans?: ReactNode
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
  dossardsPasses,
  bilans,
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
          <EnteteEcran titre="Profil"  />

          {/* Niveau 1 : ton suivi, une carte par rubrique. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
            {PERSONNEL.map((r) => (
              <CarteRubrique
                key={r.key}
                rubrique={r}
                onClick={() => onSection(r.key)}
                badge={r.key === 'anoter' && enRetard > 0 ? `${enRetard} en retard` : undefined}
              />
            ))}
          </div>

          {/* Niveau 2 : ce qui se lit une fois et se règle rarement. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 22 }}>
            {PORTES.map((porte) => (
              <CarteRubrique key={porte.key} rubrique={porte} discret onClick={() => onSection(porte.key)} />
            ))}
          </div>

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
                fontSize: 'var(--fs-texte)',
                color: 'var(--sur-ink-2)',
                cursor: 'pointer',
              }}
            >
              Se déconnecter
            </button>
          )}
        </div>
      </div>

      <SubPage ouvert={section != null} titre={active?.titre ?? ''} onBack={() => onSection(null)}>
        {PORTES.filter((porte) => porte.key === section).map((porte) => (
          <div key={porte.key} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {porte.rubriques.map((r) => (
              <CarteRubrique key={r.key} rubrique={r} onClick={() => onSection(r.key)} />
            ))}
          </div>
        ))}
        {section === 'contraintes' && <Constraints />}
        {section === 'indice' && <TendonIndexInfo idx={A.detail.idx} band={A.band} />}
        {section === 'allure' && <PaceSettings marathonPace={marathonPace} test3k={test3k} onSave={onSaveProfil} />}
        {section === 'coeur' && <HeartRateZones hrMax={hrMax} onSave={onSaveProfil} />}
        {section === 'structure' && <PlanStructure />}
        {section === 'rappels' && <Reminders userId={userId} />}
        {section === 'anoter' && <ANoter seances={aNoter} onOuvrir={onOuvrirSeance} />}
        {section === 'patterns' && <Patterns carnet={carnet} />}
        {section === 'dossards' && dossardsPasses}
        {section === 'bilans' && bilans}
      </SubPage>
    </>
  )
}

/** Une rubrique du profil : icône, titre, une ligne de description. */
function CarteRubrique({
  rubrique: r,
  onClick,
  badge,
  discret = false,
}: {
  rubrique: { titre: string; description: string; icone: IconeRubrique }
  onClick: () => void
  badge?: string
  /** Les portes du second niveau : même carte, sans le rond d'icône plein. */
  discret?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="carte"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        textAlign: 'left',
        color: 'inherit',
        borderRadius: 22,
        padding: '16px 16px',
        cursor: 'pointer',
        background: discret ? 'transparent' : undefined,
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
          background: discret ? 'transparent' : 'var(--surface-2)',
          border: discret ? '1px solid var(--border-2)' : 'none',
          color: 'var(--ink-2)',
        }}
      >
        <Icon name={r.icone} size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b className="display" style={{ display: 'block', fontSize: 'var(--fs-t-liste)', fontWeight: 400, lineHeight: 1.2 }}>
          {r.titre}
        </b>
        <span style={{ display: 'block', color: 'var(--sur-ink-2)', fontSize: 'var(--fs-meta)', marginTop: 2 }}>
          {r.description}
        </span>
      </div>
      {badge && <span className="tag-adapte">{badge}</span>}
      <Icon name="chevronRight" size={18} style={{ color: 'var(--sur-ink-3)', flex: 'none', strokeWidth: 1.7 }} />
    </button>
  )
}
