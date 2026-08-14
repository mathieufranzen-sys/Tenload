/**
 * Écran Aujourd'hui.
 *
 * Le premier écran est un dégradé plein cadre piloté par la bande de charge :
 * insights en verre, indice en arc fin, puis la séance du jour qui dépasse
 * volontairement sous la ligne de flottaison — c'est elle qui appelle le
 * scroll. Le reste (règles d'adaptation, carnet, suite de la semaine) suit
 * en dessous, sur le fond sombre habituel.
 */
import { useMemo, useState, type ReactNode } from 'react'
import planJson from '../data/plan.json'
import type { Plan, Session, Week } from '../data/types'
import { addDays, daysBetween, formatDayLong, formatNumber, today as todayISO } from '../lib/dates'
import { adapt, slotOf, weekSessions } from '../lib/adapt'
import { construireInsights } from '../lib/insights'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { ActivityRow } from '../lib/load'
import type { FeedbackRow } from '../lib/buildPain'
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
  /** Ancre les six zones — vient du profil, `plan.meta` en repli seulement. */
  marathonPace: number
  /** Le carnet du jour n'existe qu'avec Supabase branché. */
  journalActif: boolean
  onVoirSuivi: () => void
  /** Absent en mode instantanés : les séances ne s'ouvrent alors pas au clic. */
  onOuvrirSeance?: (semaine: Week, session: Session, slot: number) => void
  onOuvrirProfil: () => void
}

export function Today({
  load,
  pain,
  feedback,
  activities,
  marathonPace,
  journalActif,
  onVoirSuivi,
  onOuvrirSeance,
  onOuvrirProfil,
}: Props) {
  const now = todayISO()
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])
  const [calculOuvert, setCalculOuvert] = useState(false)

  const debutPlan = plan.meta.start
  const avantPlan = now < debutPlan
  const semaine: Week = useMemo(() => {
    const courante = plan.weeks.find((w) => now >= w.monday && now <= addDays(w.monday, 6))
    return courante ?? plan.weeks[avantPlan ? 0 : plan.weeks.length - 1]
  }, [now, avantPlan])

  const seances = useMemo(() => weekSessions(semaine, now, A.byDate), [semaine, now, A.byDate])
  const duJour = avantPlan ? [] : seances.filter((s) => addDays(semaine.monday, s.day) === now)
  const suite = seances.filter((s) => addDays(semaine.monday, s.day) > now).slice(0, 4)

  const insights = useMemo(
    () => construireInsights({ semaine, seances, now, feedback, activities, byDate: A.byDate }),
    [semaine, seances, now, feedback, activities, A.byDate],
  )

  const jRace = daysBetween(now, plan.meta.raceDate)
  const jDebut = daysBetween(now, debutPlan)
  const sousTitre = formatDayLong(now)

  const feedbackDe = (s: Session) => {
    const slot = slotOf(seances, s)
    return feedback.find((f) => f.week === semaine.n && f.day_index === s.day && f.slot === slot) ?? null
  }

  return (
    // Le dégradé court sur toute la page, pas seulement sur le premier écran :
    // c'est ce qui donne au verre dépoli quelque chose à flouter jusqu'en bas.
    <div style={{ position: 'relative', maxWidth: 'var(--shell-max)', margin: '0 auto', paddingBottom: 90 }}>
      <MeshBackground band={A.band.key} />

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
            <div>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 600, letterSpacing: '-.5px' }}>
                {avantPlan ? 'Bientôt' : "Aujourd'hui"}
              </h1>
              <p style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 500, margin: '3px 0 0' }}>
                {sousTitre[0].toUpperCase() + sousTitre.slice(1)} ·{' '}
                {avantPlan ? `J-${jDebut} avant la semaine 1` : `J-${jRace} avant Paris`}
              </p>
            </div>
            <ProfileButton onClick={onOuvrirProfil} />
          </header>

          <div style={{ marginTop: 16 }}>
            <InsightTiles insights={insights} />
          </div>

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
            <TendonArc value={A.detail.idx} />

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
                {A.detail.idx}
              </div>
              <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.3px', marginTop: 6 }}>
                {A.band.headline}
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
                {A.band.detail}
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

            {A.detail.stale && <Note>Aucune douleur saisie depuis 24 h : l'indice tourne sur une estimation.</Note>}
          </div>

          <div style={{ paddingBottom: 18 }}>
            {duJour.length ? (
              <SessionHero
                session={duJour[0]}
                marathonPace={marathonPace}
                onClick={onOuvrirSeance && (() => onOuvrirSeance(semaine, duJour[0], slotOf(seances, duJour[0])))}
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
                    {avantPlan ? 'Le plan commence le 10 août' : "Rien au programme aujourd'hui"}
                  </b>
                  <div style={{ color: 'var(--sur-ink-2)', fontSize: 13 }}>
                    {avantPlan ? 'Semaine 1 : amorce, sans sortie longue.' : "Profites-en pour glacer et t'étirer."}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── au scroll : le reste de la journée et de la semaine ────────── */}
      <div style={{ position: 'relative', zIndex: 5, padding: '24px var(--page-x) 0' }}>
        <AlertBox adapt={A} />

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
      </div>

      {calculOuvert && (
        <ChargeSheet
          breakdown={A.detail}
          band={A.band}
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
function Kpi({
  label,
  value,
  suffix,
  detail,
}: {
  label: string
  value: string
  suffix: string
  detail: string
}) {
  return (
    <div className="glass" style={{ borderRadius: 17, padding: '11px 12px 10px' }}>
      <div
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '.7px',
          textTransform: 'uppercase',
          color: 'var(--sur-ink-2)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 19,
          fontWeight: 650,
          letterSpacing: '-.5px',
          marginTop: 5,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
        <small style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--sur-ink-2)' }}>{suffix}</small>
      </div>
      <div style={{ fontSize: 9, fontWeight: 500, marginTop: 5, color: 'var(--sur-ink-3)', lineHeight: 1.35 }}>
        {detail}
      </div>
    </div>
  )
}

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
