/**
 * Écran Profil, qui remplace Coach de reference/tendo-v3.html : les mêmes
 * rubriques (contraintes, indice de charge, zones cardiaques, Strava,
 * structure du plan), en liste avec sous-pages plutôt qu'en défilement
 * continu. L'export/import a été retiré : Supabase persiste déjà tout.
 */
import { useMemo, useState } from 'react'
import { adapt } from '../lib/adapt'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { FeedbackRow } from '../lib/buildPain'
import { today as todayISO } from '../lib/dates'
import { Icon } from '../components/Icon'
import { SubPage } from '../components/SubPage'
import { Constraints } from './profile/Constraints'
import { TendonIndexInfo } from './profile/TendonIndexInfo'
import { HeartRateZones } from './profile/HeartRateZones'
import { StravaStatus } from './profile/StravaStatus'
import { PlanStructure } from './profile/PlanStructure'

type SectionKey = 'contraintes' | 'indice' | 'coeur' | 'strava' | 'structure'

const SECTIONS: Array<{ key: SectionKey; titre: string; description: string }> = [
  { key: 'contraintes', titre: 'Tes contraintes', description: 'Les règles non négociables du plan' },
  { key: 'indice', titre: 'Indice de charge du tendon', description: 'Les bandes et le détail du calcul' },
  { key: 'coeur', titre: 'Zones cardiaques', description: 'Corrigées sur ta FC max réelle' },
  { key: 'strava', titre: 'Connexion Strava', description: 'Statut de la synchronisation' },
  { key: 'structure', titre: 'Structure des 35 semaines', description: 'Les cinq blocs du plan' },
]

interface Props {
  load: LoadMap
  pain: PainMap
  feedback: FeedbackRow[]
}

export function Profile({ load, pain, feedback }: Props) {
  const [section, setSection] = useState<SectionKey | null>(null)
  const now = todayISO()
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])
  const active = SECTIONS.find((s) => s.key === section)

  return (
    <>
      <div style={{ maxWidth: 'var(--shell-max)', margin: '0 auto', padding: '22px var(--page-x) 90px' }}>
        <header style={{ marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-.6px' }}>Profil</h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 14.5, fontWeight: 500, margin: '3px 0 0' }}>
            Règles du plan, calcul de l'indice, connexions
          </p>
        </header>

        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              textAlign: 'left',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 15px',
              marginBottom: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              <b style={{ display: 'block', fontSize: 15.5, fontWeight: 700, letterSpacing: '-.2px' }}>{s.titre}</b>
              <span style={{ color: 'var(--ink-2)', fontSize: 13, fontWeight: 500 }}>{s.description}</span>
            </div>
            <Icon name="chevronRight" size={18} style={{ color: 'var(--ink-3)' }} />
          </button>
        ))}
      </div>

      <SubPage ouvert={section != null} titre={active?.titre ?? ''} onBack={() => setSection(null)}>
        {section === 'contraintes' && <Constraints />}
        {section === 'indice' && <TendonIndexInfo idx={A.detail.idx} band={A.band} />}
        {section === 'coeur' && <HeartRateZones />}
        {section === 'strava' && <StravaStatus />}
        {section === 'structure' && <PlanStructure />}
      </SubPage>
    </>
  )
}
