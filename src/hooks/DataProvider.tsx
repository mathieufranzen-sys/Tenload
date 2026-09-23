/**
 * Source unique des données distantes.
 *
 * Les cinq écrans ont besoin des mêmes lignes au même moment — l'indice croise
 * le journal, les activités et les ressentis de séance — donc un seul
 * chargement partagé plutôt que cinq hooks qui fetchent chacun de leur côté.
 * Les hooks `useProfile`, `useLogs`, `useFeedback`, `useActivities` ne font que
 * lire dans ce contexte.
 *
 * Chaque table est mise en cache dans localStorage et hydratée de façon
 * synchrone au montage : l'app affiche tes vraies données hors ligne, pas les
 * seeds, dès la deuxième ouverture. Le réseau vient ensuite rafraîchir derrière.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import type { DailyLogRow, FeedbackRow } from '../lib/buildPain'
import type { EcartPatch, EcartRow } from '../lib/overrides'
import type { DossardRow } from '../lib/dossards'
import { cleJour, cleSeance, empiler, vider, type Ecriture, type TableEcrivable } from '../lib/offlineQueue'

export interface ProfilRow {
  id: string
  marathon_pace_s: number
  fitness_pace_s: number
  test_3k_s: number | null
  test_3k_date: string | null
  hr_max: number
  goal_label: string
  race_date: string
  plan_start: string
}

export interface ActiviteRow {
  id: number
  day: string
  sport: string
  name: string | null
  distance_m: number
  moving_s: number
  /** Dénivelé positif Strava. Sert à la VAP, absent des instantanés embarqués. */
  elevation_m: number | null
  relative_effort: number | null
}

interface DonneesDistantes {
  profil: ProfilRow | null
  logs: DailyLogRow[]
  feedback: FeedbackRow[]
  activites: ActiviteRow[]
  ecarts: EcartRow[]
  /**
   * Facultatif : les caches écrits avant l'arrivée des dossards n'ont pas ce
   * champ, et un jeu de démo peut s'en passer. Lu partout avec `?? []`.
   */
  dossards?: DossardRow[]
}

interface EtatProvider extends DonneesDistantes {
  /**
   * La table `dossards` n'existe pas encore en base : `supabase/dossards.sql`
   * n'a pas été exécuté. L'écran le dit au lieu d'accepter des saisies qui
   * resteraient bloquées dans la file d'attente.
   */
  dossardsIndisponibles: boolean
  enregistrerDossard: (ligne: DossardRow) => void
  /** Premier chargement en cours, sans aucune donnée — même pas de cache. */
  chargement: boolean
  erreur: string | null
  actualiser: () => void
  enregistrerLog: (day: string, patch: Partial<Omit<DailyLogRow, 'day'>>) => void
  enregistrerFeedback: (ligne: FeedbackRow) => void
  enregistrerProfil: (patch: Partial<Omit<ProfilRow, 'id'>>) => void
  enregistrerEcart: (
    week: number,
    dayIndex: number,
    slot: number,
    patch: EcartPatch,
    reason?: string | null,
  ) => void
}

const VIDE: DonneesDistantes = { profil: null, logs: [], feedback: [], activites: [], ecarts: [] }
// v2 : `ecarts` s'ajoute aux quatre tables. Changer la clé plutôt que migrer —
// le cache se reconstruit au premier chargement en ligne.
const CLE_CACHE = 'tendo.cache-distant.v2'

/** Repli si le profil n'a pas encore été chargé — mêmes valeurs par défaut que schema.sql. */
const PROFIL_VIDE = (id: string): ProfilRow => ({
  id,
  marathon_pace_s: 277,
  fitness_pace_s: 289,
  test_3k_s: null,
  test_3k_date: null,
  hr_max: 183,
  goal_label: '3 h 15',
  race_date: '2027-04-11',
  plan_start: '2026-08-10',
})

const LIGNE_VIDE: Omit<DailyLogRow, 'day'> = {
  pain_wake: null,
  pain_effort: null,
  pain_evening: null,
  eccentric: false,
  icing: false,
  jumps: false,
}

/** Colonne(s) qui identifient une ligne existante, une par table écrivable. */
const CONFLIT: Record<TableEcrivable, string> = {
  daily_logs: 'user_id,day',
  session_feedback: 'user_id,week,day_index,slot',
  profiles: 'id',
  plan_overrides: 'user_id,week,day_index,slot',
  dossards: 'user_id,id',
}

function lireCache(): DonneesDistantes | null {
  try {
    const brut = localStorage.getItem(CLE_CACHE)
    return brut ? (JSON.parse(brut) as DonneesDistantes) : null
  } catch {
    return null
  }
}

function ecrireCache(d: DonneesDistantes): void {
  try {
    localStorage.setItem(CLE_CACHE, JSON.stringify(d))
  } catch {
    // Quota plein : tant pis, le cache reste en mémoire pour cette session.
  }
}

const Contexte = createContext<EtatProvider | null>(null)

export function DataProvider({
  userId,
  demo,
  children,
}: {
  userId: string
  /**
   * Jeu de départ pour la démonstration. Quand il est fourni, le provider ne
   * parle plus au réseau : il sert ces données, accepte les saisies en mémoire
   * pour que l'indice réagisse sous les doigts du visiteur, et n'écrit ni dans
   * le cache ni dans la file d'attente. Rien ne sort de l'onglet.
   */
  demo?: DonneesDistantes
  children: ReactNode
}) {
  const [donnees, setDonnees] = useState<DonneesDistantes>(() => demo ?? lireCache() ?? VIDE)
  const [chargement, setChargement] = useState(() => !demo && lireCache() === null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [dossardsIndisponibles, setDossardsIndisponibles] = useState(false)
  const [version, setVersion] = useState(0)

  const actualiser = useCallback(() => setVersion((v) => v + 1), [])

  /** Envoie une écriture en attente. Signature attendue par `vider`. */
  const envoyer = useCallback(async (e: Ecriture): Promise<boolean> => {
    if (!supabase) return false
    const { error } = await supabase.from(e.table).upsert(e.valeurs, { onConflict: CONFLIT[e.table] })
    return !error
  }, [])

  /** Rejoue la file. Best-effort : un échec reste en attente pour le prochain appel. */
  const viderFile = useCallback(() => {
    vider(envoyer)
  }, [envoyer])

  useEffect(() => {
    // En démonstration, les données sont déjà là et il n'y a pas de compte
    // derrière : aucun appel réseau n'aurait de sens.
    if (!supabase || demo) return
    let vivant = true

    const requetes = () =>
      Promise.all([
        // `maybeSingle` et non `single` : un profil absent est un état normal
        // au tout premier lancement, pas une erreur. `single` renvoyait
        // PGRST116 et déclenchait la bannière « synchronisation en échec »
        // alors que tout allait bien.
        supabase!.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase!.from('daily_logs').select('*').eq('user_id', userId).order('day'),
        supabase!.from('session_feedback').select('*').eq('user_id', userId).order('day'),
        supabase!.from('activities').select('*').eq('user_id', userId).order('day'),
        supabase!.from('plan_overrides').select('*').eq('user_id', userId).order('week'),
        supabase!.from('dossards').select('*').eq('user_id', userId).order('day'),
      ])

    async function charger() {
      let [profil, logs, feedback, activites, ecarts, dossards] = await requetes()

      // Au démarrage à froid, le jeton d'accès peut encore être en cours de
      // rafraîchissement quand ces requêtes partent : elles reviennent alors
      // en 401 une fois, puis passent. Un seul essai supplémentaire suffit à
      // supprimer la bannière qui obligeait à relancer l'app.
      if (vivant && [profil, logs, feedback, activites, ecarts].some((r) => r.error)) {
        await new Promise((r) => setTimeout(r, 700))
        if (vivant) [profil, logs, feedback, activites, ecarts, dossards] = await requetes()
      }

      if (!vivant) return

      // Une seule des cinq en échec ne doit pas priver l'app des quatre autres :
      // mieux vaut un indice calculé sur des données partielles qu'un écran vide.
      const premierEchec = [profil, logs, feedback, activites, ecarts].find((r) => r.error)
      if (premierEchec?.error) setErreur(premierEchec.error.message)
      else setErreur(null)

      // La table des dossards est la seule qui peut manquer sans que rien ne
      // soit cassé : elle arrive avec un script à part. Son absence ne doit
      // pas allumer la bannière de synchronisation en échec.
      const tableAbsente =
        dossards.error != null && /does not exist|schema cache|42P01|PGRST205/i.test(
          `${dossards.error.code ?? ''} ${dossards.error.message}`,
        )
      setDossardsIndisponibles(tableAbsente)
      if (dossards.error && !tableAbsente && !premierEchec) setErreur(dossards.error.message)

      const suivant: DonneesDistantes = {
        profil: (profil.data as ProfilRow | null) ?? donnees.profil,
        logs: (logs.data as DailyLogRow[] | null) ?? donnees.logs,
        feedback: (feedback.data as FeedbackRow[] | null) ?? donnees.feedback,
        activites: (activites.data as ActiviteRow[] | null) ?? donnees.activites,
        ecarts: (ecarts.data as EcartRow[] | null) ?? donnees.ecarts,
        dossards: (dossards.data as DossardRow[] | null) ?? donnees.dossards ?? [],
      }
      setDonnees(suivant)
      ecrireCache(suivant)
      setChargement(false)
    }

    charger()
    return () => {
      vivant = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, version])

  // Un retour en ligne, ou un retour au premier plan sur le téléphone, vide la
  // file d'attente et redemande les données : c'est le moment le plus probable
  // pour un écart entre ce que l'appareil croit avoir envoyé et la base.
  useEffect(() => {
    if (demo) return
    const surRetour = () => {
      viderFile()
      actualiser()
    }
    const surVisibilite = () => {
      if (document.visibilityState === 'visible') surRetour()
    }
    window.addEventListener('online', surRetour)
    document.addEventListener('visibilitychange', surVisibilite)
    // Vidage au montage : une écriture peut être restée en attente d'une
    // session précédente fermée hors ligne.
    viderFile()
    return () => {
      window.removeEventListener('online', surRetour)
      document.removeEventListener('visibilitychange', surVisibilite)
    }
  }, [actualiser, viderFile])

  /**
   * Écriture optimiste sur le journal du jour : l'état local et le cache
   * changent tout de suite, la ligne part dans la file d'attente derrière.
   * `patch` ne porte que les champs modifiés — le reste de la ligne, déjà
   * connu localement, est préservé.
   */
  const enregistrerLog = useCallback(
    (day: string, patch: Partial<Omit<DailyLogRow, 'day'>>) => {
      setDonnees((d) => {
        const i = d.logs.findIndex((l) => l.day === day)
        const ligne: DailyLogRow = { ...(i === -1 ? { day, ...LIGNE_VIDE } : d.logs[i]), ...patch }
        const logs = i === -1 ? [...d.logs, ligne] : d.logs.map((l, idx) => (idx === i ? ligne : l))
        const suivant = { ...d, logs }
        if (!demo) ecrireCache(suivant)
        return suivant
      })
      if (!demo) empiler({
        table: 'daily_logs',
        cle: cleJour(day),
        valeurs: { user_id: userId, day, ...patch },
        maj: Date.now(),
      })
      if (!demo) viderFile()
    },
    [userId, viderFile],
  )

  /**
   * Écriture optimiste d'un ressenti de séance. Contrairement au journal, la
   * ligne part toujours complète : le formulaire ne se sauvegarde qu'une fois
   * les deux curseurs renseignés, pas de fusion partielle à faire ici.
   */
  const enregistrerFeedback = useCallback(
    (ligne: FeedbackRow) => {
      setDonnees((d) => {
        const i = d.feedback.findIndex(
          (f) => f.week === ligne.week && f.day_index === ligne.day_index && f.slot === ligne.slot,
        )
        const feedback = i === -1 ? [...d.feedback, ligne] : d.feedback.map((f, idx) => (idx === i ? ligne : f))
        const suivant = { ...d, feedback }
        if (!demo) ecrireCache(suivant)
        return suivant
      })
      if (!demo) empiler({
        table: 'session_feedback',
        cle: cleSeance(ligne.week, ligne.day_index, ligne.slot),
        valeurs: { user_id: userId, ...ligne },
        maj: Date.now(),
      })
      if (!demo) viderFile()
    },
    [userId, viderFile],
  )

  /**
   * Écriture optimiste du profil : allure objectif, forme projetée, dernier
   * test de 3 km. `patch` ne porte que les champs modifiés.
   */
  const enregistrerProfil = useCallback(
    (patch: Partial<Omit<ProfilRow, 'id'>>) => {
      setDonnees((d) => {
        const profil: ProfilRow = { ...(d.profil ?? PROFIL_VIDE(userId)), ...patch }
        const suivant = { ...d, profil }
        if (!demo) ecrireCache(suivant)
        return suivant
      })
      if (!demo) empiler({
        table: 'profiles',
        cle: userId,
        valeurs: { id: userId, ...patch },
        maj: Date.now(),
      })
      if (!demo) viderFile()
    },
    [userId, viderFile],
  )

  /**
   * Écriture optimiste d'un écart volontaire.
   *
   * Un patch vide vaut « retour au plan » : la ligne reste en base avec un
   * patch neutre plutôt que d'être supprimée. C'est ce qui garde toutes les
   * écritures idempotentes, donc rejouables telles quelles par la file
   * d'attente — une suppression ne se rejoue pas sans risque.
   */
  const enregistrerEcart = useCallback(
    (week: number, dayIndex: number, slot: number, patch: EcartPatch, reason: string | null = null) => {
      const ligne: EcartRow = { week, day_index: dayIndex, slot, patch, reason }
      setDonnees((d) => {
        const i = d.ecarts.findIndex(
          (e) => e.week === week && e.day_index === dayIndex && e.slot === slot,
        )
        const ecarts = i === -1 ? [...d.ecarts, ligne] : d.ecarts.map((e, idx) => (idx === i ? ligne : e))
        const suivant = { ...d, ecarts }
        if (!demo) ecrireCache(suivant)
        return suivant
      })
      if (!demo) empiler({
        table: 'plan_overrides',
        cle: cleSeance(week, dayIndex, slot),
        valeurs: { user_id: userId, week, day_index: dayIndex, slot, patch, reason },
        maj: Date.now(),
      })
      if (!demo) viderFile()
    },
    [userId, viderFile],
  )

  /**
   * Écriture optimiste d'un dossard. La ligne part toujours complète, et une
   * suppression est un drapeau `supprime` : un upsert se rejoue, un DELETE non.
   */
  const enregistrerDossard = useCallback(
    (ligne: DossardRow) => {
      setDonnees((d) => {
        const liste = d.dossards ?? []
        const i = liste.findIndex((x) => x.id === ligne.id)
        const dossards = i === -1 ? [...liste, ligne] : liste.map((x, idx) => (idx === i ? ligne : x))
        const suivant = { ...d, dossards }
        if (!demo) ecrireCache(suivant)
        return suivant
      })
      if (!demo) empiler({
        table: 'dossards',
        cle: ligne.id,
        valeurs: { user_id: userId, ...ligne, updated_at: new Date().toISOString() },
        maj: Date.now(),
      })
      if (!demo) viderFile()
    },
    [userId, viderFile],
  )

  const valeur = useMemo<EtatProvider>(
    () => ({
      ...donnees,
      chargement,
      erreur,
      dossardsIndisponibles,
      enregistrerDossard,
      actualiser,
      enregistrerLog,
      enregistrerFeedback,
      enregistrerProfil,
      enregistrerEcart,
    }),
    [
      donnees,
      chargement,
      erreur,
      dossardsIndisponibles,
      enregistrerDossard,
      actualiser,
      enregistrerLog,
      enregistrerFeedback,
      enregistrerProfil,
      enregistrerEcart,
    ],
  )

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

function useDonnees(): EtatProvider {
  const ctx = useContext(Contexte)
  if (!ctx) throw new Error('useDonnees doit être appelé sous <DataProvider>.')
  return ctx
}

/** Les dossards ajoutés, et l'objectif de ceux du plan. */
export function useDossards() {
  const { dossards, dossardsIndisponibles, enregistrerDossard } = useDonnees()
  return { dossards: dossards ?? [], indisponibles: dossardsIndisponibles, enregistrerDossard }
}

export function useProfile() {
  const { profil, chargement, erreur, actualiser, enregistrerProfil } = useDonnees()
  return { profil, chargement, erreur, actualiser, enregistrerProfil }
}

export function useLogs() {
  const { logs, chargement, erreur, actualiser } = useDonnees()
  return { logs, chargement, erreur, actualiser }
}

/** Lecture et écriture du carnet du jour : raideur, douleur, gestes protecteurs. */
export function useJournal() {
  const { logs, enregistrerLog } = useDonnees()
  const ligne = useCallback(
    (day: string): DailyLogRow | null => logs.find((l) => l.day === day) ?? null,
    [logs],
  )
  return { ligne, enregistrerLog }
}

export function useFeedback() {
  const { feedback, chargement, erreur, actualiser } = useDonnees()
  return { feedback, chargement, erreur, actualiser }
}

/** Lecture et écriture du ressenti d'une séance précise. */
export function useSeanceFeedback() {
  const { feedback, enregistrerFeedback } = useDonnees()
  const pour = useCallback(
    (week: number, dayIndex: number, slot: number): FeedbackRow | null =>
      feedback.find((f) => f.week === week && f.day_index === dayIndex && f.slot === slot) ?? null,
    [feedback],
  )
  return { pour, enregistrerFeedback }
}

export function useActivities() {
  const { activites, chargement, erreur, actualiser } = useDonnees()
  return { activites, chargement, erreur, actualiser }
}

/** Lecture et écriture des écarts volontaires au plan. */
export function useEcarts() {
  const { ecarts, enregistrerEcart } = useDonnees()
  return { ecarts, enregistrerEcart }
}
