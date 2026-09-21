/**
 * Socle de l'application : authentification, chargement des données, puis la
 * navigation à cinq onglets (Aujourd'hui, Programme, Suivi, Allures, Profil).
 */
import { useMemo, useState } from 'react'
import planJson from './data/plan.json'
import notionSeed from './data/notion-seed.json'
import stravaSeed from './data/strava-seed.json'
import type { Plan } from './data/types'
import { buildLoad, buildLoadParDiscipline, joursAttestes, type ActivityRow } from './lib/load'
import { compterEnRetard, seancesANoter } from './lib/aNoter'
import { HR_MAX } from './lib/paces'
import { ajusterForme } from './lib/forme'
import { buildPain, type DailyLogRow, type FeedbackRow } from './lib/buildPain'
import { NOTE_DEMO, construireDemo } from './data/demo'
import { cleEcart, indexerEcarts, type EcartPatch, type EcartRow } from './lib/overrides'
import { adapt, construireContexte, weekSessions } from './lib/adapt'
import type { PainMap } from './lib/tendonIndex'
import { addDays, today } from './lib/dates'
import { isConfigured } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import { Login } from './screens/Login'
import { Today } from './screens/Today'
import { Plan as ProgrammeScreen } from './screens/Plan'
import { Track } from './screens/Track'
import { Paces } from './screens/Paces'
import { Profile, type SectionKey } from './screens/Profile'
import { BottomNav, type Onglet } from './components/BottomNav'
import { SessionSheet } from './components/SessionSheet'
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
  // Le mode démo court sur des données inventées, sans compte ni écriture.
  // Il vit dans l'état plutôt que dans l'URL : rien à partager, rien à
  // restaurer, et aucun risque d'y atterrir par un lien collé.
  const [demo, setDemo] = useState(false)

  if (demo) return <CoquilleDemo onQuitter={() => setDemo(false)} />
  if (!isConfigured) return <Coquille />
  if (auth.state === 'loading') return null
  if (auth.state === 'signedOut') return <Login auth={auth} onDemo={() => setDemo(true)} />
  return (
    <DataProvider userId={auth.user!.id}>
      <CoquilleConnectee userId={auth.user!.id} onDeconnexion={auth.deconnexion} />
    </DataProvider>
  )
}

/**
 * L'app complète sur un jeu fictif, et pleinement manipulable.
 *
 * Le visiteur peut bouger une douleur ou un effort et voir l'indice de charge
 * réagir — c'est tout l'intérêt du produit, une démonstration en lecture seule
 * n'aurait rien montré. Les saisies vivent en mémoire : le provider en mode
 * démo n'écrit ni en base, ni dans le cache, ni dans la file d'attente, et
 * tout disparaît en quittant.
 */
function CoquilleDemo({ onQuitter }: { onQuitter: () => void }) {
  const now = today()
  const jeu = useMemo(() => construireDemo(now), [now])
  const initial = useMemo(
    () => ({ profil: null, logs: jeu.logs, feedback: jeu.feedback, activites: [], ecarts: [] }),
    [jeu],
  )

  return (
    <DataProvider userId="demo" demo={initial}>
      <CoquilleDemoInterne activities={jeu.activities} onQuitter={onQuitter} />
    </DataProvider>
  )
}

function CoquilleDemoInterne({
  activities,
  onQuitter,
}: {
  activities: ActivityRow[]
  onQuitter: () => void
}) {
  const { logs } = useLogs()
  const { feedback } = useFeedback()
  const { enregistrerFeedback } = useSeanceFeedback()
  const { ecarts, enregistrerEcart } = useEcarts()
  const { profil, enregistrerProfil } = useProfile()

  // `bascule` au plus tôt : sans compte, tout le carnet de la démo est
  // considéré comme saisi dans l'app, jamais importé.
  const pain = useMemo(
    () => buildPain({ logs, feedback, bascule: '1970-01-01' }),
    [logs, feedback],
  )

  return (
    <Coquille
      activities={activities}
      pain={pain}
      logs={logs}
      feedback={feedback}
      profil={profil}
      ecarts={ecarts}
      journalActif
      demo
      onQuitterDemo={onQuitter}
      onSaveFeedback={enregistrerFeedback}
      onSaveProfil={enregistrerProfil}
      onSaveEcart={enregistrerEcart}
    />
  )
}

function CoquilleConnectee({
  userId,
  onDeconnexion,
}: {
  userId: string
  onDeconnexion: () => void
}) {
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
      userId={userId}
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

/**
 * La feuille de séance ne retient que l'IDENTITÉ de la séance, jamais la
 * séance elle-même. Un instantané se serait figé : enregistrer une donnée
 * réelle met à jour les écarts, et la feuille aurait continué d'afficher la
 * distance d'avant.
 */
interface SeanceOuverte {
  semaineN: number
  jourOrigine: number
  slot: number
}

function Coquille({
  userId,
  activities,
  pain,
  logs,
  feedback = [],
  profil = null,
  ecarts: ecartsRows = [],
  journalActif = false,
  erreurSync,
  demo = false,
  onQuitterDemo,
  onSaveFeedback,
  onSaveProfil,
  onSaveEcart,
  onDeconnexion,
}: {
  /** Absent en démo et en mode instantanés : rien à abonner aux rappels alors. */
  userId?: string
  /** Vrai en démonstration : bannière dédiée, et rien n'est enregistré. */
  demo?: boolean
  onQuitterDemo?: () => void
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
  const fitnessPaceTest = profil?.fitness_pace_s ?? plan.meta.fitnessPace
  const test3k = profil?.test_3k_s ?? plan.meta.test3k
  const goalLabel = profil?.goal_label ?? plan.meta.goalLabel
  // Repli sur la valeur mesurée du 9 août 2026, pas sur les 193 supposés par Strava.
  const hrMax = profil?.hr_max ?? HR_MAX

  const now = today()

  // Le test de 3 km ancre la forme, le ressenti la fait vivre entre deux
  // tests — qui sont rares, un par bloc au mieux. L'écart est borné à
  // ±15 s/km : le ressenti nuance la mesure, il ne la remplace pas.
  const forme = useMemo(() => ajusterForme(fitnessPaceTest, feedback, now), [fitnessPaceTest, feedback, now])
  const fitnessPace = forme.allure

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

  const entreeCharge = useMemo(
    () => ({ weeks: plan.weeks, activities: data.activities, completed, today: now, ecarts }),
    [data.activities, completed, now, ecarts],
  )

  const load = useMemo(() => buildLoad(entreeCharge), [entreeCharge])

  // Les jours dont la charge est une mesure, et non un silence. Sans eux,
  // l'indice lit un carnet muet comme une semaine légère.
  const attestes = useMemo(() => joursAttestes(entreeCharge), [entreeCharge])

  // Même modèle que l'indice, réparti par discipline : le graphique « Charge
  // d'entraînement par semaine » de Suivi ne doit pas lire l'effort relatif de
  // Strava, un chiffre que Strava calcule à sa façon et sans rapport avec le
  // coût que l'app donne à chaque séance.
  const loadParDiscipline = useMemo(
    () => buildLoadParDiscipline(entreeCharge),
    [entreeCharge],
  )

  const [onglet, setOnglet] = useState<Onglet>('today')
  /** Sous-page du Profil, pilotée ici : Suivi doit pouvoir y envoyer droit. */
  const [sectionProfil, setSectionProfil] = useState<SectionKey | null>(null)

  // Les séances sans ressenti. Elles sont la cause directe de `chargeInconnue`
  // et du plafond de confiance : les lister, c'est donner le chemin pour les
  // faire disparaître.
  const aNoter = useMemo(
    () =>
      seancesANoter({
        weeks: plan.weeks,
        notees: completed,
        now,
        ecarts,
        joursAvecActivite: new Set(data.activities.map((a) => a.day)),
      }),
    [completed, now, ecarts, data.activities],
  )
  const notesEnRetard = compterEnRetard(aNoter)
  const [seance, setSeance] = useState<SeanceOuverte | null>(null)
  /** Séance à mettre en avant dans la vue calendrier, après « Déplacer ». */
  const [focusSeance, setFocusSeance] = useState<{ cle: string; jeton: number } | null>(null)
  const [numeroSemaine, setNumeroSemaine] = useState(
    () => (plan.weeks.find((w) => now >= w.monday && now <= addDays(w.monday, 6)) ?? plan.weeks[0]).n,
  )
  // Recalculée à chaque rendu depuis les données courantes : c'est ce qui fait
  // que la feuille suit un écart enregistré depuis elle-même.
  const A = useMemo(
    () => adapt(load, data.pain, feedback, now, attestes),
    [load, data.pain, feedback, now, attestes],
  )
  const contexte = useMemo(
    () => construireContexte(plan.weeks, feedback, data.pain, now, ecarts),
    [feedback, data.pain, now, ecarts],
  )
  const ouverte = useMemo(() => {
    if (!seance) return null
    const semaine = plan.weeks.find((w) => w.n === seance.semaineN)
    if (!semaine) return null
    const x = weekSessions(semaine, now, A.byDate, ecarts, contexte).find(
      (v) => v.jourOrigine === seance.jourOrigine && v.slot === seance.slot,
    )
    return x ? { semaine, seance: x } : null
  }, [seance, now, A.byDate, ecarts, contexte])

  const feedbackOuvert = seance
    ? (feedback.find(
        (f) =>
          f.week === seance.semaineN &&
          f.day_index === seance.jourOrigine &&
          f.slot === seance.slot,
      ) ?? null)
    : null

  return (
    <>
      {demo && <BandeauDemo onQuitter={onQuitterDemo} />}
      {!demo && !isConfigured && <BandeauSeed />}
      {erreurSync && <BandeauErreur />}

      {onglet === 'today' && (
        <Today
          load={load}
          pain={data.pain}
          feedback={feedback}
          activities={data.activities}
          ecarts={ecarts}
          attestes={attestes}
          forme={forme}
          marathonPace={marathonPace}
          journalActif={journalActif}
          onVoirSuivi={() => setOnglet('track')}
          onOuvrirSeance={(x) =>
            setSeance({ semaineN: x.semaineOrigine, jourOrigine: x.jourOrigine, slot: x.slot })
          }
          onOuvrirProfil={() => setOnglet('profile')}
          aNoter={aNoter}
          onVoirANoter={() => {
            setSectionProfil('anoter')
            setOnglet('profile')
          }}
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
          onChangerSemaine={(n) => setNumeroSemaine(Math.max(1, Math.min(plan.weeks.length, n)))}
          onOuvrirSeance={(x) =>
            setSeance({ semaineN: x.semaineOrigine, jourOrigine: x.jourOrigine, slot: x.slot })
          }
          onSaveEcart={onSaveEcart}
          focusSeance={focusSeance?.cle ?? null}
          jetonFocus={focusSeance?.jeton}
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
          notesEnRetard={notesEnRetard}
          onVoirANoter={() => {
            setSectionProfil('anoter')
            setOnglet('profile')
          }}
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
          forme={forme}
          goalLabel={goalLabel}
          hrMax={hrMax}
          onOuvrirProfil={() => setOnglet('profile')}
        />
      )}
      {onglet === 'profile' && (
        <Profile
          userId={userId}
          load={load}
          pain={data.pain}
          feedback={feedback}
          marathonPace={marathonPace}
          test3k={test3k}
          hrMax={hrMax}
          onSaveProfil={onSaveProfil}
          onDeconnexion={onDeconnexion}
          aNoter={aNoter}
          ecarts={ecarts}
          activities={data.activities}
          section={sectionProfil}
          onSection={setSectionProfil}
          onOuvrirSeance={
            onSaveFeedback &&
            ((x) => setSeance({ semaineN: x.semaineOrigine, jourOrigine: x.jourOrigine, slot: x.slot }))
          }
        />
      )}

      <BottomNav actif={onglet} onChange={setOnglet} />

      {ouverte && (
        <SessionSheet
          week={ouverte.semaine}
          seance={ouverte.seance}
          ecarts={ecarts}
          feedback={feedbackOuvert}
          marathonPace={marathonPace}
          onSave={onSaveFeedback}
          onSaveEcart={onSaveEcart}
          onDeplacer={(x) => {
            setFocusSeance((f) => ({
              cle: cleEcart(x.semaineOrigine, x.jourOrigine, x.slot),
              jeton: (f?.jeton ?? 0) + 1,
            }))
            setNumeroSemaine(x.semaineOrigine)
            setSeance(null)
            setOnglet('plan')
          }}
          formeActuelle={fitnessPaceTest}
          onRecalibrerForme={onSaveProfil && ((allure) => onSaveProfil({ fitness_pace_s: allure }))}
          onClose={() => setSeance(null)}
        />
      )}
    </>
  )
}

function BandeauDemo({ onQuitter }: { onQuitter?: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        maxWidth: 'var(--shell-max)',
        margin: '0 auto',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-sm)',
        padding: '11px 12px',
        fontSize: 13,
        lineHeight: 1.45,
        color: 'var(--ink-2)',
      }}
    >
      <span style={{ flex: 1 }}>{NOTE_DEMO}</span>
      {onQuitter && (
        <button
          onClick={onQuitter}
          style={{
            flex: 'none',
            padding: '6px 12px',
            borderRadius: 'var(--pill)',
            border: 'none',
            background: 'var(--pale)',
            color: 'var(--pale-ink)',
            fontSize: 12.5,
            fontWeight: 650,
            cursor: 'pointer',
          }}
        >
          Quitter
        </button>
      )}
    </div>
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
        border: '1px solid var(--c-erreur)',
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


