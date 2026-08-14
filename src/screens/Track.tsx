/**
 * Écran Suivi, porté depuis reference/tendo-v3.html (`vTrack`).
 *
 * Quatre graphiques, deux d'entre eux avec une bascule de lecture : la douleur
 * en trois moments ou en cumul, le volume en course seule ou avec le vélo.
 * Le bloc « Protocole tendon » de la référence a été retiré à la demande de
 * Mathieu — les gestes protecteurs se saisissent dans Aujourd'hui et pèsent
 * dans l'indice, un décompte de plus n'apportait rien.
 */
import { useMemo, useState, type ReactNode } from 'react'
import planJson from '../data/plan.json'
import type { Plan } from '../data/types'
import { addDays, formatDay, formatNumber, mondayOf, today as todayISO } from '../lib/dates'
import { adapt } from '../lib/adapt'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { ActivityRow } from '../lib/load'
import type { FeedbackRow } from '../lib/buildPain'
import { IndexChart } from '../components/charts/IndexChart'
import { PainChart, type PainRow, type VuePain } from '../components/charts/PainChart'
import { VolumeChart, type BarRow, type VueVolume } from '../components/charts/VolumeChart'
import { LoadChart, type StackRow } from '../components/charts/LoadChart'
import { MeshBackground } from '../components/MeshBackground'
import { Segmented } from '../components/Segmented'
import { ProfileButton } from '../components/ProfileButton'

const plan = planJson as unknown as Plan

interface Props {
  load: LoadMap
  pain: PainMap
  activities: ActivityRow[]
  feedback: FeedbackRow[]
  onOuvrirProfil: () => void
}

/**
 * Catégorie qualitative, pondérée comme le modèle : la douleur de fin de
 * journée compte plus que le réveil, c'est le signal le plus fiable chez lui.
 */
function santeDuTendon(reveil: number | null, soir: number | null): { label: string; couleur?: string } {
  const vals: number[] = []
  const poids: number[] = []
  if (reveil != null) { vals.push(reveil); poids.push(0.4) }
  if (soir != null) { vals.push(soir); poids.push(0.6) }
  if (!vals.length) return { label: '—' }
  const total = poids.reduce((a, b) => a + b, 0)
  const score = vals.reduce((a, v, i) => a + v * poids[i], 0) / total
  if (score <= 1) return { label: 'Excellente', couleur: 'var(--good)' }
  if (score <= 2.5) return { label: 'Bonne', couleur: 'var(--good)' }
  if (score <= 4) return { label: 'Correcte', couleur: 'var(--warning)' }
  if (score <= 6) return { label: 'Sensible', couleur: 'var(--serious)' }
  return { label: 'Mauvaise', couleur: 'var(--critical)' }
}

export function Track({ load, pain, activities, feedback, onOuvrirProfil }: Props) {
  const now = todayISO()
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])

  const [vuePain, setVuePain] = useState<VuePain>('separee')
  const [vueVolume, setVueVolume] = useState<VueVolume>('course')

  const jours = useMemo(() => Object.keys(pain).sort(), [pain])
  // Fenêtres ancrées sur le dernier jour réellement saisi, pas sur aujourd'hui :
  // si le carnet a deux jours de retard, les KPI restent lisibles plutôt que vides.
  const painRef = jours.length ? jours[jours.length - 1] : now
  const fenetre = (from: number, to: number) =>
    jours.filter((d) => d > addDays(painRef, -to) && d <= addDays(painRef, -from))
  // Santé du tendon lit 30 jours, pas 7 : une catégorie qui bascule sur une
  // semaine chargée n'aide pas, c'est une lecture de fond qu'on veut ici.
  const last30 = fenetre(0, 30)

  const moyenne = (liste: string[], champ: 'wake' | 'effort' | 'evening'): number | null => {
    const vs = liste.map((d) => pain[d]?.[champ]).filter((v): v is number => v != null)
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null
  }

  const reveil30 = moyenne(last30, 'wake')
  const soir30 = moyenne(last30, 'evening')
  const sante = santeDuTendon(reveil30, soir30)

  const stravaRef = useMemo(() => {
    const jrs = activities.map((a) => a.day).sort()
    return jrs.length ? jrs[jrs.length - 1] : now
  }, [activities, now])
  const km = (depuis: number) =>
    activities
      .filter((a) => a.sport === 'Run' && a.day > addDays(stravaRef, -depuis))
      .reduce((s, a) => s + a.distance_m / 1000, 0)
  const km7 = km(7)
  const km28 = km(28)

  const totalAttendu = plan.weeks.reduce((acc, w) => acc + w.sessions.filter((s) => s.feedback).length, 0)

  const idxRows = useMemo(
    () =>
      Object.values(A.byDate)
        .sort((a, b) => (a.day < b.day ? -1 : 1))
        .map((r) => ({ day: r.day, idx: r.idx })),
    [A.byDate],
  )

  // Moyenne de l'indice sur les 7 derniers jours réels contre les 7 précédents :
  // on exclut la projection, sinon un plan calme à venir ferait mécaniquement
  // baisser le pourcentage sans rien dire de ce qui s'est passé.
  const idxPct = useMemo(() => {
    const passe = idxRows.filter((r) => r.day <= now)
    const moy = (l: typeof passe) => (l.length ? l.reduce((a, r) => a + r.idx, 0) / l.length : null)
    const der = moy(passe.slice(-7))
    const prec = moy(passe.slice(-14, -7))
    return der != null && prec != null && prec > 0.5 ? Math.round(((der - prec) / prec) * 100) : null
  }, [idxRows, now])

  const painRows: PainRow[] = useMemo(
    () =>
      jours.map((d) => ({
        day: d,
        wake: pain[d]?.wake ?? null,
        effort: pain[d]?.effort ?? null,
        evening: pain[d]?.evening ?? null,
      })),
    [jours, pain],
  )

  const volumeRows: BarRow[] = useMemo(() => {
    const parSemaine = new Map<string, { course: number; velo: number }>()
    for (const a of activities) {
      if (a.sport !== 'Run' && a.sport !== 'Ride') continue
      const lundi = mondayOf(a.day)
      const cur = parSemaine.get(lundi) ?? { course: 0, velo: 0 }
      if (a.sport === 'Run') cur.course += a.distance_m / 1000
      else cur.velo += a.distance_m / 1000
      parSemaine.set(lundi, cur)
    }
    return [...parSemaine.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([lundi, v]) => ({
        label: formatDay(lundi),
        course: Math.round(v.course * 10) / 10,
        velo: Math.round(v.velo * 10) / 10,
      }))
  }, [activities])

  const loadRows: StackRow[] = useMemo(() => {
    const parSemaine = new Map<string, { course: number; velo: number; autre: number }>()
    for (const a of activities) {
      const lundi = mondayOf(a.day)
      const eff = a.relative_effort ?? 0
      const cur = parSemaine.get(lundi) ?? { course: 0, velo: 0, autre: 0 }
      if (a.sport === 'Run') cur.course += eff
      else if (a.sport === 'Ride') cur.velo += eff
      else cur.autre += eff
      parSemaine.set(lundi, cur)
    }
    return [...parSemaine.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([lundi, v]) => ({
        label: formatDay(lundi),
        course: Math.round(v.course),
        velo: Math.round(v.velo),
        autre: Math.round(v.autre),
      }))
  }, [activities])

  const volumeAffiche =
    vueVolume === 'cumul'
      ? volumeRows.reduce((s, r) => s + r.course + r.velo, 0)
      : volumeRows.reduce((s, r) => s + r.course, 0)

  return (
    <div style={{ position: 'relative', maxWidth: 'var(--shell-max)', margin: '0 auto', paddingBottom: 90 }}>
      <MeshBackground band={A.band.key} />

      <div style={{ position: 'relative', zIndex: 5, padding: '22px var(--page-x) 0' }}>
        <header style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 600, letterSpacing: '-.5px' }}>Suivi</h1>
            <p style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 500, margin: '3px 0 0' }}>
              Carnet tendon d'Achille · {jours.length} jour{jours.length > 1 ? 's' : ''} enregistré
              {jours.length > 1 ? 's' : ''}
            </p>
          </div>
          <ProfileButton onClick={onOuvrirProfil} />
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
          <Kpi
            label="Charge vs semaine dernière"
            valeur={idxPct == null ? '—' : `${idxPct > 0 ? '+' : ''}${idxPct}`}
            suffix={idxPct == null ? '' : ' %'}
            couleur={idxPct == null ? undefined : idxPct > 5 ? 'var(--warning)' : idxPct < -5 ? 'var(--good)' : undefined}
            detail="moyenne de l'indice sur 7 jours"
          />
          <Kpi
            label="Volume course · 7 j"
            valeur={formatNumber(km7)}
            suffix=" km"
            detail={`${formatNumber(km28)} km sur 28 j`}
          />
          <Kpi
            label="Santé du tendon"
            valeur={sante.label}
            suffix=""
            couleur={sante.couleur}
            detail="douleur des 30 derniers jours"
          />
          <Kpi
            label="Séances notées"
            valeur={`${feedback.length}`}
            suffix={` / ${totalAttendu}`}
            detail="depuis le 10 août"
          />
        </div>

        <Viz
          titre="Indice de charge du tendon"
          legende="Zéro veut dire tendon frais, cent veut dire repos obligatoire. Les points après aujourd'hui sont une projection : ce que donnerait l'indice si tu fais les séances prévues et que ta douleur reste à son niveau actuel."
        >
          <IndexChart series={idxRows} now={now} />
        </Viz>

        <Viz
          titre="Douleur au fil des jours"
          legende={
            vuePain === 'separee'
              ? "Trois moments de mesure. La courbe qui compte le plus est celle de fin de journée : sur une tendinopathie, la réaction est retardée de plusieurs heures."
              : "La somme des trois mesures du jour, sur 30. Utile pour voir la charge douloureuse totale d'une journée, même quand aucune des trois ne semble alarmante isolément."
          }
          controle={
            <Segmented
              label="Lecture de la douleur"
              valeur={vuePain}
              onChange={setVuePain}
              options={[
                { cle: 'separee', libelle: 'Détaillé' },
                { cle: 'cumulee', libelle: 'Cumulé' },
              ]}
            />
          }
          legendeCouleurs={
            vuePain === 'separee'
              ? [
                  { label: 'Réveil', couleur: 'var(--chart-1)' },
                  { label: "Pendant l'effort", couleur: 'var(--chart-2)' },
                  { label: 'Fin de journée', couleur: 'var(--chart-3)' },
                ]
              : [{ label: 'Somme des trois mesures', couleur: 'var(--chart-2)' }]
          }
        >
          <PainChart rows={painRows} vue={vuePain} />
        </Viz>

        <Viz
          titre="Volume par semaine"
          legende={
            vueVolume === 'course'
              ? "Tes kilomètres de course, relevés sur Strava. Le vélo n'y figure pas : seul l'impact au sol charge le tendon."
              : 'Course et vélo cumulés. Le vélo ne charge pas le tendon mais porte le volume aérobie : cette lecture dit ce que le moteur encaisse, pas ce que le tendon subit.'
          }
          controle={
            <Segmented
              label="Lecture du volume"
              valeur={vueVolume}
              onChange={setVueVolume}
              options={[
                { cle: 'course', libelle: 'Course' },
                { cle: 'cumul', libelle: 'Course + vélo' },
              ]}
            />
          }
          legendeCouleurs={
            vueVolume === 'cumul'
              ? [
                  { label: 'Course', couleur: 'var(--chart-1)' },
                  { label: 'Vélo', couleur: 'var(--chart-2)' },
                ]
              : undefined
          }
          note={`${formatNumber(Math.round(volumeAffiche))} km au total sur la période`}
        >
          <VolumeChart rows={volumeRows} vue={vueVolume} />
        </Viz>

        <Viz
          titre="Charge d'entraînement par semaine"
          legende="L'effort relatif Strava, séparé par discipline. Le vélo et le reste sont ce qui te permet de garder du volume aérobie pendant que le tendon récupère."
          legendeCouleurs={[
            { label: 'Course', couleur: 'var(--chart-1)' },
            { label: 'Vélo', couleur: 'var(--chart-2)' },
            { label: 'Muscu, escalade, autres', couleur: 'var(--chart-3)' },
          ]}
        >
          <LoadChart rows={loadRows} />
        </Viz>
      </div>
    </div>
  )
}

function Kpi({
  label,
  valeur,
  suffix,
  detail,
  couleur,
}: {
  label: string
  valeur: string
  suffix: string
  detail: string
  couleur?: string
}) {
  return (
    <div className="glass" style={{ borderRadius: 17, padding: '11px 12px 10px' }}>
      <div
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '.7px',
          textTransform: 'uppercase',
          color: 'var(--sur-ink-2)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 19,
          fontWeight: 650,
          letterSpacing: '-.5px',
          marginTop: 5,
          lineHeight: 1,
          color: couleur,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {valeur}
        <small style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--sur-ink-2)' }}>{suffix}</small>
      </div>
      <div style={{ fontSize: 9, fontWeight: 500, marginTop: 5, color: 'var(--sur-ink-3)', lineHeight: 1.35 }}>
        {detail}
      </div>
    </div>
  )
}

function Viz({
  titre,
  legende,
  controle,
  legendeCouleurs,
  note,
  children,
}: {
  titre: string
  legende: string
  controle?: ReactNode
  legendeCouleurs?: Array<{ label: string; couleur: string }>
  note?: string
  children: ReactNode
}) {
  return (
    <section className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px 17px', marginBottom: 14 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, letterSpacing: '-.25px' }}>{titre}</h2>
      <p style={{ margin: '0 0 12px', color: 'var(--sur-ink-2)', fontSize: 12.5, lineHeight: 1.5 }}>{legende}</p>
      {controle && <div style={{ marginBottom: 14 }}>{controle}</div>}
      {/* Toile sombre sous le tracé : sur le verre seul, les bandes de fond de
          l'indice et la palette saturée se délavent contre le dégradé. */}
      <div style={{ background: 'rgba(6,7,10,.5)', borderRadius: 13, padding: '10px 8px 4px' }}>{children}</div>
      {(legendeCouleurs || note) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            marginTop: 10,
          }}
        >
          {legendeCouleurs?.map((l) => (
            <span
              key={l.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--sur-ink-2)',
              }}
            >
              <b style={{ width: 8, height: 8, borderRadius: 2, background: l.couleur, flex: 'none' }} />
              {l.label}
            </span>
          ))}
          {note && (
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--sur-ink-3)', marginLeft: 'auto' }}>
              {note}
            </span>
          )}
        </div>
      )}
    </section>
  )
}
