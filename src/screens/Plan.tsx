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
import { BoutonAction } from '../components/BoutonAction'
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
  const [lecture, setLecture] = useState<'semaine' | 'globale'>('semaine')
  /** Le jour à amener à l'écran dans la vue semaine, choisi depuis la grille. */
  const [jourVise, setJourVise] = useState<string | null>(null)
  // L'initialiseur ne tourne qu'au montage : quand « Déplacer » part d'une
  // séance ouverte depuis la vue semaine, Programme est déjà monté et y restait.
  useEffect(() => {
    if (focusSeance) {
      setVue('calendrier')
      setLecture('semaine')
    }
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
            background: 'color-mix(in srgb, var(--bg) 86%, transparent)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
          }}
        >
          <EnteteEcran
            titre="Programme"
            onOuvrirProfil={onOuvrirProfil}
          />
          <Segmented
            label="Vue du programme"
            valeur={vue}
            onChange={setVue}
            options={[
              { cle: 'semaine', libelle: 'Semaine' },
              { cle: 'calendrier', libelle: 'Calendrier' },
            ]}
          />
          {vue === 'calendrier' && (
            <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                Lecture du calendrier
              </span>
              <select
                value={lecture}
                onChange={(e) => setLecture(e.target.value as 'semaine' | 'globale')}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  padding: '10px 40px 10px 18px',
                  borderRadius: 'var(--pill)',
                  border: '1px solid var(--border-2)',
                  background: 'var(--surface-2)',
                  color: 'var(--ink)',
                  fontSize: 'var(--fs-texte)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <option value="semaine">Vue semaine</option>
                <option value="globale">Vue globale</option>
              </select>
              <Icon
                name="chevronRight"
                size={16}
                style={{ position: 'absolute', right: 16, transform: 'rotate(90deg)', pointerEvents: 'none' }}
              />
            </label>
          </div>

            </>
          )}
        </div>

        {vue === 'calendrier' ? (
          <>
          {/* Deux lectures du calendrier, au choix (retour du 22 septembre) :
              la vue semaine, jour par jour, où les séances se déplacent, et
              la vue globale, la grille du plan entier. La vue semaine est
              celle par défaut, ouverte sur la semaine en cours. */}
          {lecture === 'globale' ? (
          <GrilleCalendrier
            plan={plan}
            seances={toutesSeances}
            indices={A.byDate}
            now={now}
            onChoisirJour={(d) => {
              // Un jour choisi dans la grille ouvre la vue semaine dessus :
              // c'est là qu'on lit le détail et qu'on déplace.
              setJourVise(d)
              setLecture('semaine')
            }}
          />
          ) : (
          <VueCalendrier
            plan={plan}
            seances={toutesSeances}
            seancesInitiales={seancesInitiales}
            ecarts={ecarts}
            now={now}
            semaineVisee={semaine.n}
            estNotee={(x) => feedbackDe(x) != null}
            jourVise={jourVise ?? (focusSeance ? null : now)}
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
          )}
          </>
        ) : (
          <>
        {/* La semaine se choisit par deux flèches rondes de part et d'autre du
            numéro ; la plage de dates seule dessous, le bloc a sa carte. */}
        {/* Plus d'air autour du numéro de semaine (retour du 22 septembre). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 24px' }}>
          <button
            onClick={() => onChangerSemaine(numeroSemaine - 1)}
            disabled={numeroSemaine <= 1}
            aria-label="Semaine précédente"
            className="rond"
          >
            <Icon name="chevronLeft" size={19} />
          </button>
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <div className="display" style={{ fontSize: 'var(--fs-t-page)', lineHeight: 1.1 }}>
              Semaine {semaine.n}
              <span style={{ color: 'var(--sur-ink-3)' }}> / {plan.weeks.length}</span>
            </div>
            <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--accent)', marginTop: 3 }}>
              {formatDay(semaine.monday)} → {formatDay(addDays(semaine.monday, 6))} ·{' '}
              {(() => {
                const n = libelleNature(semaine, { charge: true })
                return n.charAt(0).toUpperCase() + n.slice(1)
              })()}
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

        {/* Le bloc en tête de semaine, avec les chiffres de la semaine dedans
            (retour du 22 septembre) : c'est lui qui dit pourquoi la semaine
            ressemble à ça. Les semaines déjà passées du bloc sont en vert
            foncé, celle d'aujourd'hui en néon. Pas de phrase de bloc, et
            trois puces qui tiennent sur une ligne : la nature de la semaine
            est montée sous les dates, où elle qualifie la semaine. */}
        <div className="carte" style={{ padding: '16px 18px', marginBottom: 16 }}>
          <h2 className="display" style={{ fontSize: 'var(--fs-t-liste)', lineHeight: 1.25, margin: 0 }}>
            {/* Espaces insécables avant chaque point : une ligne ne commence
                jamais par « · ». */}
            {`Bloc ${bloc.id}\u00a0· ${bloc.name}\u00a0· semaine ${rangDansBloc} sur ${dureeBloc}`}
          </h2>
          <div style={{ display: 'flex', gap: 3, margin: '14px 0 0' }}>
            {Array.from({ length: dureeBloc }, (_, i) => {
              const w = plan.weeks.find((x) => x.n === premiere + i)
              const finie = w != null && addDays(w.monday, 6) < now
              const enCours = w != null && now >= w.monday && now <= addDays(w.monday, 6)
              return (
                <span
                  key={i}
                  aria-hidden
                  style={{
                    flex: 1,
                    height: premiere + i === semaine.n ? 9 : 6,
                    alignSelf: 'center',
                    borderRadius: 'var(--pill)',
                    background: finie ? 'var(--braise)' : enCours ? 'var(--neon-2)' : 'var(--surface-3)',
                  }}
                />
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            <span className="puce" style={PUCE_BLOC}>
              {formatNumber(kmCourse)} km prévus
            </span>
            <span className="puce" style={PUCE_BLOC}>
              {nbCourses} course{nbCourses > 1 ? 's' : ''}
            </span>
            {semaine.sl ? (
              <span className="puce" style={PUCE_BLOC}>
                Longue {semaine.sl} km
              </span>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 7 }, (_, d) => d).map((d) => {
            const duJour = seances.filter((x) => x.s.day === d)
            const date = addDays(semaine.monday, d)
            const estAujourdhui = date === now
            return (
              // La pastille du jour s'étire sur toute la hauteur de la ligne :
              // deux séances le même jour restent sous le même jour.
              <div key={d} style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                <PastilleJour
                  jour={d}
                  date={date}
                  aujourdhui={estAujourdhui}
                  passe={date < now}
                  vide={!duJour.length}
                />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {duJour.length ? (
                    duJour.map((x) => (
                      <SessionCard
                        key={`${x.jourOrigine}-${x.slot}`}
                        compact
                        etat={
                          date < now ? 'passe' : estAujourdhui && !feedbackDe(x) ? 'aFaire' : undefined
                        }
                        session={x.s}
                        marathonPace={marathonPace}
                        feedback={feedbackDe(x)}
                        onClick={onOuvrirSeance && (() => onOuvrirSeance(x))}
                      />
                    ))
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        padding: '16px 16px',
                        borderRadius: 22,
                        border: '1.5px dashed var(--border)',
                        color: 'var(--sur-ink-3)',
                        fontSize: 'var(--fs-texte)',
                      }}
                    >
                      Rien ce jour-là
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {semaineCourante && semaineCourante.n !== numeroSemaine && (
          <BoutonAction icone="arrowRight" onClick={() => onChangerSemaine(semaineCourante.n)} style={{ marginTop: 14 }}>
            Aller à la semaine en cours
          </BoutonAction>
        )}
          </>
        )}
      </div>
    </div>
  )
}

/** Les trois puces du bloc se partagent la ligne : à 14 px, leur retrait
 *  d'origine faisait déborder la troisième sur un écran de 390. */
const PUCE_BLOC = {
  background: 'var(--surface-2)',
  flex: '1 1 auto',
  justifyContent: 'center',
  padding: '6px 10px',
} as const

const JOUR_COURT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/**
 * La pastille du jour, pleine hauteur de la ligne. Aujourd'hui en bleu
 * clair (le néon est aux gestes, retour du 22 septembre), un jour passé en
 * grisé, un jour vide en pointillés, les autres sous un filet léger.
 */
function PastilleJour({
  jour,
  date,
  aujourdhui,
  passe,
  vide,
}: {
  jour: number
  date: string
  aujourdhui: boolean
  passe: boolean
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
        background: aujourdhui ? 'var(--bleu-100)' : 'transparent',
        color: aujourdhui ? 'var(--bleu-800)' : passe ? 'var(--ink-3)' : 'var(--ink)',
        border: aujourdhui ? 'none' : `1.5px ${vide ? 'dashed' : 'solid'} var(--border)`,
        opacity: passe ? 0.7 : 1,
      }}
    >
      <span style={{ fontSize: 'var(--fs-detail)', color: aujourdhui ? 'inherit' : 'var(--ink-2)' }}>{JOUR_COURT[jour]}</span>
      <span className="chiffre" style={{ fontSize: 'var(--fs-c-m)', lineHeight: 1.1 }}>
        {Number(date.slice(8))}
      </span>
    </div>
  )
}
