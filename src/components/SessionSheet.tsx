/**
 * Feuille modale de détail de séance, portée depuis reference/tendo-v3.html
 * (`openSheet`, `segs`, `step`, `fbForm`).
 */
import { useEffect, useState } from 'react'
import planJson from '../data/plan.json'
import type { Plan, Session, Step as StepTuple, Week, ZoneKey } from '../data/types'
import { formatDayLong, formatNumber } from '../lib/dates'
import { formatPace, zonePace } from '../lib/paces'
import type { FeedbackRow } from '../lib/buildPain'
import { Icon } from './Icon'

const plan = planJson as unknown as Plan

const TYPES_COURSE_SANS_MUR: Session['type'][] = [
  'long', 'ef', 'inter', 'tempo', 'test', 'course', 'race',
]

interface Props {
  week: Week
  session: Session
  slot: number
  day: string
  feedback: FeedbackRow | null
  /** Ancre les six zones — vient du profil, `plan.meta` en repli seulement. */
  marathonPace: number
  /** Absent en mode instantanés : la feuille reste alors en lecture seule. */
  onSave?: (ligne: FeedbackRow) => void
  onClose: () => void
}

export function SessionSheet({ week, session: s, slot, day, feedback, marathonPace, onSave, onClose }: Props) {
  const [surface, setSurface] = useState<'out' | 'mill'>('out')
  const [modifie, setModifie] = useState(false)

  // Ferme au clavier, et bloque le scroll du fond pendant que la feuille est ouverte.
  useEffect(() => {
    const surEchap = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', surEchap)
    const overflowPrecedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', surEchap)
      document.body.style.overflow = overflowPrecedent
    }
  }, [onClose])

  const estCourse = TYPES_COURSE_SANS_MUR.includes(s.type)
  const afficherToggleSurface = estCourse && !['race', 'course'].includes(s.type)
  const afficherDetails = estCourse || Boolean(s.ex)

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'var(--bg)',
        overflowY: 'auto',
        maxWidth: 'var(--shell-max)',
        margin: '0 auto',
      }}
    >
      <div style={{ position: 'relative', padding: '14px var(--page-x) 40px' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 230,
            background: `var(--g-${s.type})`,
            opacity: 0.3,
            filter: 'blur(46px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative' }}>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(255,255,255,.08)',
              marginBottom: 18,
            }}
          >
            <Icon name="x" size={18} />
          </button>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 11.5,
              fontWeight: 700,
              padding: '5px 10px 5px 8px',
              borderRadius: 'var(--pill)',
              background: `color-mix(in srgb, var(--c-${s.type}) 18%, transparent)`,
              color: '#fff',
              marginBottom: 10,
            }}
          >
            <span
              style={{ width: 7, height: 7, borderRadius: '50%', background: `var(--c-${s.type})` }}
            />
            {s.cat} · {formatDayLong(day)}
          </div>

          <h2 style={{ margin: '0 0 7px', fontSize: 30, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.12 }}>
            {s.title}
          </h2>

          {s.adapted && (
            <div style={{ margin: '10px 0 0' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '3.5px 9px',
                  borderRadius: 'var(--pill)',
                  background: 'rgba(250,178,25,.16)',
                  color: '#FFD166',
                }}
              >
                {s.adapted}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 34, margin: '20px 0' }}>
            {s.dist ? (
              <Kv label="Distance" value={`${formatNumber(s.dist)} km`} />
            ) : s.type === 'repos' ? (
              <Kv label="Charge" value="Aucune" />
            ) : null}
            {s.type !== 'repos' && s.dur && (
              <Kv
                label="Durée"
                value={s.dur[0] === s.dur[1] ? `${s.dur[0]} min` : `${s.dur[0]}-${s.dur[1]} min`}
              />
            )}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

          {afficherDetails && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px' }}>Détails</div>
              {afficherToggleSurface && (
                <div
                  style={{
                    display: 'flex',
                    background: 'var(--surface-2)',
                    borderRadius: 'var(--pill)',
                    padding: 3,
                    gap: 2,
                    flex: 1,
                    maxWidth: 206,
                  }}
                >
                  {(['out', 'mill'] as const).map((v) => (
                    <button
                      key={v}
                      aria-pressed={surface === v}
                      onClick={() => setSurface(v)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 'var(--pill)',
                        fontSize: 13,
                        fontWeight: 700,
                        background: surface === v ? 'var(--surface)' : 'transparent',
                        color: surface === v ? 'var(--ink)' : 'var(--ink-2)',
                      }}
                    >
                      {v === 'out' ? 'Extérieur' : 'Tapis'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {s.struct && (
            <>
              <SectionTitre icone="run">Session</SectionTitre>
              {s.struct.map((seg, i) => (
                <StepView key={i} main={`${formatNumber(seg.km)} km`} zone={seg.zone} marathonPace={marathonPace} />
              ))}
            </>
          )}

          {s.wu && s.wu.length > 0 && (
            <>
              <SectionTitre icone="up">Échauffement</SectionTitre>
              <Segs steps={s.wu} marathonPace={marathonPace} />
            </>
          )}
          {s.main && s.main.length > 0 && (
            <>
              <SectionTitre icone="run">{['race', 'course'].includes(s.type) ? 'Course' : 'Corps de séance'}</SectionTitre>
              <Segs steps={s.main} marathonPace={marathonPace} />
            </>
          )}
          {s.cd && s.cd.length > 0 && (
            <>
              <SectionTitre icone="down">Retour au calme</SectionTitre>
              <Segs steps={s.cd} marathonPace={marathonPace} />
            </>
          )}

          {s.ex && (
            <>
              <SectionTitre icone="dumb">Exercices</SectionTitre>
              <div style={{ marginTop: -4 }}>
                {s.ex.map(([nom, serie, precision], i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 14,
                      padding: '12px 0',
                      borderBottom: i < s.ex!.length - 1 ? '1px solid var(--border)' : undefined,
                    }}
                  >
                    <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: '-.15px' }}>
                      {nom}
                      {precision && (
                        <em style={{ display: 'block', fontStyle: 'normal', color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                          {precision}
                        </em>
                      )}
                    </div>
                    <div style={{ fontSize: 15.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{serie}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {(s.type === 'escalade' || s.type === 'repos') && (
            <>
              <SectionTitre icone={s.type === 'repos' ? 'rest' : 'climb'}>
                {s.type === 'repos' ? 'Consignes' : 'Séance'}
              </SectionTitre>
              <StepView
                main={s.type === 'repos' ? 'Aucune charge sur les jambes' : 'Escalade en salle'}
                zone={null}
                sub={
                  s.type === 'repos'
                    ? 'Mobilité cheville, étirements doux, glaçage si sensible'
                    : 'Voies en tête et en moulinette, effort libre'
                }
                marathonPace={marathonPace}
              />
            </>
          )}

          {surface === 'mill' && estCourse && (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-2)',
                borderRadius: 'var(--radius)',
                padding: '15px 16px',
                marginTop: 18,
              }}
            >
              <h4 style={{ margin: '0 0 6px', fontSize: 15.5, fontWeight: 800 }}>Sur tapis</h4>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: '#D6D9DE' }}>
                Règle l'inclinaison à 1 % pour compenser l'absence de résistance de l'air. Le tapis
                réduit la charge excentrique sur le tendon à l'attaque du pied : c'est une bonne
                option les jours où la douleur au réveil dépasse 2.
              </p>
            </div>
          )}

          <div
            style={{
              height: 1,
              margin: '18px 0',
              background:
                'repeating-linear-gradient(90deg, var(--border-2) 0 4px, transparent 4px 9px)',
            }}
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '22px 0 12px' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                flex: 'none',
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg,#D97757,#C15F3C)',
                fontWeight: 800,
                fontSize: 16,
                color: '#fff',
              }}
            >
              C
            </div>
            <div>
              <b style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>Coach Claude</b>
              <span style={{ color: 'var(--ink-2)', fontSize: 13.5, fontWeight: 500 }}>
                Ton plan, tes contraintes
              </span>
            </div>
          </div>
          <p style={{ color: '#D6D9DE', fontSize: 15.5, lineHeight: 1.55 }}>{s.note}</p>

          <div
            style={{
              height: 1,
              margin: '18px 0',
              background:
                'repeating-linear-gradient(90deg, var(--border-2) 0 4px, transparent 4px 9px)',
            }}
          />
          <SectionTitre icone="heart">Ton ressenti</SectionTitre>
          {feedback && !modifie ? (
            <>
              <div
                style={{
                  background: 'rgba(12,163,12,.09)',
                  border: '1px solid rgba(12,163,12,.32)',
                  borderRadius: 'var(--radius)',
                  padding: '15px 16px',
                  marginBottom: 13,
                }}
              >
                <h4 style={{ margin: '0 0 6px', fontSize: 15.5, fontWeight: 800, color: '#5BE05B', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="check" size={18} />
                  Séance notée
                </h4>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: '#D6D9DE' }}>
                  Douleur au tendon {formatNumber(feedback.pain)}/10 · effort perçu {feedback.rpe}/10
                  {feedback.note && (
                    <>
                      <br />
                      <span style={{ color: 'var(--ink-2)' }}>« {feedback.note} »</span>
                    </>
                  )}
                </p>
              </div>
              {onSave && (
                <button
                  onClick={() => setModifie(true)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: 15,
                    borderRadius: 'var(--pill)',
                    fontWeight: 700,
                    fontSize: 16,
                    background: 'transparent',
                    color: 'var(--ink-2)',
                    border: '1px solid var(--border-2)',
                  }}
                >
                  Modifier
                </button>
              )}
            </>
          ) : (
            <FormulaireRessenti
              feedback={feedback}
              disabled={!onSave}
              onSave={(pain, rpe, note) => {
                onSave?.({
                  week: week.n,
                  day_index: s.day,
                  slot,
                  day,
                  session_type: s.type,
                  pain,
                  rpe,
                  distance_km: s.dist ?? null,
                  note: note || null,
                })
                setModifie(false)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ display: 'block', color: 'var(--ink-2)', fontSize: 13.5, fontWeight: 500 }}>{label}</span>
      <b style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px' }}>{value}</b>
    </div>
  )
}

function SectionTitre({
  icone,
  children,
}: {
  icone: 'up' | 'run' | 'down' | 'dumb' | 'heart' | 'climb' | 'rest'
  children: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17.5, fontWeight: 800, letterSpacing: '-.35px', margin: '20px 0 12px' }}>
      <Icon name={icone} size={21} />
      {children}
    </div>
  )
}

function Segs({ steps, marathonPace }: { steps: StepTuple[]; marathonPace: number }) {
  return (
    <>
      {steps.map(([a, b], i) => {
        const main = typeof a === 'number' ? `${formatNumber(a)} km` : String(a)
        if (b == null) return <StepView key={i} main={main} zone={null} marathonPace={marathonPace} />
        if (typeof b === 'string' && b in plan.zones)
          return <StepView key={i} main={main} zone={b as ZoneKey} marathonPace={marathonPace} />
        return <StepView key={i} main={main} zone={null} sub={String(b)} marathonPace={marathonPace} />
      })}
    </>
  )
}

function StepView({
  main,
  zone,
  sub,
  marathonPace,
}: {
  main: string
  zone: ZoneKey | null
  sub?: string
  marathonPace: number
}) {
  const z = zone ? plan.zones[zone] : null
  const allure = zone ? formatPace(zonePace(marathonPace, zone)) : null
  const label = z ? `${main} : ${allure}/km` : main
  const texte = z
    ? zone === 'am'
      ? 'Ton allure cible marathon'
      : zone === 'ef' || zone === 'recup'
        ? `Pas plus vite que ${allure}/km. C'est une limite, pas un objectif.`
        : z.label
    : sub
  const couleur = z ? `var(--c-${z.color})` : 'var(--ink-3)'

  return (
    <div style={{ position: 'relative', paddingLeft: 18, marginBottom: 14 }}>
      <span
        aria-hidden
        style={{ position: 'absolute', left: 0, top: 2, bottom: 2, width: 4.5, borderRadius: 3, background: couleur }}
      />
      <b style={{ display: 'block', fontSize: 16, fontWeight: 700, letterSpacing: '-.2px' }}>{label}</b>
      {texte && <span style={{ display: 'block', color: 'var(--ink-2)', fontSize: 14.5, fontWeight: 500, marginTop: 1 }}>{texte}</span>}
    </div>
  )
}

const PAIN_H = [
  'Rien du tout. Le tendon ne se manifeste pas.',
  'Une présence, pas une douleur. Tout va bien.',
  'Sensible mais silencieux à l’effort. Zone de travail acceptable.',
  'Gêne nette. On surveille, on ne change rien encore.',
  'Douleur. Le plan s’adapte : plateau de la sortie longue, qualité en vélo.',
  'Douleur franche. Plateau et qualité neutralisée.',
  'Trop. Sortie longue réduite de 25 %, qualité annulée.',
  'Trop. Recul net sur la semaine à venir.',
  'Stop. Cinq jours sans course, vélo et haut du corps seulement.',
  'Stop et kiné. On ne discute pas.',
  'Stop et kiné. On ne discute pas.',
]
const RPE_H = [
  '',
  'Très facile, tu pourrais recommencer tout de suite.',
  'Facile. Conversation possible sans effort.',
  'Confortable. Le socle de l’endurance.',
  'Modéré. Tu sens le travail sans le subir.',
  'Soutenu. Phrases courtes.',
  'Difficile. Quelques mots seulement.',
  'Dur. Allure de seuil.',
  'Très dur. Tu comptes les répétitions.',
  'Presque maximal. Séance réussie de justesse.',
  'Maximal. Tu n’aurais pas pu faire plus.',
]

function FormulaireRessenti({
  feedback,
  disabled,
  onSave,
}: {
  feedback: FeedbackRow | null
  disabled: boolean
  onSave: (pain: number, rpe: number, note: string) => void
}) {
  const [pain, setPain] = useState(feedback?.pain ?? 0)
  const [rpe, setRpe] = useState(feedback?.rpe ?? 5)
  const [note, setNote] = useState(feedback?.note ?? '')

  return (
    <div>
      <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.5, margin: '0 0 4px' }}>
        Deux curseurs après chaque séance. C'est ce qui pilote l'adaptation du plan : au-delà de 4
        sur la douleur, la semaine suivante change automatiquement.
      </p>
      <SliderRessenti label="Douleur au tendon d’Achille" valeur={pain} onChange={setPain} hints={PAIN_H} degrade="pain" />
      <SliderRessenti label="Effort perçu" valeur={rpe} onChange={setRpe} hints={RPE_H} degrade="rpe" />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note libre : sensations, terrain, ce qui a coincé…"
        disabled={disabled}
        style={{
          width: '100%',
          background: 'var(--surface-2)',
          border: '1px solid var(--border-2)',
          borderRadius: 14,
          padding: 13,
          minHeight: 82,
          resize: 'vertical',
          fontSize: 15,
          lineHeight: 1.45,
          marginTop: 14,
        }}
      />
      <button
        onClick={() => onSave(pain, rpe, note.trim())}
        disabled={disabled}
        style={{
          display: 'block',
          width: '100%',
          marginTop: 12,
          padding: 15,
          borderRadius: 'var(--pill)',
          fontWeight: 700,
          fontSize: 16,
          background: disabled ? 'var(--surface-2)' : '#F2F2F4',
          color: disabled ? 'var(--ink-3)' : '#0B0C0E',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        Enregistrer mon ressenti
      </button>
      {disabled && (
        <p style={{ color: 'var(--ink-3)', fontSize: 12.5, marginTop: 8 }}>
          Connecte-toi pour enregistrer un ressenti.
        </p>
      )}
    </div>
  )
}

function SliderRessenti({
  label,
  valeur,
  onChange,
  hints,
  degrade,
}: {
  label: string
  valeur: number
  onChange: (v: number) => void
  hints: string[]
  degrade: 'pain' | 'rpe'
}) {
  const track =
    degrade === 'pain'
      ? 'linear-gradient(90deg,#0ca30c 0%,#8fc41a 25%,#fab219 45%,#ec835a 68%,#d03b3b 100%)'
      : 'linear-gradient(90deg,#3987e5 0%,#199e70 35%,#fab219 70%,#d03b3b 100%)'

  return (
    <div style={{ margin: '20px 0 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 }}>
        <b style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-.2px' }}>{label}</b>
        <span style={{ fontSize: 29, fontWeight: 800, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
          {valeur}
          <span style={{ fontSize: 15, color: 'var(--ink-2)' }}>/10</span>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--track' as string]: track }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)', fontSize: 11, fontWeight: 600, marginTop: -2 }}>
        {[0, 2, 4, 6, 8, 10].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      <div style={{ color: 'var(--ink-2)', fontSize: 13, fontWeight: 500, marginTop: 9, minHeight: 34 }}>
        {hints[valeur] ?? ''}
      </div>
    </div>
  )
}
