/**
 * Écran Programme, porté depuis reference/tendo-v3.html (`vPlan`).
 */
import { useMemo, type CSSProperties } from 'react'
import planJson from '../data/plan.json'
import type { Plan as PlanType, Session, Week } from '../data/types'
import { DAYS_LONG, addDays, formatDay, formatNumber, today as todayISO } from '../lib/dates'
import { adapt, weekSessions, type SeancePlanifiee } from '../lib/adapt'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { FeedbackRow } from '../lib/buildPain'
import type { EcartRow } from '../lib/overrides'
import { SessionCard } from '../components/SessionCard'
import { Icon } from '../components/Icon'
import { ProfileButton } from '../components/ProfileButton'
import { MeshBackground } from '../components/MeshBackground'

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
  onOuvrirSeance?: (semaine: Week, seance: SeancePlanifiee) => void
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
  onOuvrirProfil,
}: Props) {
  const now = todayISO()
  const semaine = plan.weeks.find((w) => w.n === numeroSemaine) ?? plan.weeks[0]
  const bloc = plan.blocs.find((b) => b.id === semaine.bloc)!
  const semaineCourante = plan.weeks.find((w) => now >= w.monday && now <= addDays(w.monday, 6))

  // `adapt` a besoin d'une fenêtre autour d'aujourd'hui, pas de la semaine affichée :
  // consulter le programme d'une semaine passée ou future ne doit pas la recalculer.
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])
  const seances = useMemo(
    () => weekSessions(semaine, now, A.byDate, ecarts),
    [semaine, now, A.byDate, ecarts],
  )

  // Une séance déclarée non faite ne compte plus dans le décompte de la semaine.
  const courses = seances.filter((x) => !x.s.saute && TYPES_COURSE.includes(x.s.type))
  const nbCourses = courses.length
  // Tout le kilométrage à pied de la semaine, sortie longue comprise : c'est le
  // volume qui parle au tendon, pas la seule ligne d'endurance facile.
  const kmCourse = courses.reduce((total, x) => total + (x.s.dist ?? 0), 0)

  const feedbackDe = ({ jourOrigine, slot }: SeancePlanifiee) =>
    feedback.find((f) => f.week === semaine.n && f.day_index === jourOrigine && f.slot === slot) ?? null

  const [premiere, derniere] = bloc.weeks
  const rangDansBloc = semaine.n - premiere + 1
  const dureeBloc = derniere - premiere + 1

  return (
    <div style={{ position: 'relative', maxWidth: 'var(--shell-max)', margin: '0 auto', paddingBottom: 90 }}>
      <MeshBackground band={A.band.key} formes={false} />

      <div style={{ position: 'relative', zIndex: 5, padding: '22px var(--page-x) 0' }}>
        <header style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 600, letterSpacing: '-.5px' }}>Programme</h1>
            <p style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 500, margin: '3px 0 0' }}>
              Marathon de Paris · dimanche 11 avril 2027
            </p>
          </div>
          <ProfileButton onClick={onOuvrirProfil} />
        </header>

        {/* En-tête de bloc : ce qui situe la semaine dans les 35. Le nom du
            bloc et sa couleur restent le repère, la barre dit où on en est. */}
        <div className="glass" style={{ borderRadius: 22, padding: '16px 17px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '.4px',
                textTransform: 'uppercase',
                padding: '5px 11px 5px 8px',
                borderRadius: 'var(--pill)',
                background: `color-mix(in srgb, ${bloc.color} 18%, transparent)`,
                border: `1px solid color-mix(in srgb, ${bloc.color} 38%, transparent)`,
                color: bloc.color,
              }}
            >
              <span
                aria-hidden
                style={{ width: 6, height: 6, borderRadius: '50%', background: bloc.color, flex: 'none' }}
              />
              Bloc {bloc.id} · {bloc.name}
            </span>
            {semaine.deload && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3.5px 9px',
                  borderRadius: 'var(--pill)',
                  background: 'rgba(250,178,25,.18)',
                  border: '1px solid rgba(250,178,25,.26)',
                  color: '#FFD166',
                  whiteSpace: 'nowrap',
                }}
              >
                Décharge
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 4px' }}>
            <button
              onClick={() => onChangerSemaine(numeroSemaine - 1)}
              disabled={numeroSemaine <= 1}
              aria-label="Semaine précédente"
              style={fleche(numeroSemaine <= 1)}
            >
              <Icon name="chevronLeft" size={19} />
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 650, letterSpacing: '-.6px', lineHeight: 1.1 }}>
                Semaine {semaine.n}
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--sur-ink-3)' }}> / 35</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--sur-ink-2)', fontWeight: 500, marginTop: 2 }}>
                {formatDay(semaine.monday)} — {formatDay(addDays(semaine.monday, 6))}
              </div>
            </div>
            <button
              onClick={() => onChangerSemaine(numeroSemaine + 1)}
              disabled={numeroSemaine >= 35}
              aria-label="Semaine suivante"
              style={fleche(numeroSemaine >= 35)}
            >
              <Icon name="chevronRight" size={19} />
            </button>
          </div>

          {/* Avancement dans le bloc, pas dans le plan : c'est l'échelle à
              laquelle le contenu des séances change vraiment. */}
          <div style={{ display: 'flex', gap: 3, margin: '14px 0 8px' }}>
            {Array.from({ length: dureeBloc }, (_, i) => (
              <span
                key={i}
                aria-hidden
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 'var(--pill)',
                  background: i < rangDansBloc ? bloc.color : 'rgba(255,255,255,.14)',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--sur-ink-3)' }}>
            {rangDansBloc}<sup style={{ fontSize: 8 }}>{rangDansBloc === 1 ? 're' : 'e'}</sup> semaine sur {dureeBloc} du bloc
          </div>

          <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--sur-ink-2)', margin: '13px 0 0' }}>
            {bloc.focus}
          </p>

          <div style={{ display: 'flex', gap: 22, marginTop: 15 }}>
            <BlocStat value={semaine.sl ? `${semaine.sl} km` : '—'} label="sortie longue" />
            <BlocStat value={`${nbCourses}`} label={nbCourses > 1 ? 'courses' : 'course'} />
            <BlocStat value={`${formatNumber(kmCourse)} km`} label="de course" />
          </div>
        </div>

        {Array.from({ length: 7 }, (_, d) => d).map((d) => {
          const duJour = seances.filter((x) => x.s.day === d)
          if (!duJour.length) return null
          const estAujourdhui = addDays(semaine.monday, d) === now
          return (
            <div key={d}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  color: 'var(--sur-ink-3)',
                  margin: '20px 0 10px 2px',
                }}
              >
                {DAYS_LONG[d]} {formatDay(addDays(semaine.monday, d))}
                {estAujourdhui && (
                  <span
                    style={{
                      display: 'inline-flex',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '.6px',
                      padding: '3.5px 9px',
                      borderRadius: 'var(--pill)',
                      background: 'rgba(52,211,153,.18)',
                      border: '1px solid rgba(52,211,153,.3)',
                      color: '#6ee7b7',
                    }}
                  >
                    aujourd'hui
                  </span>
                )}
              </div>
              {duJour.map((x) => (
                <SessionCard
                  key={`${x.jourOrigine}-${x.slot}`}
                  session={x.s}
                  day={addDays(semaine.monday, d)}
                  marathonPace={marathonPace}
                  feedback={feedbackDe(x)}
                  onClick={onOuvrirSeance && (() => onOuvrirSeance(semaine, x))}
                />
              ))}
            </div>
          )
        })}

        {semaineCourante && semaineCourante.n !== numeroSemaine && (
          <button
            onClick={() => onChangerSemaine(semaineCourante.n)}
            className="glass"
            style={{
              display: 'block',
              width: '100%',
              marginTop: 18,
              padding: 15,
              borderRadius: 'var(--pill)',
              fontWeight: 650,
              fontSize: 15.5,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            Aller à la semaine en cours
          </button>
        )}
      </div>
    </div>
  )
}

const fleche = (inactif: boolean): CSSProperties => ({
  width: 36,
  height: 36,
  borderRadius: '50%',
  flex: 'none',
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(255,255,255,.08)',
  border: '1px solid var(--glass-border)',
  color: 'var(--ink)',
  opacity: inactif ? 0.28 : 1,
  cursor: inactif ? 'default' : 'pointer',
})

function BlocStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <b style={{ fontSize: 19, fontWeight: 650, letterSpacing: '-.4px', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </b>
      <div style={{ fontSize: 11.5, color: 'var(--sur-ink-2)', fontWeight: 500, marginTop: 1 }}>{label}</div>
    </div>
  )
}
