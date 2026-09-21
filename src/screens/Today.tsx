/**
 * Écran Aujourd'hui.
 *
 * Le premier écran est un dégradé plein cadre piloté par la bande de charge :
 * insights en verre, indice en arc fin, puis la séance du jour qui dépasse
 * volontairement sous la ligne de flottaison — c'est elle qui appelle le
 * scroll. Le reste (règles d'adaptation, carnet, mot du coach) suit
 * en dessous, sur le fond sombre habituel.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import planJson from '../data/plan.json'
import type { Plan, Week } from '../data/types'
import {
  DAYS_LONG,
  addDays,
  daysBetween,
  formatDay,
  formatDayLong,
  today as todayISO,
  weekdayIndex,
} from '../lib/dates'
import { adapt, construireContexte, seancesDeLaSemaine, type SeancePlanifiee } from '../lib/adapt'
import { construireInsights } from '../lib/insights'
import { motDuCoach, type SeanceDuJour, type SeanceHier, type SemaineEnCours } from '../lib/coach'
import { RPE_ATTENDU, type AjustementForme } from '../lib/forme'
import { estimateDuration } from '../lib/paces'
import { bandOf, type LoadMap, type PainMap } from '../lib/tendonIndex'
import { sessionLoad, type ActivityRow } from '../lib/load'
import type { FeedbackRow } from '../lib/buildPain'
import { slotsParJour, verifierContraintes, type EcartRow } from '../lib/overrides'
import { SessionCard } from '../components/SessionCard'
import { AlertBox } from '../components/AlertBox'
import { JournalDuJour } from '../components/JournalDuJour'
import { MeshBackground } from '../components/MeshBackground'
import { TendonArc } from '../components/TendonArc'
import { InsightTiles } from '../components/InsightTiles'
import { SessionHero } from '../components/SessionHero'
import { ChargeSheet } from '../components/ChargeSheet'
import { Icon } from '../components/Icon'
import { CarteCoach } from '../components/CarteCoach'
import { CarteBilan } from '../components/CarteBilan'
import { bilanSemaine, type FaitsBilan, type SeanceBilan } from '../lib/bilan'
import { EnteteEcran } from '../components/EnteteEcran'

const plan = planJson as unknown as Plan

/** Le 10 km Hoka, l'objectif de l'automne. */
const DIX_KM = '2026-11-15'

/**
 * Le SUJET affiché chaque jour, sur les trois derniers jours.
 * Sur l'appareil et pas en base : c'est ce que CET écran a montré qu'il ne
 * faut pas remontrer. Safari en navigation privée refuse le stockage, d'où
 * les try : sans mémoire, le coach peut se répéter, il ne doit pas planter.
 */
const CLE_MEMOIRE_COACH = 'tenload-coach'

function lireMemoireCoach(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CLE_MEMOIRE_COACH) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function ecrireMemoireCoach(jour: string, cle: string) {
  try {
    const garde = Object.entries({ ...lireMemoireCoach(), [jour]: cle })
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, 3)
    localStorage.setItem(CLE_MEMOIRE_COACH, JSON.stringify(Object.fromEntries(garde)))
  } catch {
    // Stockage refusé : on vit sans mémoire.
  }
}

interface Props {
  load: LoadMap
  pain: PainMap
  feedback: FeedbackRow[]
  activities: ActivityRow[]
  /** Écarts volontaires, indexés par `cleEcart`. */
  ecarts?: Map<string, EcartRow>
  /** Jours dont la charge est une mesure et non un silence. Sans elle, une
   *  séance sautée retombe sur `load > 0` et se lit comme une absence. */
  attestes?: Set<string>
  /** Forme projetée par le ressenti, pour le niveau en course du coach. */
  forme?: AjustementForme
  /** Ancre les six zones — vient du profil, `plan.meta` en repli seulement. */
  marathonPace: number
  /** Le carnet du jour n'existe qu'avec Supabase branché. */
  journalActif: boolean
  onVoirSuivi: () => void
  /** Absent en mode instantanés : les séances ne s'ouvrent alors pas au clic. */
  /**
   * La séance porte sa semaine d'ORIGINE : la passer séparément invitait à
   * passer celle qui est affichée, et deux sorties longues réunies dans la
   * même semaine par un déplacement partageaient alors la même clé.
   */
  onOuvrirSeance?: (seance: SeancePlanifiee) => void
  onOuvrirProfil: () => void
}

export function Today({
  load,
  pain,
  feedback,
  activities,
  ecarts,
  attestes,
  forme,
  marathonPace,
  journalActif,
  onVoirSuivi,
  onOuvrirSeance,
  onOuvrirProfil,
}: Props) {
  const now = todayISO()
  const A = useMemo(
    () => adapt(load, pain, feedback, now, attestes),
    [load, pain, feedback, now, attestes],
  )
  const [calculOuvert, setCalculOuvert] = useState(false)

  // Le jour consulté. Il recule jusqu'à 28 jours, la fenêtre du modèle, et ne
  // dépasse jamais aujourd'hui : on ne saisit pas la raideur d'un réveil qui
  // n'a pas eu lieu, et le programme à venir se lit dans l'onglet Programme.
  const [jour, setJour] = useState(now)
  const estAujourdhui = jour === now
  const plusAncien = addDays(now, -27)

  /**
   * Décale d'un jour, bornes comprises dans la mise à jour elle-même.
   *
   * La forme fonctionnelle n'est pas un détail de style : deux appuis rapides
   * sur la flèche partent du même rendu, donc d'un `jour` identique, et le
   * second écrasait le premier au lieu de s'y ajouter. On ne reculait que
   * d'une journée quelle que soit la vitesse d'appui.
   */
  const decaler = useCallback(
    (n: number) =>
      setJour((j) => {
        const cible = addDays(j, n)
        if (cible > now) return now
        if (cible < plusAncien) return plusAncien
        return cible
      }),
    [now, plusAncien],
  )

  const debutPlan = plan.meta.start
  const avantPlan = jour < debutPlan

  /** La semaine du jour consulté : le contenu affiché la suit. */
  const semaine: Week = useMemo(() => {
    const w = plan.weeks.find((x) => jour >= x.monday && jour <= addDays(x.monday, 6))
    return w ?? plan.weeks[jour < debutPlan ? 0 : plan.weeks.length - 1]
  }, [jour, debutPlan])

  // L'adaptation reste ancrée sur AUJOURD'HUI, même en consultant une autre
  // date : `fxForDate` ne s'applique que dans la fenêtre de dix jours à partir
  // du présent, et remonter le temps ne doit pas réécrire le passé.
  // Séances figées et palier de la sortie longue : ils se lisent sur tout le
  // plan, pas sur une semaine, donc ils se calculent une fois ici.
  const contexte = useMemo(
    () => construireContexte(plan.weeks, feedback, pain, now, ecarts),
    [feedback, pain, now, ecarts],
  )
  const seances = useMemo(
    () => seancesDeLaSemaine(plan.weeks, semaine, now, A.byDate, ecarts, contexte),
    [semaine, now, A.byDate, ecarts, contexte],
  )
  const feedbackDe = ({ semaineOrigine, jourOrigine, slot }: SeancePlanifiee) =>
    feedback.find(
      (f) => f.week === semaineOrigine && f.day_index === jourOrigine && f.slot === slot,
    ) ?? null

  const duJour = avantPlan ? [] : seances.filter((x) => x.day === jour)
  /**
   * Une séance notée est une séance faite : elle compte déjà dans la charge et
   * dans les compteurs, et la laisser en tête d'écran continuait de la réclamer.
   * Elle redescend plus bas, où elle sert de trace plutôt que de consigne.
   */
  const restantes = duJour.filter((x) => !feedbackDe(x))
  const faites = duJour.filter((x) => feedbackDe(x))

  /** La semaine en cours, pour les compteurs et le coach : eux parlent du
   *  présent, pas du jour qu'on est en train de relire. */
  const semaineCourante: Week = useMemo(() => {
    const w = plan.weeks.find((x) => now >= x.monday && now <= addDays(x.monday, 6))
    return w ?? plan.weeks[now < debutPlan ? 0 : plan.weeks.length - 1]
  }, [now, debutPlan])

  const seancesCourantes = useMemo(
    () => seancesDeLaSemaine(plan.weeks, semaineCourante, now, A.byDate, ecarts, contexte),
    [semaineCourante, now, A.byDate, ecarts, contexte],
  )

  const insights = useMemo(
    () =>
      construireInsights({
        seances: seancesCourantes,
        now,
        feedback,
        activities,
        byDate: A.byDate,
        ecarts,
      }),
    [semaineCourante, seancesCourantes, now, feedback, activities, A.byDate, ecarts],
  )

  /**
   * La distance que le PLAN fixait, avant tout écart et toute adaptation.
   * C'est elle qui permet de dire « 22 km au lieu de 26 » plutôt que « 22 km »,
   * qui n'apprend rien.
   */
  const distDuPlan = useCallback(
    (semaineN: number, jourOrigine: number, slot: number): number | null => {
      const w = plan.weeks.find((x) => x.n === semaineN)
      if (!w) return null
      const slots = slotsParJour(w.sessions)
      const i = w.sessions.findIndex((s, k) => s.day === jourOrigine && slots[k] === slot)
      return i < 0 ? null : (w.sessions[i].dist ?? null)
    },
    [],
  )

  /**
   * Ce que le coach doit savoir de la journée. Il parlait jusqu'ici de la
   * quinzaine écoulée et de rien d'autre : le jour où l'indice retirait la
   * course, il félicitait pour l'excentrique. Un mot qui ignore ce qui est
   * affiché juste au-dessus de lui n'est pas un coach, c'est un bandeau.
   */
  const duJourPourCoach = useMemo<SeanceDuJour[]>(
    () =>
      duJour.map((x) => {
        const patch = x.ecart?.patch
        // La nature de l'écart, dans l'ordre où elle compte pour le coach :
        // ne pas faire la séance passe avant en changer la discipline, qui
        // passe avant la déplacer, qui passe avant corriger ses chiffres.
        const nature: SeanceDuJour['ecart'] = !patch
          ? null
          : patch.skipped
            ? 'saut'
            : patch.type
              ? 'remplacement'
              : patch.day != null || patch.semaines
                ? 'deplacement'
                : patch.dist != null || patch.durMin != null
                  ? 'donnee'
                  : null
        return {
          type: x.s.type,
          typePlan: x.typePlan,
          titre: x.s.title,
          dist: x.s.dist ?? null,
          distPlan: distDuPlan(x.semaineOrigine, x.jourOrigine, x.slot),
          ecart: nature,
          adaptee: Boolean(x.s.adapted),
          motif: x.s.adapted?.startsWith('Raideur') ? 'raideur' : 'indice',
          raideurMatin: pain[x.day]?.wake ?? null,
          faite: Boolean(feedbackDe(x)),
          saute: Boolean(x.s.saute),
        }
      }),
    // `feedbackDe` se recrée à chaque rendu : c'est `feedback` qui décide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duJour, feedback, distDuPlan, pain],
  )

  /** Les contraintes que la semaine RÉELLEMENT formée ne respecte pas. */
  const alertesSemaine = useMemo(
    () =>
      verifierContraintes(
        seancesCourantes.map((x) => ({ ...x.s, day: weekdayIndex(x.day) })),
      ).map((a) => a.texte),
    [seancesCourantes],
  )

  /** La séance d'hier, jugée sur ce que le plan en attendait. */
  const hierPourCoach = useMemo<SeanceHier[]>(() => {
    const hier = addDays(now, -1)
    const w = plan.weeks.find((x) => hier >= x.monday && hier <= addDays(x.monday, 6))
    if (!w) return []
    return seancesDeLaSemaine(plan.weeks, w, now, A.byDate, ecarts, contexte)
      .filter((x) => x.day === hier && !x.s.saute && x.s.type !== 'repos')
      .map((x) => {
        const f = feedbackDe(x)
        // La durée estimée vient du plan de référence : « donnée réelle »
        // réécrit `dur` avec la durée saisie, qu'on comparerait à elle-même.
        const ref = plan.weeks.find((y) => y.n === x.semaineOrigine)
        const slots = ref ? slotsParJour(ref.sessions) : []
        const origine = ref?.sessions.find((s, k) => s.day === x.jourOrigine && slots[k] === x.slot)
        return {
          type: x.s.type,
          rpe: f?.rpe ?? null,
          rpeAttendu: RPE_ATTENDU[x.s.type] ?? null,
          douleur: f?.pain ?? null,
          dureeReelle: x.ecart?.patch.durMin ?? null,
          dureeEstimee:
            origine && origine.type === x.s.type ? estimateDuration(origine, marathonPace) : null,
        }
      })
    // `feedbackDe` se recrée à chaque rendu : c'est `feedback` qui décide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, A.byDate, ecarts, contexte, feedback, marathonPace])

  /** La semaine en cours en charge tendineuse, réel contre plan. */
  const semainePourCoach = useMemo<SemaineEnCours>(() => {
    const w = semaineCourante
    let realisee = 0
    let reste = 0
    for (let k = 0; k < 7; k++) {
      const d = addDays(w.monday, k)
      const l = A.byDate[d]?.load ?? 0
      if (d < now) realisee += l
      else reste += l
    }
    const prevue = w.sessions
      .filter((s) => addDays(w.monday, s.day) < now)
      .reduce((acc, s) => acc + sessionLoad(s), 0)
    // La référence d'une décharge est la dernière semaine de CHARGE : ni une
    // décharge, ni une semaine de course, allégée pour d'autres raisons.
    const reference = [...plan.weeks]
      .reverse()
      .find((x) => x.n < w.n && !x.deload && !x.sessions.some((s) => s.type === 'race' || s.type === 'course'))
    return {
      decharge: w.deload,
      joursEcoules: daysBetween(w.monday, now),
      realisee,
      prevue,
      reste,
      referenceCharge: reference ? reference.sessions.reduce((acc, s) => acc + sessionLoad(s), 0) : null,
    }
  }, [semaineCourante, A.byDate, now])

  /**
   * Le bilan : le dimanche sur la semaine qui se referme, le lundi sur celle
   * qui vient de finir. « La semaine prochaine » est alors celle qui commence.
   */
  const bilan = useMemo(() => {
    const jourSemaine = weekdayIndex(now)
    if (jourSemaine !== 6 && jourSemaine !== 0) return null
    const i = plan.weeks.findIndex((w) => w.n === semaineCourante.n)
    const bilanee = jourSemaine === 0 ? plan.weeks[i - 1] : semaineCourante
    const suivante = jourSemaine === 0 ? semaineCourante : plan.weeks[i + 1]
    if (!bilanee || now < debutPlan) return null

    const versBilan = (w: Week): SeanceBilan[] =>
      seancesDeLaSemaine(plan.weeks, w, now, A.byDate, ecarts, contexte).map((x) => {
        const ref = plan.weeks.find((y) => y.n === x.semaineOrigine)
        const slots = ref ? slotsParJour(ref.sessions) : []
        const f = feedbackDe(x)
        return {
          s: x.s,
          typePlan: x.typePlan,
          day: x.day,
          faite: Boolean(f),
          rpe: f?.rpe ?? null,
          douleur: f?.pain ?? null,
          reference: ref?.sessions.find((s, k) => s.day === x.jourOrigine && slots[k] === x.slot) ?? null,
        }
      })

    // Les quatre semaines qui précèdent, pour le volume et le dosage : ce sont
    // les deux chiffres que Maxime regarde avant ceux de la semaine.
    const quatreSemaines = plan.weeks
      .filter((w) => w.monday >= addDays(bilanee.monday, -21) && w.monday <= bilanee.monday)
      .flatMap(versBilan)
      .filter((x) => x.faite && !x.s.saute && x.day > addDays(now, -28) && x.day <= now)
    const volume28 = quatreSemaines.reduce((acc, x) => acc + (x.s.dist ?? 0), 0)
    const dosage = {
      seuil: quatreSemaines.filter((x) => x.s.qualite === 'seuil').length,
      vitesse: quatreSemaines.filter((x) => x.s.qualite === 'vitesse' || x.s.qualite === 'specifique').length,
    }

    // Jours sans douleur au-dessus de 2, et relevés dans la fenêtre : le
    // compteur qui ouvre les paliers de volume. Il s'arrête au premier jour du
    // carnet, sinon un carnet de vingt jours s'annoncerait comme soixante.
    const douleurMax = (d: string) => {
      const p = pain[d]
      const vs = [p?.wake, p?.evening, p?.effort].filter((v): v is number => v != null)
      return vs.length ? Math.max(...vs) : null
    }
    let derniereForte: number | null = null
    let premierReleve = 0
    for (let k = 0; k < 90; k++) {
      const m = douleurMax(addDays(now, -k))
      if (m == null) continue
      premierReleve = k
      if (m > 2) {
        derniereForte = k
        break
      }
    }
    const joursSansDouleur = derniereForte ?? premierReleve + 1
    let relevesSansDouleur = 0
    for (let k = 0; k < joursSansDouleur; k++) if (douleurMax(addDays(now, -k)) != null) relevesSansDouleur++

    let excentriqueSerie = 0
    for (let k = pain[now]?.eccentric ? 0 : 1; k < 90; k++) {
      if (!pain[addDays(now, -k)]?.eccentric) break
      excentriqueSerie++
    }

    // Semaines d'affilée avec au moins une séance notée : « ce qui compte,
    // c'est l'accumulation », et une interruption remet le compteur à zéro.
    let semainesDAffilee = 0
    for (let k = 0; k < plan.weeks.length; k++) {
      const w = plan.weeks[i - k]
      if (!w || w.monday > now) continue
      const notees = feedback.some((f) => f.day >= w.monday && f.day <= addDays(w.monday, 6))
      if (!notees) break
      semainesDAffilee++
    }

    const jours: string[] = []
    for (let k = 0; k < 7; k++) {
      const d = addDays(bilanee.monday, k)
      if (d <= now) jours.push(d)
    }
    const idx = jours.map((d) => A.byDate[d]?.idx).filter((v): v is number => v != null)
    const faits: FaitsBilan = {
      volume28: Math.round(volume28 * 10) / 10,
      attestes: attestes ? jours.filter((d) => attestes.has(d)).length : jours.length,
      sansDouleur: { jours: joursSansDouleur, releves: relevesSansDouleur },
      excentriqueSerie,
      semainesDAffilee,
      indice: {
        moyen: idx.length ? Math.round(idx.reduce((a, b) => a + b, 0) / idx.length) : null,
        pic: idx.length ? Math.max(...idx) : null,
        emballement: A.detail.ratio,
        monotonie: A.detail.monotony,
      },
      forme: forme ? { allure: forme.allure, ecart: forme.ecart, seances: forme.seances } : null,
      echeances: {
        dixKm: daysBetween(now, DIX_KM) > 0 ? daysBetween(now, DIX_KM) : null,
        marathon: daysBetween(now, plan.meta.raceDate),
      },
      dosage,
    }

    return bilanSemaine({
      semaine: bilanee,
      seances: versBilan(bilanee),
      pain,
      charge: Object.fromEntries(Object.entries(A.byDate).map(([d, r]) => [d, r.load])),
      now,
      faits,
      suivante: suivante ? { semaine: suivante, seances: versBilan(suivante) } : undefined,
    })
    // `feedbackDe` se recrée à chaque rendu : c'est `feedback` qui décide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, semaineCourante, debutPlan, A.byDate, A.detail, ecarts, contexte, feedback, pain, attestes, forme])

  const mot = useMemo(
    () =>
      motDuCoach({
        pain,
        byDate: A.byDate,
        now,
        seancesTotal: insights.seancesTotal,
        duJour: duJourPourCoach,
        indice: {
          idx: A.detail.idx,
          painInconnue: A.detail.painInconnue,
          chargeInconnue: A.detail.chargeInconnue,
        },
        alertes: alertesSemaine,
        // Deux jours de mémoire, sur le sujet et non sur la règle : quatre
        // règles différentes parlent de la raideur au réveil, et les exclure
        // une par une la laissait revenir tous les matins.
        exclureSujets: [lireMemoireCoach()[addDays(now, -1)], lireMemoireCoach()[addDays(now, -2)]]
          .filter((x): x is string => Boolean(x)),
        jusquaCourse: daysBetween(now, plan.meta.raceDate),
        hier: hierPourCoach,
        semaine: semainePourCoach,
        forme,
      }),
    [pain, A.byDate, A.detail, now, insights.seancesTotal, duJourPourCoach, alertesSemaine, hierPourCoach, semainePourCoach, forme],
  )

  // Le sujet du jour devient l'exclusion des deux jours suivants. Réécrit à
  // chaque rendu : c'est le dernier mot affiché qui compte, pas le premier.
  useEffect(() => {
    ecrireMemoireCoach(now, mot.sujet)
  }, [now, mot.sujet])

  /** L'indice du jour consulté. `A.detail` ne vaut que pour aujourd'hui. */
  const detail = A.byDate[jour] ?? A.detail
  const bande = bandOf(detail.idx)

  const jRace = daysBetween(now, plan.meta.raceDate)
  const jDebut = daysBetween(now, debutPlan)
  const sousTitre = formatDayLong(jour)

  return (
    // Le dégradé court sur toute la page, pas seulement sur le premier écran :
    // c'est ce qui donne au verre dépoli quelque chose à flouter jusqu'en bas.
    <div style={{ position: 'relative', maxWidth: 'var(--shell-max)', margin: '0 auto', paddingBottom: 90 }}>
      <MeshBackground band={bande.key} />

      {/* ─── premier écran : insights, indice, séance ──────────────────── */}
      <section
        style={{
          position: 'relative',
          zIndex: 5,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 var(--page-x)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <EnteteEcran
            titre={avantPlan ? 'Bientôt' : estAujourdhui ? "Aujourd'hui" : titreJour(jour, now)}
            contexte={
              <>
                {sousTitre[0].toUpperCase() + sousTitre.slice(1)} ·{' '}
                {avantPlan ? `J-${jDebut} avant la semaine 1` : `J-${jRace} avant Paris`}
              </>
            }
            onOuvrirProfil={onOuvrirProfil}
          />

          <NavigationJour
            jour={jour}
            now={now}
            plusAncien={plusAncien}
            onDecaler={decaler}
            onAujourdhui={() => setJour(now)}
          />

          {/* Les compteurs parlent de la semaine en cours : les afficher en
              relisant un jour passé laisserait croire qu'ils le concernent. */}
          {estAujourdhui && (
            <div style={{ marginTop: 16 }}>
              <InsightTiles insights={insights} />
            </div>
          )}

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '26px 0',
            }}
          >
            {/* Sans douleur saisie depuis plus de quatre jours, la composante
                douleur vaut zéro. Comme elle pèse 85 des 100 points, l'indice
                affiche un vert rassurant alors qu'on ne sait rien. On montre
                l'arc à vide plutôt qu'un chiffre faux. */}
            <TendonArc value={detail.painInconnue ? 0 : detail.idx} />

            {/* Le chiffre remonte dans la courbe : c'est ce qui fait tenir
                l'arc et la valeur comme un seul objet plutôt que deux. */}
            <div style={{ marginTop: -66, textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: 'var(--sur-ink-2)',
                }}
              >
                Charge du tendon
              </div>
              <div
                style={{
                  fontSize: 88,
                  fontWeight: 300,
                  letterSpacing: '-3px',
                  lineHeight: 0.92,
                  marginTop: 2,
                  fontVariantNumeric: 'tabular-nums',
                  // Un tiret à cette taille se lit comme une barre pleine, pas
                  // comme une absence. Le point d'interrogation dit la même
                  // chose et se reconnaît tout de suite.
                  opacity: detail.painInconnue ? 0.5 : 1,
                }}
              >
                {detail.painInconnue ? '?' : detail.idx}
              </div>
              <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.3px', marginTop: 6 }}>
                {detail.painInconnue ? 'Je ne sais pas' : bande.headline}
              </div>
              <p
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: 'var(--sur-ink-2)',
                  lineHeight: 1.45,
                  margin: '7px auto 0',
                  maxWidth: '34ch',
                }}
              >
                {detail.painInconnue
                  ? `Aucune douleur saisie depuis ${detail.joursSansDouleur ?? 'plus de 60'} jours. La charge mécanique, elle, est connue : ${Math.round(detail.ratio + detail.freshness + detail.monotony)} points sur 58. Note ta raideur au réveil et l'indice redevient lisible.`
                  : bande.detail}
              </p>
            </div>

            {/* Le détail chiffré vit dans la feuille : sur l'écran, un seul
                badge, pour ne pas concurrencer la lecture de l'indice. */}
            <button
              onClick={() => setCalculOuvert(true)}
              className="glass"
              style={{
                marginTop: 20,
                padding: '8px 14px',
                borderRadius: 'var(--pill)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ink)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                cursor: 'pointer',
              }}
            >
              Calcul de la charge
              <Icon name="chevronRight" size={13} style={{ opacity: 0.7 }} />
            </button>

            {detail.stale && !detail.painInconnue && (
              <Note>Aucune douleur saisie depuis 24 h : l'indice tourne sur une estimation.</Note>
            )}
          </div>

          <div style={{ paddingBottom: 18 }}>
            {restantes.length ? (
              <SessionHero
                session={restantes[0].s}
                marathonPace={marathonPace}
                quand={estAujourdhui ? "Aujourd'hui" : formatDay(jour)}
                onClick={onOuvrirSeance && (() => onOuvrirSeance(restantes[0]))}
              />
            ) : (
              <div
                className="glass"
                style={{
                  borderRadius: 22,
                  padding: '16px 18px',
                  display: 'flex',
                  gap: 13,
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 13,
                    background: 'rgba(255,255,255,.12)',
                    display: 'grid',
                    placeItems: 'center',
                    flex: 'none',
                  }}
                >
                  <Icon name={faites.length ? 'check' : 'rest'} />
                </span>
                <div>
                  <b style={{ fontSize: 16, fontWeight: 600 }}>
                    {avantPlan
                      ? 'Le plan commence le 10 août'
                      : faites.length
                        ? faites.length > 1
                          ? `${faites.length} séances notées`
                          : 'Séance notée'
                        : estAujourdhui
                          ? "Rien au programme aujourd'hui"
                          : 'Rien au programme ce jour-là'}
                  </b>
                  <div style={{ color: 'var(--sur-ink-2)', fontSize: 13 }}>
                    {avantPlan
                      ? 'Semaine 1 : amorce, sans sortie longue.'
                      : faites.length
                        ? estAujourdhui
                          ? "C'est fait pour aujourd'hui. Le détail est plus bas."
                          : 'La journée est complète. Le détail est plus bas.'
                        : estAujourdhui
                          ? "Profites-en pour glacer et t'étirer."
                          : 'Journée de repos jambes.'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── au scroll : le reste de la journée et de la semaine ────────── */}
      <div style={{ position: 'relative', zIndex: 5, padding: '24px var(--page-x) 0' }}>
        {estAujourdhui && <AlertBox adapt={A} />}

        {restantes.slice(1).map((x, i) => (
          <SessionCard
            key={i}
            session={x.s}
            marathonPace={marathonPace}
            onClick={onOuvrirSeance && (() => onOuvrirSeance(x))}
          />
        ))}

        {faites.length > 0 && (
          <>
            <Pretitle>Déjà noté</Pretitle>
            {faites.map((x, i) => (
              <SessionCard
                key={i}
                session={x.s}
                marathonPace={marathonPace}
                feedback={feedbackDe(x)}
                onClick={onOuvrirSeance && (() => onOuvrirSeance(x))}
              />
            ))}
          </>
        )}

        {journalActif && <JournalDuJour day={jour} now={now} />}

        {estAujourdhui && bilan && <CarteBilan bilan={bilan} style={{ marginBottom: 14 }} />}

        {estAujourdhui && <CarteCoach texte={mot.texte} style={{ marginBottom: 14 }} />}

      </div>

      {calculOuvert && (
        <ChargeSheet
          breakdown={detail}
          band={bande}
          onVoirSuivi={onVoirSuivi}
          onClose={() => setCalculOuvert(false)}
        />
      )}
    </div>
  )
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        color: 'rgba(255,214,138,.92)',
        fontSize: 11.5,
        fontWeight: 500,
        margin: '12px 0 0',
        textAlign: 'center',
        maxWidth: '36ch',
      }}
    >
      {children}
    </p>
  )
}

/** Même grammaire que les tuiles d'insights : micro-label en capitales,
 *  valeur en chiffres tabulaires, précision en dessous. */

/** Même grammaire que l'en-tête de jour de l'écran Programme. */
function Pretitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '1.2px',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
        margin: '26px 0 10px 2px',
      }}
    >
      {children}
    </h2>
  )
}

/** « Hier », « Avant-hier », puis le nom du jour. Un libellé relatif reste plus
 *  rapide à lire qu'une date, mais il ne tient que sur deux jours. */
function titreJour(jour: string, now: string): string {
  const ecart = daysBetween(jour, now)
  if (ecart === 1) return 'Hier'
  if (ecart === 2) return 'Avant-hier'
  // formatDayLong abrège (« mer. ») : correct dans une ligne de contexte,
  // pas comme titre de page. On reprend le nom entier.
  const j = DAYS_LONG[weekdayIndex(jour)]
  return j[0].toUpperCase() + j.slice(1)
}

/**
 * Navigation de jour en jour, bornée au passé.
 *
 * On ne va pas au-delà d'aujourd'hui : la raideur d'un réveil qui n'a pas eu
 * lieu ne se saisit pas, et le programme à venir se lit dans l'onglet
 * Programme, qui est fait pour ça.
 */
function NavigationJour({
  jour,
  now,
  plusAncien,
  onDecaler,
  onAujourdhui,
}: {
  jour: string
  now: string
  plusAncien: string
  onDecaler: (n: number) => void
  onAujourdhui: () => void
}) {
  const peutReculer = jour > plusAncien
  const peutAvancer = jour < now
  const estAujourdhui = jour === now

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 14,
      }}
    >
      <Fleche
        sens="gauche"
        actif={peutReculer}
        label="Jour précédent"
        onClick={() => onDecaler(-1)}
      />
      <Fleche
        sens="droite"
        actif={peutAvancer}
        label="Jour suivant"
        onClick={() => onDecaler(1)}
      />
      {!estAujourdhui && (
        <button
          onClick={onAujourdhui}
          className="glass"
          style={{
            marginLeft: 2,
            padding: '7px 14px',
            borderRadius: 'var(--pill)',
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          Revenir à aujourd&apos;hui
        </button>
      )}
    </div>
  )
}

function Fleche({
  sens,
  actif,
  label,
  onClick,
}: {
  sens: 'gauche' | 'droite'
  actif: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!actif}
      aria-label={label}
      className="glass"
      style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        opacity: actif ? 1 : 0.3,
        cursor: actif ? 'pointer' : 'default',
        transform: sens === 'gauche' ? 'scaleX(-1)' : undefined,
      }}
    >
      <Icon name="chevronRight" size={16} />
    </button>
  )
}
