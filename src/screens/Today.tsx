/**
 * Écran Aujourd'hui, porté depuis reference/tendo-v3.html (`vToday`).
 */
import { useMemo, type ReactNode } from 'react'
import planJson from '../data/plan.json'
import type { Plan, Session, Week } from '../data/types'
import { addDays, daysBetween, formatDayLong, formatNumber, today as todayISO } from '../lib/dates'
import { adapt, slotOf, weekSessions } from '../lib/adapt'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { FeedbackRow } from '../lib/buildPain'
import { TendonGauge } from '../components/TendonGauge'
import { SessionCard } from '../components/SessionCard'
import { AlertBox } from '../components/AlertBox'
import { JournalDuJour } from '../components/JournalDuJour'
import { Icon } from '../components/Icon'

const plan = planJson as unknown as Plan

interface Props {
  load: LoadMap
  pain: PainMap
  feedback: FeedbackRow[]
  /** Ancre les six zones — vient du profil, `plan.meta` en repli seulement. */
  marathonPace: number
  /** Le carnet du jour n'existe qu'avec Supabase branché. */
  journalActif: boolean
  onVoirSuivi: () => void
  /** Absent en mode instantanés : les séances ne s'ouvrent alors pas au clic. */
  onOuvrirSeance?: (semaine: Week, session: Session, slot: number) => void
}

export function Today({ load, pain, feedback, marathonPace, journalActif, onVoirSuivi, onOuvrirSeance }: Props) {
  const now = todayISO()
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])

  const debutPlan = plan.meta.start
  const avantPlan = now < debutPlan
  const semaine: Week = useMemo(() => {
    const courante = plan.weeks.find((w) => now >= w.monday && now <= addDays(w.monday, 6))
    return courante ?? plan.weeks[avantPlan ? 0 : plan.weeks.length - 1]
  }, [now, avantPlan])

  const seances = useMemo(() => weekSessions(semaine, now, A.byDate), [semaine, now, A.byDate])
  const duJour = avantPlan ? [] : seances.filter((s) => addDays(semaine.monday, s.day) === now)
  const suite = seances.filter((s) => addDays(semaine.monday, s.day) > now).slice(0, 4)

  const jRace = daysBetween(now, plan.meta.raceDate)
  const jDebut = daysBetween(now, debutPlan)
  const sousTitre = formatDayLong(now)

  /** Ressenti déjà noté pour cette séance, s'il existe. */
  const feedbackDe = (s: Session) => {
    const slot = slotOf(seances, s)
    return feedback.find((f) => f.week === semaine.n && f.day_index === s.day && f.slot === slot) ?? null
  }

  return (
    <div style={{ maxWidth: 'var(--shell-max)', margin: '0 auto', padding: '22px var(--page-x) 90px' }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-.6px' }}>
          {avantPlan ? 'Bientôt' : "Aujourd'hui"}
        </h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, fontWeight: 500, margin: '3px 0 0' }}>
          {sousTitre[0].toUpperCase() + sousTitre.slice(1)} · J-{jRace} avant Paris
        </p>
      </header>

      <div style={{ marginBottom: 14 }}>
        <TendonGauge breakdown={A.detail} onDetail={onVoirSuivi} />
      </div>

      <AlertBox adapt={A} />

      {avantPlan ? (
        <>
          <Hero type="long" categorie="Départ du plan" titre="Lundi 10 août, semaine d'amorce">
            <p style={{ color: 'rgba(255,255,255,.8)', fontSize: 14.5, fontWeight: 500 }}>
              35 semaines jusqu'au Marathon de Paris, dimanche 11 avril 2027.
            </p>
            <div style={{ display: 'flex', gap: 22, marginTop: 16 }}>
              <HeroStat value={`J-${jDebut}`} label="avant la semaine 1" />
              <HeroStat value="35" label="semaines" />
              <HeroStat value="3 h 15" label="objectif" />
            </div>
          </Hero>
          <InfoCard titre="Le plan est déjà calibré">
            Ton test de 3 km du 8 août (12:02, soit 4:00/km) a servi de référence, on ne le refait
            pas. Les six allures sont ancrées sur ton objectif de 3 h 15, soit 4:37/km le 11 avril.
            Ta forme actuelle projette 3 h 23 : l'écart de 8 minutes, c'est le travail des 35
            prochaines semaines.
          </InfoCard>
          <InfoCard titre="Pas de sortie longue lundi" niveau="l1">
            Tu as couru 25 km dimanche. Enchaîner une sortie longue le lendemain serait exactement
            ce qu'il ne faut pas faire à un tendon qui sort de blessure. La semaine 1 est une
            amorce : vélo lundi, et ta première vraie sortie longue est le lundi 17 août à 22 km.
          </InfoCard>
          {journalActif && <JournalDuJour day={now} />}
          <Pretitle>Ta semaine 1</Pretitle>
          {seances.map((s, i) => (
            <SessionCard
              key={i}
              session={s}
              day={addDays(semaine.monday, s.day)}
              marathonPace={marathonPace}
              feedback={feedbackDe(s)}
              onClick={onOuvrirSeance && (() => onOuvrirSeance(semaine, s, slotOf(seances, s)))}
            />
          ))}
        </>
      ) : (
        <>
          {duJour.length ? (
            <>
              <SeanceDuJour
                session={duJour[0]}
                semaine={semaine}
                onClick={onOuvrirSeance && (() => onOuvrirSeance(semaine, duJour[0], slotOf(seances, duJour[0])))}
              />
              {duJour.slice(1).map((s, i) => (
                <SessionCard
                  key={i}
                  session={s}
                  day={now}
                  marathonPace={marathonPace}
                  feedback={feedbackDe(s)}
                  onClick={onOuvrirSeance && (() => onOuvrirSeance(semaine, s, slotOf(seances, s)))}
                />
              ))}
            </>
          ) : (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '16px 17px',
                marginBottom: 14,
                display: 'flex',
                gap: 13,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  background: 'var(--surface-3)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--ink-2)',
                }}
              >
                <Icon name="rest" />
              </div>
              <div>
                <b style={{ fontSize: 17 }}>Rien au programme aujourd'hui</b>
                <div style={{ color: 'var(--ink-2)', fontSize: 14 }}>
                  Profites-en pour glacer et t'étirer.
                </div>
              </div>
            </div>
          )}

          {journalActif && <JournalDuJour day={now} />}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <Kpi label="Semaine" value={`${semaine.n}`} suffix=" / 35" detail={semaine.blocName} />
            <Kpi
              label="Sortie longue"
              value={formatNumber(semaine.sl)}
              suffix=" km"
              detail={semaine.deload ? 'semaine de décharge' : 'en progression'}
            />
          </div>

          {suite.length > 0 && (
            <>
              <Pretitle>La suite de la semaine</Pretitle>
              {suite.map((s, i) => (
                <SessionCard
                  key={i}
                  session={s}
                  day={addDays(semaine.monday, s.day)}
                  marathonPace={marathonPace}
                  feedback={feedbackDe(s)}
                  onClick={onOuvrirSeance && (() => onOuvrirSeance(semaine, s, slotOf(seances, s)))}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}

function SeanceDuJour({
  session: s,
  semaine,
  onClick,
}: {
  session: Session
  semaine: Week
  onClick?: () => void
}) {
  const [lo, hi] = s.dur ?? [0, 0]
  return (
    <Hero type={s.type} categorie={s.cat} titre={s.title} onClick={onClick}>
      <p style={{ color: 'rgba(255,255,255,.8)', fontSize: 14.5, fontWeight: 500 }}>
        Semaine {semaine.n} sur 35 · {semaine.blocName}
      </p>
      <div style={{ display: 'flex', gap: 22, marginTop: 16 }}>
        {s.dist ? <HeroStat value={`${formatNumber(s.dist)} km`} label="distance" /> : null}
        {s.type !== 'repos' && (lo || hi) ? (
          <HeroStat value={lo === hi ? `${lo} min` : `${lo}-${hi} min`} label="durée" />
        ) : null}
      </div>
    </Hero>
  )
}

function Hero({
  type,
  categorie,
  titre,
  children,
  onClick,
}: {
  type: Session['type']
  categorie: string
  titre: string
  children?: ReactNode
  onClick?: () => void
}) {
  const Balise = onClick ? 'button' : 'div'
  return (
    <Balise
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        textAlign: 'left',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        marginBottom: 13,
        overflow: 'hidden',
        background: `var(--g-${type})`,
        color: '#fff',
      }}
    >

      <div
        style={{
          fontSize: 11.5,
          fontWeight: 800,
          letterSpacing: '1.3px',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,.85)',
        }}
      >
        {categorie}
      </div>
      <h2 style={{ margin: '6px 0 4px', fontSize: 26, fontWeight: 800, letterSpacing: '-.7px', lineHeight: 1.15 }}>
        {titre}
      </h2>
      {children}
    </Balise>
  )
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <b style={{ display: 'block', fontSize: 22, fontWeight: 800, letterSpacing: '-.5px' }}>{value}</b>
      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function InfoCard({
  titre,
  niveau = 'info',
  children,
}: {
  titre: string
  niveau?: 'info' | 'l1'
  children: ReactNode
}) {
  const style =
    niveau === 'l1'
      ? { bg: 'rgba(250,178,25,.09)', border: 'rgba(250,178,25,.32)', ink: '#FFD166' }
      : { bg: 'var(--surface)', border: 'var(--border-2)', ink: 'var(--ink)' }
  return (
    <div
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 'var(--radius)',
        padding: '15px 16px',
        marginBottom: 13,
      }}
    >
      <h4 style={{ margin: '0 0 6px', fontSize: 15.5, fontWeight: 800, color: style.ink }}>{titre}</h4>
      <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: '#D6D9DE' }}>{children}</p>
    </div>
  )
}

function Kpi({ label, value, suffix, detail }: { label: string; value: string; suffix: string; detail: string }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '13px 14px',
      }}
    >
      <div style={{ color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.9px', marginTop: 3, lineHeight: 1.1 }}>
        {value}
        <small style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>{suffix}</small>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3, color: 'var(--ink-2)' }}>{detail}</div>
    </div>
  )
}

function Pretitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 12,
        fontWeight: 800,
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
