/**
 * Écran Aujourd'hui.
 *
 * Le premier écran est un dégradé plein cadre piloté par la bande de charge :
 * insights en verre, indice en arc fin, puis la séance du jour qui dépasse
 * volontairement sous la ligne de flottaison — c'est elle qui appelle le
 * scroll. Le reste (règles d'adaptation, carnet, mot du coach) suit
 * en dessous, sur le fond sombre habituel.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import planJson from '../data/plan.json'
import type { Plan, Week } from '../data/types'
import {
  DAYS_LONG,
  addDays,
  daysBetween,
  formatDay,
  formatNumber,
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
import { CarteCarnet, PageCarnet } from '../components/JournalDuJour'
import { CarteCharge } from '../components/CarteCharge'
import { SubPage } from '../components/SubPage'
import { ProfileButton } from '../components/ProfileButton'
import { MeshBackground } from '../components/MeshBackground'
import { SessionHero } from '../components/SessionHero'
import { ChargeSheet } from '../components/ChargeSheet'
import { Icon } from '../components/Icon'
import { BoutonAction } from '../components/BoutonAction'
import { CarteCoach } from '../components/CarteCoach'
import { CarteBilan } from '../components/CarteBilan'
import { construireBilan } from '../lib/bilanDeSemaine'
import type { SeanceANoter } from '../lib/aNoter'
import { libelleNature } from '../lib/natureSemaine'

const plan = planJson as unknown as Plan

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
  /** Les séances sans ressenti, calculées une fois dans App (voir aNoter.ts). */
  aNoter?: SeanceANoter[]
  /** Mène à la page « Séances à noter ». */
  onVoirANoter?: () => void
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
  aNoter = [],
  onVoirANoter,
}: Props) {
  const now = todayISO()
  const A = useMemo(
    () => adapt(load, pain, feedback, now, attestes),
    [load, pain, feedback, now, attestes],
  )
  const [calculOuvert, setCalculOuvert] = useState(false)
  const [carnetOuvert, setCarnetOuvert] = useState(false)
  const [bilanOuvert, setBilanOuvert] = useState(false)

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

    return construireBilan({
      plan,
      bilanee,
      suivante,
      ref: now,
      seancesDe: (w) => seancesDeLaSemaine(plan.weeks, w, now, A.byDate, ecarts, contexte),
      indices: A.byDate,
      feedback,
      pain,
      attestes,
      forme,
    })
  }, [now, semaineCourante, debutPlan, A.byDate, ecarts, contexte, feedback, pain, attestes, forme])

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

  const jDebut = daysBetween(now, debutPlan)

  const veille = A.byDate[addDays(jour, -1)]
  const ecartVeille =
    detail.painInconnue || !veille || veille.painInconnue ? null : detail.idx - veille.idx
  const carnet = duJour.map((x) => ({ x, fb: feedbackDe(x) ?? null }))

  // Les saisies du carnet encore dues : le réveil du jour, le soir de la
  // veille. Au-delà de 24 h, elles ne se rattrapent plus (règle du
  // 21 septembre), donc elles ne s'affichent plus. Le soir du jour n'est pas
  // encore dû à l'heure où l'on regarde l'écran.
  const hierIso = addDays(now, -1)
  const saisiesManquantes: SaisieManquante[] = [
    ...(pain[now]?.wake == null ? [{ day: now, libelle: 'Raideur au réveil', quand: "Aujourd'hui" }] : []),
    ...(!avantPlan && pain[hierIso]?.evening == null
      ? [{ day: hierIso, libelle: 'Douleur en fin de journée', quand: 'Hier soir' }]
      : []),
  ]
  const semaineBilanee = bilan ? plan.weeks.find((w) => w.n === bilan.n) : undefined

  return (
    <div style={{ position: 'relative', maxWidth: 'var(--shell-max)', margin: '0 auto', paddingBottom: 110 }}>
      <MeshBackground band={bande.key} />

      <div style={{ position: 'relative', zIndex: 5, padding: '0 var(--page-x)' }}>
        <EnteteJour
          surtitre="Bonjour Mathieu,"
          titre={sousTitreLong(jour)}
          titresCourts={[sousTitreCourt(jour)]}
          relatif={avantPlan ? `J-${jDebut} avant la semaine 1` : estAujourdhui ? null : titreJour(jour, now)}
          jour={jour}
          now={now}
          plusAncien={plusAncien}
          onDecaler={decaler}
          onAujourdhui={() => setJour(now)}
          onOuvrirProfil={onOuvrirProfil}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <CarteCharge
            detail={detail}
            bande={bande}
            ecartVeille={ecartVeille}
            onCalcul={() => setCalculOuvert(true)}
          />

          {detail.stale && !detail.painInconnue && (
            <Note>Aucune douleur saisie depuis 24 h : l'indice tourne sur une estimation.</Note>
          )}

          {/* « Ce que ça change aujourd'hui » est parti le 22 septembre : ce
              que l'indice change à une séance se lit sur la séance même, par
              son étiquette d'adaptation. */}

          {estAujourdhui && (
            <BlocANoter
              seances={aNoter.filter((x) => x.enRetard)}
              saisies={journalActif ? saisiesManquantes : []}
              chargeInconnue={detail.chargeInconnue}
              onOuvrirSeance={
                onOuvrirSeance &&
                ((x) => onOuvrirSeance({ semaineOrigine: x.semaineOrigine, jourOrigine: x.jourOrigine, slot: x.slot } as SeancePlanifiee))
              }
              onOuvrirCarnet={(d) => {
                setJour(d)
                setCarnetOuvert(true)
              }}
              onVoirTout={onVoirANoter}
            />
          )}

          {restantes.length ? (
            <SessionHero
              session={restantes[0].s}
              marathonPace={marathonPace}
              quand={estAujourdhui ? "Aujourd'hui" : formatDay(jour)}
              rang={{ n: duJour.indexOf(restantes[0]) + 1, total: duJour.length }}
              onClick={onOuvrirSeance && (() => onOuvrirSeance(restantes[0]))}
            />
          ) : (
            <div className="carte" style={{ padding: '18px 18px', display: 'flex', gap: 14, alignItems: 'center' }}>
              <span
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  background: faites.length ? 'color-mix(in srgb, var(--neon) 22%, transparent)' : 'var(--surface-3)',
                  color: faites.length ? 'var(--good)' : 'var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none',
                }}
              >
                <Icon name={faites.length ? 'check' : 'rest'} />
              </span>
              <div>
                <b className="display" style={{ fontSize: 'var(--fs-t-carte)', fontWeight: 400 }}>
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
                <div style={{ color: 'var(--sur-ink-2)', fontSize: 'var(--fs-meta)', marginTop: 2 }}>
                  {avantPlan
                    ? 'Semaine 1 : amorce, sans sortie longue.'
                    : faites.length
                      ? estAujourdhui
                        ? "C'est fait pour aujourd'hui. Le détail est plus bas."
                        : 'La journée est complète. Le détail est plus bas.'
                      : estAujourdhui
                        ? "Profites-en pour t'étirer."
                        : 'Journée de repos jambes.'}
                </div>
              </div>
            </div>
          )}

          {restantes.slice(1).map((x, i) => (
            <SessionCard
              key={i}
              session={x.s}
              marathonPace={marathonPace}
              onClick={onOuvrirSeance && (() => onOuvrirSeance(x))}
            />
          ))}

          {faites.map((x, i) => (
            <SessionCard
              key={`f${i}`}
              session={x.s}
              marathonPace={marathonPace}
              feedback={feedbackDe(x)}
              onClick={onOuvrirSeance && (() => onOuvrirSeance(x))}
            />
          ))}

          {journalActif && (
            <CarteCarnet day={jour} now={now} seances={carnet} onOuvrir={() => setCarnetOuvert(true)} />
          )}

          {estAujourdhui && bilan && (
            <button
              type="button"
              onClick={() => setBilanOuvert(true)}
              className="carte"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 16px 16px 20px',
                textAlign: 'left',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="etiquette">Bilan de la semaine {bilan.n}</p>
                <div className="display" style={{ fontSize: 'var(--fs-t-carte)', marginTop: 4 }}>
                  {formatNumber(bilan.kmRealises)} km{' '}
                  <span style={{ fontSize: 'var(--fs-texte)', color: 'var(--sur-ink-2)', fontFamily: 'var(--font)' }}>
                    sur {formatNumber(bilan.kmPrevus)} prévus
                  </span>
                </div>
              </div>
              <span
                aria-hidden
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  background: 'var(--neon)',
                  color: 'var(--ink)',
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none',
                }}
              >
                <Icon name="arrowUpRight" size={18} />
              </span>
            </button>
          )}

          {estAujourdhui && <CarteCoach texte={mot.texte} />}
        </div>
      </div>

      {calculOuvert && (
        <ChargeSheet
          breakdown={detail}
          band={bande}
          veille={veille}
          jourLibelle={sousTitreLong(jour)}
          onVoirVeille={jour > plusAncien ? () => decaler(-1) : undefined}
          onVoirSuivi={onVoirSuivi}
          onClose={() => setCalculOuvert(false)}
        />
      )}

      {journalActif && (
        <SubPage
          ouvert={carnetOuvert}
          surtitre="Carnet"
          titre={sousTitreLong(jour)}
          onBack={() => setCarnetOuvert(false)}
        >
          {carnetOuvert && (
            <PageCarnet day={jour} now={now} seances={carnet} onOuvrirSeance={onOuvrirSeance} />
          )}
        </SubPage>
      )}

      {bilan && (
        <SubPage
          ouvert={bilanOuvert}
          surtitre={`${formatDay(bilan.du)} → ${formatDay(bilan.au)}${semaineBilanee?.nature ? ` · ${libelleNature(semaineBilanee, { charge: true })}` : ''}`}
          titre={`Bilan de la semaine ${bilan.n}`}
          onBack={() => setBilanOuvert(false)}
        >
          {bilanOuvert && (
            <CarteBilan
              bilan={bilan}
              jours={Array.from({ length: 7 }, (_, k) => {
                const d = A.byDate[addDays(bilan.du, k)]
                return d && !d.painInconnue && addDays(bilan.du, k) <= now
                  ? { idx: d.idx, bande: bandOf(d.idx).key }
                  : null
              })}
            />
          )}
        </SubPage>
      )}
    </div>
  )
}

/** « lundi 21 septembre » : le titre de l'écran, en toutes lettres. */
const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** « Mardi 22 sept. » : seul le mois s'abrège, jamais le jour. */
function sousTitreCourt(jour: string): string {
  const [, m, d] = jour.split('-').map(Number)
  return `${DAYS_LONG[weekdayIndex(jour)]} ${d} ${MOIS_COURT[m - 1]}`
}

function sousTitreLong(jour: string): string {
  const [, m, d] = jour.split('-').map(Number)
  return `${DAYS_LONG[weekdayIndex(jour)]} ${d} ${MOIS[m - 1]}`
}

const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

/**
 * L'en-tête de l'écran Aujourd'hui, propre à lui : la semaine et le bloc en
 * surtitre, la date en grand, et les deux flèches de jour à droite, comme la
 * maquette. Le bouton profil reste au-dessus des flèches : c'est la seule
 * porte vers les réglages, il ne peut pas disparaître.
 */
function EnteteJour({
  surtitre,
  titre,
  titresCourts,
  relatif,
  jour,
  now,
  plusAncien,
  onDecaler,
  onAujourdhui,
  onOuvrirProfil,
}: {
  surtitre: string
  titre: string
  /** Les replis quand le titre ne tient pas sur une ligne, du plus long au plus court. */
  titresCourts: string[]
  relatif: string | null
  jour: string
  now: string
  plusAncien: string
  onDecaler: (n: number) => void
  onAujourdhui: () => void
  onOuvrirProfil: () => void
}) {
  return (
    // Plus d'air au-dessus et en dessous de la date (retour du 22 septembre).
    <header style={{ padding: 'calc(24px + env(safe-area-inset-top)) 0 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <p className="display" style={{ margin: 0, fontSize: 'var(--fs-t-liste)', color: 'var(--ink-2)', minWidth: 0 }}>
          {surtitre}
        </p>
        {/* Les flèches montent à côté du profil : la date prend toute la
            largeur, et « Mercredi 30 sept. » tient sur une ligne. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          <NavigationJour jour={jour} now={now} plusAncien={plusAncien} onDecaler={onDecaler} />
          <ProfileButton onClick={onOuvrirProfil} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ minWidth: 0 }}>
          {relatif && (
            <p style={{ margin: '0 0 2px', fontSize: 'var(--fs-texte)', color: 'var(--sur-ink-2)' }}>{relatif}</p>
          )}
          <TitreUneLigne variantes={[titre, ...titresCourts]} />
        </div>
      </div>
      {jour !== now && (
        <BoutonAction icone="arrowRight" onClick={onAujourdhui} style={{ marginTop: 14 }}>
          Revenir à aujourd&apos;hui
        </BoutonAction>
      )}
    </header>
  )
}

/**
 * La date sur une seule ligne, toujours (retour du 22 septembre) : sur deux
 * lignes elle poussait tout l'écran vers le bas. On essaie le titre entier,
 * puis le mois abrégé, et on garde le premier qui tient dans la largeur
 * réellement disponible.
 */
function TitreUneLigne({ variantes }: { variantes: string[] }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [rang, setRang] = useState(0)
  const cle = variantes.join('|')

  // On repart du titre entier quand la date change ou quand la place grandit.
  useLayoutEffect(() => setRang(0), [cle])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.scrollWidth > el.clientWidth + 1 && rang < variantes.length - 1) setRang(rang + 1)
  }, [rang, cle, variantes.length])
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let largeur = el.clientWidth
    const obs = new ResizeObserver(() => {
      if (el.clientWidth !== largeur) {
        largeur = el.clientWidth
        setRang(0)
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <h1
      ref={ref}
      className="display"
      style={{
        margin: 0,
        fontSize: 'var(--fs-t-ecran)',
        lineHeight: 1.04,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {variantes[rang]}
    </h1>
  )
}

/** Une saisie du carnet encore due, et le jour où elle se fait. */
interface SaisieManquante {
  day: string
  libelle: string
  quand: string
}

/**
 * Ce qui reste à noter : séances en retard et saisies du carnet encore dues,
 * dans un encart orange comme les étiquettes d'adaptation. Demandé le
 * 22 septembre 2026 : la liste vivait dans Profil, loin de l'écran qu'on
 * ouvre tous les jours. Quand la charge n'est plus attestée, l'encart le dit,
 * parce que ce sont précisément ces trous qui la rendent inconnue.
 */
function BlocANoter({
  seances,
  saisies,
  chargeInconnue,
  onOuvrirSeance,
  onOuvrirCarnet,
  onVoirTout,
}: {
  seances: SeanceANoter[]
  saisies: SaisieManquante[]
  chargeInconnue: boolean
  onOuvrirSeance?: (x: SeanceANoter) => void
  onOuvrirCarnet: (day: string) => void
  onVoirTout?: () => void
}) {
  const total = seances.length + saisies.length
  if (total === 0 && !chargeInconnue) return null
  const lignes = [
    ...saisies.map((x) => ({ cle: `s-${x.day}-${x.libelle}`, titre: x.libelle, quand: x.quand, ouvrir: () => onOuvrirCarnet(x.day) })),
    ...seances.slice(0, 4).map((x) => ({
      cle: `${x.semaineOrigine}-${x.jourOrigine}-${x.slot}`,
      titre: x.titre,
      quand: formatDay(x.day),
      ouvrir: onOuvrirSeance ? () => onOuvrirSeance(x) : undefined,
    })),
  ]
  return (
    <section
      style={{
        padding: '16px 16px',
        borderRadius: 'var(--radius)',
        background: 'color-mix(in srgb, var(--orange-300) 10%, transparent)',
        border: '1.5px solid color-mix(in srgb, var(--orange-300) 65%, transparent)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--serious)' }}>
        <Icon name="alert" size={19} />
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 600 }}>
          {total === 0 ? 'La charge n’est pas attestée' : `${total} chose${total > 1 ? 's' : ''} à noter`}
        </span>
      </div>
      {chargeInconnue && (
        <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-meta)', lineHeight: 1.5, color: 'var(--ink-2)' }}>
          Moins de cinq des sept derniers jours portent une charge mesurée : l'indice lit ces trous comme
          des jours légers, il penche du côté qui rassure.
        </p>
      )}
      {lignes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {lignes.map((l) => (
            <button
              key={l.cle}
              type="button"
              onClick={l.ouvrir}
              disabled={!l.ouvrir}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '11px 14px',
                borderRadius: 16,
                background: 'var(--surface-2)',
                textAlign: 'left',
                fontSize: 'var(--fs-texte)',
                color: 'var(--ink)',
              }}
            >
              <span style={{ minWidth: 0 }}>{l.titre}</span>
              <span style={{ color: 'var(--serious)', flex: 'none', fontSize: 'var(--fs-meta)' }}>{l.quand}</span>
            </button>
          ))}
        </div>
      )}
      {seances.length > 4 && onVoirTout && (
        <BoutonAction onClick={onVoirTout} style={{ marginTop: 12 }}>
          Voir les {seances.length} séances à noter
        </BoutonAction>
      )}
    </section>
  )
}


function Note({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        color: 'var(--warning)',
        fontSize: 'var(--fs-meta)',
        margin: '0 4px',
      }}
    >
      {children}
    </p>
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
}: {
  jour: string
  now: string
  plusAncien: string
  onDecaler: (n: number) => void
}) {
  const peutReculer = jour > plusAncien
  const peutAvancer = jour < now

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flex: 'none',
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
      className="rond"
      style={{
        opacity: actif ? 1 : 0.3,
        cursor: actif ? 'pointer' : 'default',
        transform: sens === 'gauche' ? 'scaleX(-1)' : undefined,
      }}
    >
      <Icon name="chevronRight" size={18} />
    </button>
  )
}
