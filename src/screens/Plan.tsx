/**
 * Écran Programme, porté depuis reference/tendo-v3.html (`vPlan`).
 */
import { useMemo } from 'react'
import planJson from '../data/plan.json'
import type { Plan as PlanType, Session, Week } from '../data/types'
import { DAYS_LONG, addDays, formatDay, today as todayISO } from '../lib/dates'
import { adapt, slotOf, weekSessions } from '../lib/adapt'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { FeedbackRow } from '../lib/buildPain'
import { SessionCard } from '../components/SessionCard'
import { Icon } from '../components/Icon'

const plan = planJson as unknown as PlanType

const TYPES_COURSE: Session['type'][] = ['long', 'ef', 'inter', 'tempo', 'test', 'course', 'race']

interface Props {
  load: LoadMap
  pain: PainMap
  feedback: FeedbackRow[]
  marathonPace: number
  numeroSemaine: number
  onChangerSemaine: (n: number) => void
  onOuvrirSeance?: (semaine: Week, session: Session, slot: number) => void
}

export function Plan({ load, pain, feedback, marathonPace, numeroSemaine, onChangerSemaine, onOuvrirSeance }: Props) {
  const now = todayISO()
  const semaine = plan.weeks.find((w) => w.n === numeroSemaine) ?? plan.weeks[0]
  const bloc = plan.blocs.find((b) => b.id === semaine.bloc)!
  const semaineCourante = plan.weeks.find((w) => now >= w.monday && now <= addDays(w.monday, 6))

  // `adapt` a besoin d'une fenêtre autour d'aujourd'hui, pas de la semaine affichée :
  // consulter le programme d'une semaine passée ou future ne doit pas la recalculer.
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])
  const seances = useMemo(() => weekSessions(semaine, now, A.byDate), [semaine, now, A.byDate])

  const nbCourses = seances.filter((s) => TYPES_COURSE.includes(s.type)).length

  const feedbackDe = (s: Session) => {
    const slot = slotOf(seances, s)
    return feedback.find((f) => f.week === semaine.n && f.day_index === s.day && f.slot === slot) ?? null
  }

  return (
    <div style={{ maxWidth: 'var(--shell-max)', margin: '0 auto', padding: '22px var(--page-x) 90px' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-.6px' }}>Programme</h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, fontWeight: 500, margin: '3px 0 0' }}>
          Marathon de Paris · dimanche 11 avril 2027
        </p>
      </header>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '11px 4px',
          marginBottom: 10,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => onChangerSemaine(numeroSemaine - 1)}
          disabled={numeroSemaine <= 1}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-2)',
            opacity: numeroSemaine <= 1 ? 0.25 : 1,
          }}
        >
          <Icon name="chevronLeft" size={20} />
        </button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <b style={{ display: 'block', fontSize: 17.5, fontWeight: 800, letterSpacing: '-.4px' }}>
            Semaine {semaine.n}
          </b>
          <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600 }}>
            {formatDay(semaine.monday)} — {formatDay(addDays(semaine.monday, 6))}
          </span>
        </div>
        <button
          onClick={() => onChangerSemaine(numeroSemaine + 1)}
          disabled={numeroSemaine >= 35}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-2)',
            opacity: numeroSemaine >= 35 ? 0.25 : 1,
          }}
        >
          <Icon name="chevronRight" size={20} />
        </button>
      </div>

      <div
        style={{
          background: `linear-gradient(135deg, ${bloc.color}14, var(--surface))`,
          border: `1px solid ${bloc.color}44`,
          borderRadius: 'var(--radius)',
          padding: '14px 15px',
          marginBottom: 14,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: '.5px',
            textTransform: 'uppercase',
            padding: '5px 11px',
            borderRadius: 'var(--pill)',
            background: `${bloc.color}22`,
            color: bloc.color,
            marginBottom: 11,
          }}
        >
          Bloc {bloc.id} · {bloc.name}
        </span>
        <div style={{ fontSize: 14.5, lineHeight: 1.5, color: '#D6D9DE' }}>{bloc.focus}</div>
        <div style={{ display: 'flex', gap: 20, marginTop: 13 }}>
          <BlocStat value={`${semaine.sl} km`} label="sortie longue" />
          <BlocStat value={`${nbCourses}`} label={nbCourses > 1 ? 'courses' : 'course'} />
          <BlocStat value={semaine.deload ? 'Oui' : 'Non'} label="décharge" />
        </div>
      </div>

      {Array.from({ length: 7 }, (_, d) => d).map((d) => {
        const duJour = seances.map((s, i) => [s, i] as const).filter(([s]) => s.day === d)
        if (!duJour.length) return null
        const estAujourdhui = addDays(semaine.monday, d) === now
        return (
          <div key={d}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '1.1px',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                margin: '18px 0 9px 2px',
              }}
            >
              {DAYS_LONG[d]} {formatDay(addDays(semaine.monday, d))}
              {estAujourdhui && (
                <span
                  style={{
                    marginLeft: 6,
                    display: 'inline-flex',
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '3.5px 9px',
                    borderRadius: 'var(--pill)',
                    background: 'rgba(12,163,12,.16)',
                    color: '#5BE05B',
                  }}
                >
                  aujourd'hui
                </span>
              )}
            </div>
            {duJour.map(([s]) => (
              <SessionCard
                key={`${d}-${s.title}`}
                session={s}
                day={addDays(semaine.monday, d)}
                marathonPace={marathonPace}
                feedback={feedbackDe(s)}
                onClick={onOuvrirSeance && (() => onOuvrirSeance(semaine, s, slotOf(seances, s)))}
              />
            ))}
          </div>
        )
      })}

      {semaineCourante && semaineCourante.n !== numeroSemaine && (
        <button
          onClick={() => onChangerSemaine(semaineCourante.n)}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 16,
            padding: 15,
            borderRadius: 'var(--pill)',
            fontWeight: 700,
            fontSize: 16,
            background: '#F2F2F4',
            color: '#0B0C0E',
          }}
        >
          Aller à la semaine en cours
        </button>
      )}
    </div>
  )
}

function BlocStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <b style={{ fontSize: 19, fontWeight: 800 }}>{value}</b>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>{label}</div>
    </div>
  )
}
