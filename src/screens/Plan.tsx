/**
 * Écran Programme, porté depuis reference/tendo-v3.html (`vPlan`).
 */
import { useEffect, useMemo, useState } from 'react'
import planJson from '../data/plan.json'
import type { Plan as PlanType, Session } from '../data/types'
import {
  DAYS_LONG,
  addDays,
  formatDay,
  formatDayLong,
  formatNumber,
  today as todayISO,
} from '../lib/dates'
import {
  adapt,
  construireContexte,
  seancesDeLaSemaine,
  weekSessions,
  type SeancePlanifiee,
} from '../lib/adapt'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { FeedbackRow } from '../lib/buildPain'
import { cleEcart, type EcartPatch, type EcartRow } from '../lib/overrides'
import { SessionCard } from '../components/SessionCard'
import { Icon } from '../components/Icon'
import { EnteteEcran } from '../components/EnteteEcran'
import { MeshBackground } from '../components/MeshBackground'
import { Segmented } from '../components/Segmented'
import { VueCalendrier } from '../components/VueCalendrier'
import { libelleNature } from '../lib/natureSemaine'
import { GrilleCalendrier } from '../components/GrilleCalendrier'

const plan = planJson as unknown as PlanType

const TYPES_COURSE: Session['type'][] = ['long', 'ef', 'inter', 'tempo', 'test', 'course', 'race']

interface Props {
  load: LoadMap
  pain: PainMap
  feedback: FeedbackRow[]
  /** Écarts volontaires, indexés par `cleEcart`. */
  ecarts?: Map<string, EcartRow>
  marathonPace: number
  numeroSemaine: number
  onChangerSemaine: (n: number) => void
  /**
   * La séance porte sa semaine d'ORIGINE : la passer séparément invitait à
   * passer celle qui est affichée, et deux sorties longues réunies dans la
   * même semaine par un déplacement partageaient alors la même clé.
   */
  onOuvrirSeance?: (seance: SeancePlanifiee) => void
  /** Absent en lecture seule : le calendrier reste alors consultable. */
  onSaveEcart?: (
    week: number,
    dayIndex: number,
    slot: number,
    patch: EcartPatch,
    reason?: string | null,
  ) => void
  /** Clé de la séance à mettre en avant, quand on arrive depuis « Déplacer ». */
  focusSeance?: string | null
  /** Change à chaque « Déplacer », même sur la même séance : c'est la demande qui compte, pas la clé. */
  jetonFocus?: number
  onOuvrirProfil: () => void
}

export function Plan({
  load,
  pain,
  feedback,
  ecarts,
  marathonPace,
  numeroSemaine,
  onChangerSemaine,
  onOuvrirSeance,
  onSaveEcart,
  focusSeance,
  jetonFocus,
  onOuvrirProfil,
}: Props) {
  const now = todayISO()
  const semaine = plan.weeks.find((w) => w.n === numeroSemaine) ?? plan.weeks[0]
  const bloc = plan.blocs.find((b) => b.id === semaine.bloc)!
  const semaineCourante = plan.weeks.find((w) => now >= w.monday && now <= addDays(w.monday, 6))

  // `adapt` a besoin d'une fenêtre autour d'aujourd'hui, pas de la semaine affichée :
  // consulter le programme d'une semaine passée ou future ne doit pas la recalculer.
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])
  // Séances figées et palier de la sortie longue, calculés sur tout le plan.
  const contexte = useMemo(
    () => construireContexte(plan.weeks, feedback, pain, now, ecarts),
    [feedback, pain, now, ecarts],
  )
  const seances = useMemo(
    () => seancesDeLaSemaine(plan.weeks, semaine, now, A.byDate, ecarts, contexte),
    [semaine, now, A.byDate, ecarts, contexte],
  )

  // Une séance déclarée non faite ne compte plus dans le décompte de la semaine.
  const courses = seances.filter((x) => !x.s.saute && TYPES_COURSE.includes(x.s.type))
  const nbCourses = courses.length
  // Tout le kilométrage à pied de la semaine, sortie longue comprise : c'est le
  // volume qui parle au tendon, pas la seule ligne d'endurance facile.
  const kmCourse = courses.reduce((total, x) => total + (x.s.dist ?? 0), 0)

  const feedbackDe = ({ semaineOrigine, jourOrigine, slot }: SeancePlanifiee) =>
    feedback.find(
      (f) => f.week === semaineOrigine && f.day_index === jourOrigine && f.slot === slot,
    ) ?? null

  // La vue calendrier montre tout le plan : elle a donc besoin de toutes les
  // semaines, pas de la seule semaine affichée.
  const toutesSeances = useMemo(
    () => plan.weeks.flatMap((w) => weekSessions(w, now, A.byDate, ecarts, contexte)),
    [now, A.byDate, ecarts, contexte],
  )
  // Le plan de référence nu : ni écart, ni adaptation. C'est ce que montre
  // « Voir initial », et c'est le seul sens non ambigu de « avant toute
  // modification de ma part ».
  const seancesInitiales = useMemo(
    () => plan.weeks.flatMap((w) => weekSessions(w, now, {})),
    [now],
  )

  const [vue, setVue] = useState<'semaine' | 'calendrier'>(focusSeance ? 'calendrier' : 'semaine')
  // L'initialiseur ne tourne qu'au montage : quand « Déplacer » part d'une
  // séance ouverte depuis la vue semaine, Programme est déjà monté et y restait.
  useEffect(() => {
    if (focusSeance) setVue('calendrier')
  }, [focusSeance, jetonFocus])

  const [premiere, derniere] = bloc.weeks
  const rangDansBloc = semaine.n - premiere + 1
  const dureeBloc = derniere - premiere + 1

  return (
    <div style={{ position: 'relative', maxWidth: 'var(--shell-max)', margin: '0 auto', paddingBottom: 90 }}>
      <MeshBackground band={A.band.key} formes={false} />

      <div style={{
        position: 'relative',
        zIndex: 5,
        padding: '0 var(--page-x) 0',
      }}>

        {/* L'en-tête entier reste accroché en haut, sélecteur compris : la vue
            calendrier fait 238 jours, et laisser le titre partir pendant que le
            sélecteur reste donnait un bandeau orphelin. Le retrait négatif
            compense le padding horizontal de la page pour que le voile couvre
            toute la largeur. */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            margin: '0 calc(var(--page-x) * -1) 14px',
            padding: '0 var(--page-x) 10px',
            background: 'rgba(12,18,8,.86)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
          }}
        >
          <EnteteEcran
            titre="Programme"
            contexte={<>{plan.meta.goal} · {formatDayLong(plan.meta.raceDate)}</>}
            onOuvrirProfil={onOuvrirProfil}
          />
          <Segmented
            label="Vue du programme"
            valeur={vue}
            onChange={setVue}
            options={[
              { cle: 'semaine', libelle: 'semaine' },
              { cle: 'calendrier', libelle: 'calendrier' },
            ]}
          />
        </div>

        {vue === 'calendrier' ? (
          <>
          <GrilleCalendrier
            plan={plan}
            seances={toutesSeances}
            indices={A.byDate}
            now={now}
            onChoisirJour={(d) =>
              document.getElementById(`cal-jour-${d}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
            }
          />
          <p className="etiquette" style={{ fontSize: 14, margin: '26px 2px 10px' }}>
            le détail, jour par jour
          </p>
          <VueCalendrier
            plan={plan}
            seances={toutesSeances}
            seancesInitiales={seancesInitiales}
            ecarts={ecarts}
            now={now}
            semaineVisee={semaine.n}
            focus={focusSeance}
            onOuvrirSeance={onOuvrirSeance}
            onDeplacer={
              onSaveEcart &&
              ((x, jour, semaines) =>
                // La clé reste celle du plan de référence : la semaine
                // d'ORIGINE de la séance, jamais celle où elle atterrit.
                onSaveEcart(x.semaineOrigine, x.jourOrigine, x.slot, {
                  ...(ecarts?.get(cleEcart(x.semaineOrigine, x.jourOrigine, x.slot))?.patch ?? {}),
                  day: jour,
                  semaines: semaines || undefined,
                }))
            }
          />
          </>
        ) : (
          <>
        {/* La semaine se choisit comme dans la maquette : deux flèches rondes
            de part et d'autre du numéro, la plage de dates et le bloc en
            accent dessous, puis ce qu'elle porte en trois puces. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button
            onClick={() => onChangerSemaine(numeroSemaine - 1)}
            disabled={numeroSemaine <= 1}
            aria-label="Semaine précédente"
            className="rond"
          >
            <Icon name="chevronLeft" size={19} />
          </button>
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <div className="display" style={{ fontSize: 28, lineHeight: 1.1 }}>
              semaine {semaine.n}
              <span style={{ color: 'var(--sur-ink-3)' }}> / {plan.weeks.length}</span>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--accent)', marginTop: 3 }}>
              {formatDay(semaine.monday)} → {formatDay(addDays(semaine.monday, 6))} · {bloc.name.toLowerCase()}
            </div>
          </div>
          <button
            onClick={() => onChangerSemaine(numeroSemaine + 1)}
            disabled={numeroSemaine >= plan.weeks.length}
            aria-label="Semaine suivante"
            className="rond"
          >
            <Icon name="chevronRight" size={19} />
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
          <span
            className="puce"
            style={{
              background: 'rgba(62,122,44,.14)',
              border: '1px solid rgba(62,122,44,.45)',
              color: 'var(--accent)',
            }}
          >
            {libelleNature(semaine, { charge: true })}
          </span>
          <span className="puce">{formatNumber(kmCourse)} km prévus</span>
          <span className="puce">
            {nbCourses} course{nbCourses > 1 ? 's' : ''}
          </span>
          {semaine.sl ? <span className="puce">longue {semaine.sl} km</span> : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 7 }, (_, d) => d).map((d) => {
            const duJour = seances.filter((x) => x.s.day === d)
            const date = addDays(semaine.monday, d)
            const estAujourdhui = date === now
            return (
              <div key={d} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <PastilleJour jour={d} date={date} aujourdhui={estAujourdhui} vide={!duJour.length} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {duJour.length ? (
                    duJour.map((x) => (
                      <SessionCard
                        key={`${x.jourOrigine}-${x.slot}`}
                        compact
                        session={x.s}
                        marathonPace={marathonPace}
                        feedback={feedbackDe(x)}
                        onClick={onOuvrirSeance && (() => onOuvrirSeance(x))}
                      />
                    ))
                  ) : (
                    <div
                      style={{
                        padding: '16px 16px',
                        borderRadius: 22,
                        border: '1.5px dashed var(--border)',
                        color: 'var(--sur-ink-3)',
                        fontSize: 15,
                      }}
                    >
                      rien ce jour-là
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Le bloc, en pied de semaine : la maquette l'avait retiré de la tête,
            mais c'est lui qui dit pourquoi la semaine ressemble à ça. */}
        <div className="carte" style={{ padding: '16px 18px', marginTop: 18 }}>
          <p className="etiquette">
            bloc {bloc.id} · {bloc.name.toLowerCase()} · semaine {rangDansBloc} sur {dureeBloc}
          </p>
          <div style={{ display: 'flex', gap: 3, margin: '12px 0 0' }}>
            {Array.from({ length: dureeBloc }, (_, i) => (
              <span
                key={i}
                aria-hidden
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 'var(--pill)',
                  background: i < rangDansBloc ? 'var(--accent)' : 'var(--surface-3)',
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--sur-ink-2)', margin: '12px 0 0' }}>
            {bloc.focus}
          </p>
        </div>

        {semaineCourante && semaineCourante.n !== numeroSemaine && (
          <button
            onClick={() => onChangerSemaine(semaineCourante.n)}
            className="bouton-pale"
            style={{ marginTop: 14 }}
          >
            aller à la semaine en cours
            <span className="pastille">
              <Icon name="arrowRight" size={18} />
            </span>
          </button>
        )}
          </>
        )}
      </div>
    </div>
  )
}

const JOUR_COURT = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

/** La pastille du jour : pleine et pâle aujourd'hui, en pointillés un jour vide. */
function PastilleJour({
  jour,
  date,
  aujourdhui,
  vide,
}: {
  jour: number
  date: string
  aujourdhui: boolean
  vide: boolean
}) {
  return (
    <div
      aria-label={`${DAYS_LONG[jour]} ${Number(date.slice(8))}`}
      style={{
        width: 58,
        minHeight: 70,
        flex: 'none',
        borderRadius: 29,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: aujourdhui ? 'var(--pale)' : 'transparent',
        color: aujourdhui ? 'var(--pale-ink)' : 'var(--ink)',
        border: aujourdhui ? 'none' : `1.5px ${vide ? 'dashed' : 'solid'} var(--border-2)`,
      }}
    >
      <span style={{ fontSize: 13, color: aujourdhui ? 'inherit' : 'var(--sur-ink-2)' }}>{JOUR_COURT[jour]}</span>
      <span className="chiffre" style={{ fontSize: 24, lineHeight: 1.1 }}>
        {Number(date.slice(8))}
      </span>
    </div>
  )
}
