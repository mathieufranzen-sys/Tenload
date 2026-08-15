/**
 * Écran Aujourd'hui.
 *
 * Le premier écran est un dégradé plein cadre piloté par la bande de charge :
 * insights en verre, indice en arc fin, puis la séance du jour qui dépasse
 * volontairement sous la ligne de flottaison — c'est elle qui appelle le
 * scroll. Le reste (règles d'adaptation, carnet, suite de la semaine) suit
 * en dessous, sur le fond sombre habituel.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import planJson from '../data/plan.json'
import type { Plan, Week } from '../data/types'
import {
  DAYS_LONG,
  addDays,
  daysBetween,
  formatDay,
  today as todayISO,
  weekdayIndex,
} from '../lib/dates'
import { adapt, weekSessions, type SeancePlanifiee } from '../lib/adapt'
import { construireInsights } from '../lib/insights'
import { motDuCoach, type MotCoach } from '../lib/coach'
import { bandOf, type LoadMap, type PainMap } from '../lib/tendonIndex'
import type { ActivityRow } from '../lib/load'
import type { FeedbackRow } from '../lib/buildPain'
import type { EcartRow } from '../lib/overrides'
import { SessionCard } from '../components/SessionCard'
import { AlertBox } from '../components/AlertBox'
import { JournalDuJour } from '../components/JournalDuJour'
import { MeshBackground } from '../components/MeshBackground'
import { TendonArc } from '../components/TendonArc'
import { InsightTiles } from '../components/InsightTiles'
import { SessionHero } from '../components/SessionHero'
import { ChargeSheet } from '../components/ChargeSheet'
import { Icon } from '../components/Icon'
import { ProfileButton } from '../components/ProfileButton'

const plan = planJson as unknown as Plan

interface Props {
  load: LoadMap
  pain: PainMap
  feedback: FeedbackRow[]
  activities: ActivityRow[]
  /** Écarts volontaires, indexés par `cleEcart`. */
  ecarts?: Map<string, EcartRow>
  /** Ancre les six zones — vient du profil, `plan.meta` en repli seulement. */
  marathonPace: number
  /** Le carnet du jour n'existe qu'avec Supabase branché. */
  journalActif: boolean
  onVoirSuivi: () => void
  /** Absent en mode instantanés : les séances ne s'ouvrent alors pas au clic. */
  onOuvrirSeance?: (semaine: Week, seance: SeancePlanifiee) => void
  onOuvrirProfil: () => void
}

export function Today({
  load,
  pain,
  feedback,
  activities,
  ecarts,
  marathonPace,
  journalActif,
  onVoirSuivi,
  onOuvrirSeance,
  onOuvrirProfil,
}: Props) {
  const now = todayISO()
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])
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
  const seances = useMemo(
    () => weekSessions(semaine, now, A.byDate, ecarts),
    [semaine, now, A.byDate, ecarts],
  )
  const duJour = avantPlan ? [] : seances.filter((x) => x.day === jour)
  const suite = seances.filter((x) => x.day > jour).slice(0, 4)

  /** La semaine en cours, pour les compteurs et le coach : eux parlent du
   *  présent, pas du jour qu'on est en train de relire. */
  const semaineCourante: Week = useMemo(() => {
    const w = plan.weeks.find((x) => now >= x.monday && now <= addDays(x.monday, 6))
    return w ?? plan.weeks[now < debutPlan ? 0 : plan.weeks.length - 1]
  }, [now, debutPlan])

  const seancesCourantes = useMemo(
    () => weekSessions(semaineCourante, now, A.byDate, ecarts),
    [semaineCourante, now, A.byDate, ecarts],
  )

  const insights = useMemo(
    () =>
      construireInsights({
        semaine: semaineCourante,
        seances: seancesCourantes,
        now,
        feedback,
        activities,
        byDate: A.byDate,
      }),
    [semaineCourante, seancesCourantes, now, feedback, activities, A.byDate],
  )

  const mot = useMemo(
    () => motDuCoach({ pain, byDate: A.byDate, now, seancesTotal: insights.seancesTotal }),
    [pain, A.byDate, now, insights.seancesTotal],
  )

  /** L'indice du jour consulté. `A.detail` ne vaut que pour aujourd'hui. */
  const detail = A.byDate[jour] ?? A.detail
  const bande = bandOf(detail.idx)

  const jRace = daysBetween(now, plan.meta.raceDate)
  const jDebut = daysBetween(now, debutPlan)

  const feedbackDe = ({ jourOrigine, slot }: SeancePlanifiee) =>
    feedback.find((f) => f.week === semaine.n && f.day_index === jourOrigine && f.slot === slot) ?? null

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
          <header style={{ padding: '22px 2px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 600, letterSpacing: '-.5px' }}>
                {avantPlan ? 'Bientôt' : estAujourdhui ? "Aujourd'hui" : titreJour(jour, now)}
              </h1>
              {/* La date est descendue dans le sélecteur, au-dessus de l'arc :
                  la répéter ici ferait deux fois la même information à trois
                  centimètres d'écart. */}
              <p style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 500, margin: '3px 0 0' }}>
                {avantPlan ? `J-${jDebut} avant la semaine 1` : `J-${jRace} avant Paris`}
              </p>
            </div>
            <ProfileButton onClick={onOuvrirProfil} />
          </header>

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
            {/* Le sélecteur commande l'arc, il est donc posé juste dessus, la
                date entre les deux flèches. C'est le geste habituel d'un
                calendrier, et il n'a plus besoin de titre pour se faire
                comprendre. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <Fleche
                sens="gauche"
                actif={jour > plusAncien}
                label="Jour précédent"
                onClick={() => decaler(-1)}
              />
              <div
                style={{
                  minWidth: 108,
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: '-.2px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatDay(jour)}
              </div>
              <Fleche
                sens="droite"
                actif={jour < now}
                label="Jour suivant"
                onClick={() => decaler(1)}
              />
            </div>

            {!estAujourdhui && (
              <button
                onClick={() => setJour(now)}
                style={{
                  marginBottom: 10,
                  padding: '4px 12px',
                  borderRadius: 'var(--pill)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--sur-ink-2)',
                  background: 'rgba(255,255,255,.12)',
                }}
              >
                Revenir à aujourd&apos;hui
              </button>
            )}

            <TendonArc value={detail.idx} />

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
                }}
              >
                {detail.idx}
              </div>
              <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.3px', marginTop: 6 }}>
                {bande.headline}
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
                {bande.detail}
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

            {detail.stale && <Note>Aucune douleur saisie depuis 24 h : l'indice tourne sur une estimation.</Note>}
          </div>

          <div style={{ paddingBottom: 18 }}>
            {duJour.length ? (
              <SessionHero
                session={duJour[0].s}
                marathonPace={marathonPace}
                quand={estAujourdhui ? "Aujourd'hui" : formatDay(jour)}
                onClick={onOuvrirSeance && (() => onOuvrirSeance(semaine, duJour[0]))}
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
                  <Icon name="rest" />
                </span>
                <div>
                  <b style={{ fontSize: 16, fontWeight: 600 }}>
                    {avantPlan
                      ? 'Le plan commence le 10 août'
                      : estAujourdhui
                        ? "Rien au programme aujourd'hui"
                        : 'Rien au programme ce jour-là'}
                  </b>
                  <div style={{ color: 'var(--sur-ink-2)', fontSize: 13 }}>
                    {avantPlan
                      ? 'Semaine 1 : amorce, sans sortie longue.'
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

        {duJour.slice(1).map((x, i) => (
          <SessionCard
            key={i}
            session={x.s}
            day={jour}
            marathonPace={marathonPace}
            feedback={feedbackDe(x)}
            onClick={onOuvrirSeance && (() => onOuvrirSeance(semaine, x))}
          />
        ))}

        {journalActif && <JournalDuJour day={jour} />}

        {estAujourdhui && <MotCoachCard mot={mot} />}

        {suite.length > 0 && (
          <>
            <Pretitle>{estAujourdhui ? 'La suite de la semaine' : 'La suite de cette semaine-là'}</Pretitle>
            {suite.map((x, i) => (
              <SessionCard
                key={i}
                session={x.s}
                day={x.day}
                marathonPace={marathonPace}
                feedback={feedbackDe(x)}
                onClick={onOuvrirSeance && (() => onOuvrirSeance(semaine, x))}
              />
            ))}
          </>
        )}
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

/**
 * Le mot du coach. Il n'affirme que ce que les saisies portent réellement :
 * la construction du texte, et surtout ses conditions de silence, vivent dans
 * lib/coach.ts avec leurs tests.
 */
function MotCoachCard({ mot }: { mot: MotCoach }) {
  const teinte =
    mot.ton === 'bravo'
      ? { fond: 'rgba(52,211,153,.12)', bord: 'rgba(52,211,153,.28)', encre: '#6ee7b7' }
      : mot.ton === 'vigilance'
        ? { fond: 'rgba(250,178,25,.11)', bord: 'rgba(250,178,25,.3)', encre: '#FFD166' }
        : { fond: 'rgba(255,255,255,.05)', bord: 'var(--border-2)', encre: 'var(--sur-ink-2)' }

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        background: teinte.fond,
        border: `1px solid ${teinte.bord}`,
        borderRadius: 'var(--radius)',
        padding: '15px 16px',
        marginBottom: 14,
      }}
    >
      <span style={{ color: teinte.encre, flex: 'none', marginTop: 1 }}>
        <Icon name={mot.ton === 'vigilance' ? 'alert' : 'heart'} size={19} />
      </span>
      <div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '1.3px',
            textTransform: 'uppercase',
            color: teinte.encre,
            marginBottom: 5,
          }}
        >
          Le mot du coach
        </div>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: '#D6D9DE' }}>{mot.texte}</p>
      </div>
    </div>
  )
}

/** « Hier », « Avant-hier », puis le nom du jour. Un libellé relatif reste plus
 *  rapide à lire qu'une date, mais il ne tient que sur deux jours. */
function titreJour(jour: string, now: string): string {
  const ecart = daysBetween(jour, now)
  if (ecart === 1) return 'Hier'
  if (ecart === 2) return 'Avant-hier'
  // Le nom entier, pas l'abrégé de formatDay : c'est un titre de page.
  const j = DAYS_LONG[weekdayIndex(jour)]
  return j[0].toUpperCase() + j.slice(1)
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
        width: 30,
        height: 30,
        borderRadius: '50%',
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        opacity: actif ? 1 : 0.3,
        cursor: actif ? 'pointer' : 'default',
        transform: sens === 'gauche' ? 'scaleX(-1)' : undefined,
      }}
    >
      <Icon name="chevronRight" size={14} />
    </button>
  )
}
