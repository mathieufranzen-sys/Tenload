/**
 * Écran Profil, qui remplace Coach de reference/tendo-v3.html : les mêmes
 * rubriques, en liste avec sous-pages plutôt qu'en défilement continu.
 * L'export/import a été retiré : Supabase persiste déjà tout.
 *
 * Les rubriques sont groupées par nature — ce que dit le plan, ce que dit le
 * corps, ce qui se règle. Six lignes à plat se lisaient comme un menu système,
 * sans hiérarchie.
 */
import { useMemo, useState } from 'react'
import { adapt } from '../lib/adapt'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { FeedbackRow } from '../lib/buildPain'
import { today as todayISO } from '../lib/dates'
import { Icon } from '../components/Icon'
import { SubPage } from '../components/SubPage'
import { MeshBackground } from '../components/MeshBackground'
import { Constraints } from './profile/Constraints'
import { TendonIndexInfo } from './profile/TendonIndexInfo'
import { HeartRateZones } from './profile/HeartRateZones'
import { StravaStatus } from './profile/StravaStatus'
import { PlanStructure } from './profile/PlanStructure'
import { PaceSettings } from './profile/PaceSettings'

type SectionKey = 'contraintes' | 'indice' | 'coeur' | 'strava' | 'structure' | 'allure'

type IconeRubrique = 'alert' | 'clip' | 'chart' | 'heart' | 'gauge' | 'run'

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
      { key: 'structure', titre: 'Structure des 35 semaines', description: 'Les cinq blocs du plan', icone: 'clip' },
    ],
  },
  {
    titre: 'Ton corps',
    rubriques: [
      { key: 'indice', titre: 'Indice de charge du tendon', description: 'Les bandes et le détail du calcul', icone: 'chart' },
      { key: 'coeur', titre: 'Fréquence cardiaque', description: 'Recalibre ta FC max et tes zones', icone: 'heart' },
    ],
  },
  {
    titre: 'Réglages',
    rubriques: [
      { key: 'allure', titre: 'Réglages d’allure', description: 'Recalibrer ta forme, changer l’objectif', icone: 'gauge' },
      { key: 'strava', titre: 'Connexion Strava', description: 'Statut de la synchronisation', icone: 'run' },
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
}

export function Profile({ load, pain, feedback, marathonPace, test3k, hrMax, onSaveProfil, onDeconnexion }: Props) {
  const [section, setSection] = useState<SectionKey | null>(null)
  const now = todayISO()
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])
  const active = TOUTES.find((s) => s.key === section)

  return (
    <>
      <div style={{ position: 'relative', maxWidth: 'var(--shell-max)', margin: '0 auto', paddingBottom: 90 }}>
        <MeshBackground band={A.band.key} formes={false} />

        <div style={{
        position: 'relative',
        zIndex: 5,
        padding: 'calc(22px + env(safe-area-inset-top)) var(--page-x) 0',
      }}>
          <header style={{ marginBottom: 22 }}>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 600, letterSpacing: '-.5px' }}>Profil</h1>
            <p style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 500, margin: '3px 0 0' }}>
              Règles du plan, calcul de l'indice, connexions
            </p>
          </header>

          {GROUPES.map((groupe) => (
            <section key={groupe.titre} style={{ marginBottom: 22 }}>
              <h2
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '1.3px',
                  textTransform: 'uppercase',
                  color: 'var(--sur-ink-3)',
                  margin: '0 0 10px 2px',
                }}
              >
                {groupe.titre}
              </h2>
              {groupe.rubriques.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setSection(r.key)}
                  className="glass"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    width: '100%',
                    textAlign: 'left',
                    color: 'inherit',
                    borderRadius: 18,
                    padding: '13px 14px',
                    marginBottom: 9,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 11,
                      flex: 'none',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(255,255,255,.09)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <Icon name={r.icone} size={17} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: 'block', fontSize: 15, fontWeight: 650, letterSpacing: '-.25px' }}>
                      {r.titre}
                    </b>
                    <span style={{ color: 'var(--sur-ink-2)', fontSize: 12.5, fontWeight: 500 }}>
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
              className="glass"
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                padding: 14,
                borderRadius: 'var(--pill)',
                fontSize: 14.5,
                fontWeight: 600,
                color: 'var(--sur-ink-2)',
                cursor: 'pointer',
              }}
            >
              Se déconnecter
            </button>
          )}
        </div>
      </div>

      <SubPage ouvert={section != null} titre={active?.titre ?? ''} onBack={() => setSection(null)}>
        {section === 'contraintes' && <Constraints />}
        {section === 'indice' && <TendonIndexInfo idx={A.detail.idx} band={A.band} />}
        {section === 'allure' && <PaceSettings marathonPace={marathonPace} test3k={test3k} onSave={onSaveProfil} />}
        {section === 'coeur' && <HeartRateZones hrMax={hrMax} onSave={onSaveProfil} />}
        {section === 'strava' && <StravaStatus />}
        {section === 'structure' && <PlanStructure />}
      </SubPage>
    </>
  )
}
