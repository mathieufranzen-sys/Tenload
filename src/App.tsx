/**
 * Socle de l'application : authentification, chargement des données, puis la
 * navigation à cinq onglets (Aujourd'hui, Programme, Suivi, Allures, Profil).
 */
import { useEffect, useMemo, useState } from 'react'
import planJson from './data/plan.json'
import notionSeed from './data/notion-seed.json'
import stravaSeed from './data/strava-seed.json'
import type { Plan, Week } from './data/types'
import { buildLoad, buildLoadParDiscipline, type ActivityRow } from './lib/load'
import { HR_MAX } from './lib/paces'
import { buildPain, type DailyLogRow, type FeedbackRow } from './lib/buildPain'
import { indexerEcarts, type EcartPatch, type EcartRow } from './lib/overrides'
import type { SeancePlanifiee } from './lib/adapt'
import type { PainMap } from './lib/tendonIndex'
import { addDays, today } from './lib/dates'
import { isConfigured } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import { Login } from './screens/Login'
import { Today } from './screens/Today'
import { Plan as ProgrammeScreen } from './screens/Plan'
import { Track } from './screens/Track'
import { Paces } from './screens/Paces'
import { Profile } from './screens/Profile'
import { BottomNav, type Onglet } from './components/BottomNav'
import { SessionSheet } from './components/SessionSheet'
import { echangerCode, synchroniser } from './lib/strava'
import {
  DataProvider,
  useActivities,
  useFeedback,
  useLogs,
  useEcarts,
  useProfile,
  useSeanceFeedback,
  type ActiviteRow,
  type ProfilRow,
} from './hooks/DataProvider'

/**
 * Le football sert de repère Strava pour les séances d'escalade — il n'existe
 * pas de sport dédié dans l'app Strava de Mathieu. Même conversion des deux
 * côtés (seed local et base) pour que la charge calculée soit identique.
 */
function versSport(sport: string): string {
  return sport === 'Soccer' ? 'Climb' : sport
}

const plan = planJson as unknown as Plan

/**
 * Porte d'entrée. Sans configuration Supabase, l'app reste ouverte sur les
 * instantanés embarqués : `npm run dev` doit fonctionner sans .env.local. Une
 * fois configurée, elle exige une connexion et lit tout depuis Supabase.
 */
export function App() {
  const auth = useAuth()
  if (!isConfigured) return <Coquille />
  if (auth.state === 'loading') return null
  if (auth.state === 'signedOut') return <Login auth={auth} />
  return (
    <DataProvider userId={auth.user!.id}>
      <CoquilleConnectee onDeconnexion={auth.deconnexion} />
    </DataProvider>
  )
}

function CoquilleConnectee({ onDeconnexion }: { onDeconnexion: () => void }) {
  const { logs, chargement: chargeLogs, erreur } = useLogs()
  const { feedback, chargement: chargeFeedback } = useFeedback()
  const { activites, chargement: chargeActivites } = useActivities()
  const { profil, enregistrerProfil } = useProfile()
  const { enregistrerFeedback } = useSeanceFeedback()
  const { ecarts, enregistrerEcart } = useEcarts()

  const activities: ActivityRow[] = useMemo(
    () =>
      (activites as ActiviteRow[]).map((a) => ({
        day: a.day,
        sport: versSport(a.sport),
        name: a.name,
        distance_m: a.distance_m,
        moving_s: a.moving_s,
        elevation_m: a.elevation_m,
        relative_effort: a.relative_effort,
      })),
    [activites],
  )
  const pain = useMemo(() => buildPain({ logs, feedback }), [logs, feedback])

  if (chargeLogs || chargeFeedback || chargeActivites) return null

  return (
    <Coquille
      activities={activities}
      pain={pain}
      logs={logs}
      feedback={feedback}
      profil={profil}
      ecarts={ecarts}
      journalActif
      erreurSync={erreur}
      onSaveFeedback={enregistrerFeedback}
      onSaveProfil={enregistrerProfil}
      onSaveEcart={enregistrerEcart}
      onDeconnexion={onDeconnexion}
    />
  )
}

/** Instantanés embarqués : ils font tourner l'app avant tout branchement Supabase. */
function seedData() {
  const activities: ActivityRow[] = (
    stravaSeed as Array<{
      date: string
      sport: string
      name: string
      km: number
      min: number
      eff: number
      dplus?: number
    }>
  ).map((a) => ({
    day: a.date,
    sport: versSport(a.sport),
    name: a.name,
    distance_m: a.km * 1000,
    moving_s: a.min * 60,
    elevation_m: a.dplus ?? null,
    relative_effort: a.eff,
  }))

  // Même mapping que scripts/build-seed.mjs vers `daily_logs`, pour passer par
  // buildPain() comme le mode connecté — un seul chemin de calcul, vérifié par
  // buildPain.test.ts.
  const logs: DailyLogRow[] = (
    notionSeed as Array<{
      date: string
      painWake: number | null
      painEffort: number | null
      painEvening: number | null
      icing: boolean
      jumps: boolean
      hydration: number | null
      activities: string[]
    }>
  ).map((r) => ({
    day: r.date,
    pain_wake: r.painWake,
    pain_effort: r.painEffort,
    pain_evening: r.painEvening,
    icing: r.icing,
    jumps: r.jumps,
    eccentric: (r.activities ?? []).some((a) => /renfo bas/i.test(a)),
    hydration_l: r.hydration,
  }))
  const pain = buildPain({ logs })

  return { activities, pain, logs }
}

interface SeanceOuverte {
  semaine: Week
  seance: SeancePlanifiee
}

function Coquille({
  activities,
  pain,
  logs,
  feedback = [],
  profil = null,
  ecarts: ecartsRows = [],
  journalActif = false,
  erreurSync,
  onSaveFeedback,
  onSaveProfil,
  onSaveEcart,
  onDeconnexion,
}: {
  activities?: ActivityRow[]
  pain?: PainMap
  logs?: DailyLogRow[]
  feedback?: FeedbackRow[]
  profil?: ProfilRow | null
  ecarts?: EcartRow[]
  journalActif?: boolean
  erreurSync?: string | null
  /** Absent en mode instantanés : il n'y a alors pas de session à fermer. */
  onDeconnexion?: () => void
  /** Absent en mode instantanés : la feuille de séance reste alors en lecture seule. */
  onSaveFeedback?: (ligne: FeedbackRow) => void
  /** Absent en mode instantanés : les réglages d'allure restent alors en lecture seule. */
  onSaveProfil?: (patch: Partial<Omit<ProfilRow, 'id'>>) => void
  /** Absent en mode instantanés : le plan n'est alors pas modifiable. */
  onSaveEcart?: (
    week: number,
    dayIndex: number,
    slot: number,
    patch: EcartPatch,
    reason?: string | null,
  ) => void
}) {
  const seed = useMemo(seedData, [])
  const data = activities && pain && logs ? { activities, pain, logs } : seed

  // Ancre unique de toutes les allures : le profil s'il existe, sinon la
  // valeur de référence du plan. Changer l'objectif dans Allures recalcule
  // tous les écrans qui reçoivent `marathonPace`.
  const marathonPace = profil?.marathon_pace_s ?? plan.meta.targetMarathonPace
  const fitnessPace = profil?.fitness_pace_s ?? plan.meta.fitnessPace
  const test3k = profil?.test_3k_s ?? plan.meta.test3k
  const goalLabel = profil?.goal_label ?? plan.meta.goalLabel
  // Repli sur la valeur mesurée du 9 août 2026, pas sur les 193 supposés par Strava.
  const hrMax = profil?.hr_max ?? HR_MAX

  const now = today()

  // Une séance sans import Strava (muscu, escalade, ou une course avant que
  // Strava soit branché) ne compte dans la charge que si son ressenti a été
  // enregistré : c'est ce qui la marque « faite ». Sans ça, elle vaut zéro
  // dans le calcul, silencieusement.
  const completed = useMemo(
    () => new Set(feedback.map((f) => `${f.week}-${f.day_index}-${f.slot}`)),
    [feedback],
  )
  // Les écarts entrent dans la charge : une séance sautée ne pèse rien, une
  // séance déplacée pèse sur son nouveau jour. L'indice projeté suit.
  const ecarts = useMemo(() => indexerEcarts(ecartsRows), [ecartsRows])

  const load = useMemo(
    () =>
      buildLoad({
        weeks: plan.weeks,
        activities: data.activities,
        completed,
        today: now,
        ecarts,
      }),
    [data.activities, completed, now, ecarts],
  )

  // Même modèle que l'indice, réparti par discipline : le graphique « Charge
  // d'entraînement par semaine » de Suivi ne doit pas lire l'effort relatif de
  // Strava, un chiffre que Strava calcule à sa façon et sans rapport avec le
  // coût que l'app donne à chaque séance.
  const loadParDiscipline = useMemo(
    () =>
      buildLoadParDiscipline({
        weeks: plan.weeks,
        activities: data.activities,
        completed,
        today: now,
        ecarts,
      }),
    [data.activities, completed, now, ecarts],
  )

  const [onglet, setOnglet] = useState<Onglet>('today')
  const [seance, setSeance] = useState<SeanceOuverte | null>(null)
  const [numeroSemaine, setNumeroSemaine] = useState(
    () => (plan.weeks.find((w) => now >= w.monday && now <= addDays(w.monday, 6)) ?? plan.weeks[0]).n,
  )
  const [banniereStrava, setBanniereStrava] = useState<{ ok: boolean; texte: string } | null>(null)

  // Retour de Strava : `?code=...` dans l'URL après l'autorisation. Nettoyée
  // tout de suite pour qu'un rechargement ne rejoue pas l'échange.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) return
    window.history.replaceState({}, '', window.location.pathname)
    ;(async () => {
      const r = await echangerCode(code)
      if (!r.ok) {
        setBanniereStrava({ ok: false, texte: r.erreur ?? "La connexion Strava a échoué." })
        return
      }
      const s = await synchroniser()
      setBanniereStrava(
        s.ok
          ? { ok: true, texte: `Strava connecté${s.importees != null ? ` · ${s.importees} activités importées` : ''}.` }
          : { ok: false, texte: `Connecté, mais la première synchro a échoué : ${s.erreur ?? ''}` },
      )
    })()
  }, [])

  const feedbackOuvert = seance
    ? (feedback.find(
        (f) =>
          f.week === seance.semaine.n &&
          f.day_index === seance.seance.jourOrigine &&
          f.slot === seance.seance.slot,
      ) ?? null)
    : null

  return (
    <>
      {!isConfigured && <BandeauSeed />}
      {erreurSync && <BandeauErreur />}
      {banniereStrava && <BandeauStrava ok={banniereStrava.ok} texte={banniereStrava.texte} onFermer={() => setBanniereStrava(null)} />}

      {onglet === 'today' && (
        <Today
          load={load}
          pain={data.pain}
          feedback={feedback}
          activities={data.activities}
          ecarts={ecarts}
          marathonPace={marathonPace}
          journalActif={journalActif}
          onVoirSuivi={() => setOnglet('track')}
          onOuvrirSeance={(semaine, seance) => setSeance({ semaine, seance })}
          onOuvrirProfil={() => setOnglet('profile')}
        />
      )}
      {onglet === 'plan' && (
        <ProgrammeScreen
          load={load}
          pain={data.pain}
          feedback={feedback}
          ecarts={ecarts}
          marathonPace={marathonPace}
          numeroSemaine={numeroSemaine}
          onChangerSemaine={(n) => setNumeroSemaine(Math.max(1, Math.min(35, n)))}
          onOuvrirSeance={(semaine, seance) => setSeance({ semaine, seance })}
          onOuvrirProfil={() => setOnglet('profile')}
        />
      )}
      {onglet === 'track' && (
        <Track
          load={load}
          loadParDiscipline={loadParDiscipline}
          pain={data.pain}
          activities={data.activities}
          feedback={feedback}
          onOuvrirProfil={() => setOnglet('profile')}
        />
      )}
      {onglet === 'paces' && (
        <Paces
          load={load}
          pain={data.pain}
          feedback={feedback}
          marathonPace={marathonPace}
          fitnessPace={fitnessPace}
          goalLabel={goalLabel}
          hrMax={hrMax}
          onOuvrirProfil={() => setOnglet('profile')}
        />
      )}
      {onglet === 'profile' && (
        <Profile
          load={load}
          pain={data.pain}
          feedback={feedback}
          marathonPace={marathonPace}
          test3k={test3k}
          hrMax={hrMax}
          onSaveProfil={onSaveProfil}
          onDeconnexion={onDeconnexion}
        />
      )}

      <BottomNav actif={onglet} onChange={setOnglet} />

      {seance && (
        <SessionSheet
          week={seance.semaine}
          seance={seance.seance}
          ecarts={ecarts}
          feedback={feedbackOuvert}
          marathonPace={marathonPace}
          onSave={onSaveFeedback}
          onSaveEcart={onSaveEcart}
          onClose={() => setSeance(null)}
        />
      )}
    </>
  )
}

function BandeauSeed() {
  return (
    <p
      style={{
        maxWidth: 'var(--shell-max)',
        margin: '0 auto',
        background: 'var(--surface)',
        border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-sm)',
        padding: '13px 14px',
        fontSize: 13.5,
        lineHeight: 1.5,
        color: 'var(--ink-2)',
      }}
    >
      Supabase n'est pas encore branché : l'app tourne sur les instantanés embarqués et les
      saisies ne sont pas conservées.
    </p>
  )
}

function BandeauErreur() {
  return (
    <p
      style={{
        maxWidth: 'var(--shell-max)',
        margin: '0 auto',
        background: 'var(--surface)',
        border: '1px solid var(--c-inter)',
        borderRadius: 'var(--radius-sm)',
        padding: '13px 14px',
        fontSize: 13.5,
        lineHeight: 1.5,
        color: 'var(--ink-2)',
      }}
    >
      Dernière synchronisation en échec, tu vois peut-être des données un peu anciennes.
    </p>
  )
}

function BandeauStrava({ ok, texte, onFermer }: { ok: boolean; texte: string; onFermer: () => void }) {
  return (
    <div
      style={{
        maxWidth: 'var(--shell-max)',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        background: 'var(--surface)',
        border: `1px solid ${ok ? 'var(--good)' : 'var(--c-inter)'}`,
        borderRadius: 'var(--radius-sm)',
        padding: '13px 14px',
        fontSize: 13.5,
        lineHeight: 1.5,
        color: 'var(--ink-2)',
      }}
    >
      <span>{texte}</span>
      <button onClick={onFermer} style={{ color: 'var(--ink-3)', fontWeight: 700, flex: 'none' }}>
        ✕
      </button>
    </div>
  )
}

