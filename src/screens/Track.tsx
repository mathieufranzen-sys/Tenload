/**
 * Écran Suivi, porté depuis reference/tendo-v3.html (`vTrack`).
 *
 * Volontairement réduit aux quatre graphiques demandés (indice, douleur,
 * volume, charge empilée) et au protocole tendon : le tableau détaillé
 * dépliable et le paragraphe de lecture croisée restent dans la référence
 * mais n'apportent rien de plus que les graphiques pour une première passe.
 */
import { useMemo, type ReactNode } from 'react'
import planJson from '../data/plan.json'
import type { Plan } from '../data/types'
import { addDays, formatDay, formatNumber, mondayOf, today as todayISO } from '../lib/dates'
import { adapt } from '../lib/adapt'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { ActivityRow } from '../lib/load'
import type { DailyLogRow, FeedbackRow } from '../lib/buildPain'
import { IndexChart } from '../components/charts/IndexChart'
import { PainChart, type PainRow } from '../components/charts/PainChart'
import { VolumeChart, type BarRow } from '../components/charts/VolumeChart'
import { LoadChart, type StackRow } from '../components/charts/LoadChart'

const plan = planJson as unknown as Plan

interface Props {
  load: LoadMap
  pain: PainMap
  logs: DailyLogRow[]
  activities: ActivityRow[]
  feedback: FeedbackRow[]
}

const couleurDouleur = (v: number): string =>
  v <= 1 ? 'var(--good)' : v <= 3 ? 'var(--warning)' : v <= 5 ? 'var(--serious)' : 'var(--critical)'

function tendance(a: number | null, b: number | null): string {
  if (a == null || b == null) return 'pas assez de recul'
  const d = a - b
  if (Math.abs(d) < 0.2) return 'stable'
  return d < 0 ? `en baisse de ${formatNumber(Math.abs(d))}` : `en hausse de ${formatNumber(d)}`
}

export function Track({ load, pain, logs, activities, feedback }: Props) {
  const now = todayISO()
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])

  const jours = useMemo(() => Object.keys(pain).sort(), [pain])
  // Fenêtres ancrées sur le dernier jour réellement saisi, pas sur aujourd'hui :
  // si le carnet a deux jours de retard, les KPI restent lisibles plutôt que vides.
  const painRef = jours.length ? jours[jours.length - 1] : now
  const fenetre = (from: number, to: number) =>
    jours.filter((d) => d > addDays(painRef, -to) && d <= addDays(painRef, -from))
  const last7 = fenetre(0, 7)
  const prev7 = fenetre(7, 14)

  const moyenne = (liste: string[], champ: 'wake' | 'effort' | 'evening'): number | null => {
    const vs = liste.map((d) => pain[d]?.[champ]).filter((v): v is number => v != null)
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null
  }

  const reveil7 = moyenne(last7, 'wake')
  const reveilPrec7 = moyenne(prev7, 'wake')
  const soir7 = moyenne(last7, 'evening')

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

  const painRows: PainRow[] = useMemo(
    () => jours.map((d) => ({ day: d, wake: pain[d]?.wake ?? null, effort: pain[d]?.effort ?? null, evening: pain[d]?.evening ?? null })),
    [jours, pain],
  )

  const volumeRows: BarRow[] = useMemo(() => {
    const parSemaine = new Map<string, number>()
    for (const a of activities) {
      if (a.sport !== 'Run') continue
      const lundi = mondayOf(a.day)
      parSemaine.set(lundi, (parSemaine.get(lundi) ?? 0) + a.distance_m / 1000)
    }
    return [...parSemaine.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([lundi, valeur]) => ({ label: formatDay(lundi), valeur: Math.round(valeur * 10) / 10 }))
  }, [activities])

  const loadRows: StackRow[] = useMemo(() => {
    const parSemaine = new Map<string, { course: number; autres: number }>()
    for (const a of activities) {
      const lundi = mondayOf(a.day)
      const eff = a.relative_effort ?? 0
      const cur = parSemaine.get(lundi) ?? { course: 0, autres: 0 }
      if (a.sport === 'Run') cur.course += eff
      else cur.autres += eff
      parSemaine.set(lundi, cur)
    }
    return [...parSemaine.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([lundi, v]) => ({ label: formatDay(lundi), course: Math.round(v.course), autres: Math.round(v.autres) }))
  }, [activities])

  const glacage = logs.filter((l) => l.icing).length
  const sauts = logs.filter((l) => l.jumps).length
  const hydratation = logs.filter((l) => (l.hydration_l ?? 0) >= 1.5).length

  return (
    <div style={{ maxWidth: 'var(--shell-max)', margin: '0 auto', padding: '22px var(--page-x) 90px' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-.6px' }}>Suivi</h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, fontWeight: 500, margin: '3px 0 0' }}>
          Carnet tendon d'Achille · {jours.length} jour{jours.length > 1 ? 's' : ''} enregistré{jours.length > 1 ? 's' : ''}
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Kpi label="Douleur réveil · 7 j" valeur={reveil7 == null ? '—' : formatNumber(reveil7)} suffix={reveil7 == null ? '' : '/10'} couleur={reveil7 == null ? undefined : couleurDouleur(reveil7)} detail={tendance(reveil7, reveilPrec7)} />
        <Kpi label="Volume course · 7 j" valeur={formatNumber(km7)} suffix=" km" detail={`${formatNumber(km28)} km sur 28 j`} />
        <Kpi label="Douleur fin de journée" valeur={soir7 == null ? '—' : formatNumber(soir7)} suffix={soir7 == null ? '' : '/10'} couleur={soir7 == null ? undefined : couleurDouleur(soir7)} detail="le signal le plus fiable" />
        <Kpi label="Séances notées" valeur={`${feedback.length}`} suffix={` / ${totalAttendu}`} detail="depuis le 10 août" />
      </div>

      <Viz
        titre="Indice de charge du tendon"
        legende="Zéro veut dire tendon frais, cent veut dire repos obligatoire. Les points après aujourd'hui sont une projection : ce que donnerait l'indice si tu fais les séances prévues et que ta douleur reste à son niveau actuel."
      >
        <IndexChart series={idxRows} now={now} />
      </Viz>

      <Viz
        titre="Douleur au fil des jours"
        legende="Trois moments de mesure. La courbe qui compte le plus est celle de fin de journée : sur une tendinopathie, la réaction est retardée de plusieurs heures."
        legendeCouleurs={[
          { label: 'Réveil', couleur: 'var(--series-1)' },
          { label: "Pendant l'effort", couleur: 'var(--series-2)' },
          { label: 'Fin de journée', couleur: 'var(--series-3)' },
        ]}
      >
        <PainChart rows={painRows} />
      </Viz>

      <Viz
        titre="Volume de course par semaine"
        legende="Tes kilomètres réels, relevés sur Strava. Le vélo, la musculation et les randonnées n'y figurent pas : seul l'impact au sol charge le tendon."
      >
        <VolumeChart rows={volumeRows} />
      </Viz>

      <Viz
        titre="Charge d'entraînement par semaine"
        legende="L'effort relatif Strava, séparé entre la course et le reste (vélo, musculation, randonnée, foot). La part non-course est ce qui te permet de garder du volume aérobie pendant que le tendon récupère."
        legendeCouleurs={[
          { label: 'Course', couleur: 'var(--series-1)' },
          { label: 'Vélo, muscu, autres', couleur: 'var(--series-3)' },
        ]}
      >
        <LoadChart rows={loadRows} />
      </Viz>

      <Viz titre="Protocole tendon" legende={`Sur les ${jours.length} jours enregistrés. Le glaçage n'accélère pas la guérison mais calme la réaction du soir ; les sauts sont le test de charge de ton kiné.`}>
        <Meter label="Glaçage" valeur={glacage} total={jours.length} couleur="var(--series-1)" />
        <Meter label="Sauts / pliométrie" valeur={sauts} total={jours.length} couleur="var(--series-3)" />
        <Meter label="Hydratation ≥ 1,5 L" valeur={hydratation} total={jours.length} couleur="var(--series-2)" />
      </Viz>
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
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '13px 14px' }}>
      <div style={{ color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, letterSpacing: '-.1px' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.9px', marginTop: 3, lineHeight: 1.1, color: couleur }}>
        {valeur}
        <small style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>{suffix}</small>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3, color: 'var(--ink-2)' }}>{detail}</div>
    </div>
  )
}

function Viz({
  titre,
  legende,
  legendeCouleurs,
  children,
}: {
  titre: string
  legende: string
  legendeCouleurs?: Array<{ label: string; couleur: string }>
  children: ReactNode
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 17px', marginBottom: 14 }}>
      <h4 style={{ margin: '0 0 6px', fontSize: 16.5, fontWeight: 800, letterSpacing: '-.3px' }}>{titre}</h4>
      <p style={{ margin: '0 0 12px', color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.5 }}>{legende}</p>
      {children}
      {legendeCouleurs && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
          {legendeCouleurs.map((l) => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)' }}>
              <b style={{ width: 8, height: 8, borderRadius: 2, background: l.couleur, flex: 'none' }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Meter({ label, valeur, total, couleur }: { label: string; valeur: number; total: number; couleur: string }) {
  const pct = total ? Math.round((valeur / total) * 100) : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>
        <span>{label}</span>
        <b>
          {valeur} / {total} · {pct} %
        </b>
      </div>
      <div style={{ height: 6, borderRadius: 'var(--pill)', background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: couleur }} />
      </div>
    </div>
  )
}
