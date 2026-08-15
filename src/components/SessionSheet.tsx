/**
 * Feuille modale de détail de séance, portée depuis reference/tendo-v3.html
 * (`openSheet`, `segs`, `step`, `fbForm`).
 */
import { useEffect, useMemo, useState } from 'react'
import planJson from '../data/plan.json'
import type { Plan, Session, Step as StepTuple, Week, ZoneKey } from '../data/types'
import type { SeancePlanifiee } from '../lib/adapt'
import {
  cleEcart,
  seancesAvecEcarts,
  slotsParJour,
  type EcartPatch,
  type EcartRow,
} from '../lib/overrides'
import { EcartEditor } from './EcartEditor'
import { formatDayLong, formatNumber } from '../lib/dates'
import { formatPace, zonePace } from '../lib/paces'
import type { FeedbackRow } from '../lib/buildPain'
import { Icon } from './Icon'
import { RessentiJauges } from './RessentiJauges'
import { JaugeRessenti } from './JaugeRessenti'
import { StatsSeance } from './StatsSeance'
import { ZonesSeance } from './ZonesSeance'
import { repartitionZones } from '../lib/repartition'

const plan = planJson as unknown as Plan

const TYPES_COURSE_SANS_MUR: Session['type'][] = [
  'long', 'ef', 'inter', 'tempo', 'test', 'course', 'race',
]

interface Props {
  week: Week
  /** La séance telle qu'elle sera vécue, avec son identité dans le plan. */
  seance: SeancePlanifiee
  /** Tous les écarts de la semaine : nécessaires pour vérifier les contraintes. */
  ecarts?: Map<string, EcartRow>
  feedback: FeedbackRow | null
  /** Ancre les six zones — vient du profil, `plan.meta` en repli seulement. */
  marathonPace: number
  /** Absent en mode instantanés : la feuille reste alors en lecture seule. */
  onSave?: (ligne: FeedbackRow) => void
  /** Absent en mode instantanés : le plan n'est alors pas modifiable. */
  onSaveEcart?: (
    week: number,
    dayIndex: number,
    slot: number,
    patch: EcartPatch,
    reason?: string | null,
  ) => void
  onClose: () => void
}

export function SessionSheet({
  week,
  seance,
  ecarts,
  feedback,
  marathonPace,
  onSave,
  onSaveEcart,
  onClose,
}: Props) {
  const { s, jourOrigine, slot, day } = seance
  const [surface, setSurface] = useState<'out' | 'mill'>('out')
  const [modifie, setModifie] = useState(false)

  // L'éditeur compare toujours au plan de référence, pas à la séance affichée :
  // rouvrir la feuille après un écart doit repartir de la séance d'origine,
  // sinon chaque passage empilerait un écart sur le précédent.
  const cle = cleEcart(week.n, jourOrigine, slot)
  const origine = useMemo(() => {
    const slots = slotsParJour(week.sessions)
    return week.sessions.find((x, i) => x.day === jourOrigine && slots[i] === slot) ?? s
  }, [week, jourOrigine, slot, s])
  // La semaine sans l'écart en cours d'édition : c'est la base de comparaison
  // pour ne signaler que les contraintes que CE changement ferait tomber.
  const ecartsBase = useMemo(() => {
    const m = new Map(ecarts ?? [])
    m.delete(cle)
    return m
  }, [ecarts, cle])
  const semaineAvant = useMemo(() => seancesAvecEcarts(week, ecartsBase), [week, ecartsBase])

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
      {/* Le dégradé du type de séance tient tout le haut de l'écran, à la
          manière des fiches santé qui ont servi de référence : c'est lui qui
          annonce la nature de la séance avant même le titre. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 460,
          background: `var(--g-${s.type})`,
          opacity: 0.42,
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 460,
          background:
            'linear-gradient(180deg, rgba(8,9,11,.34) 0px, rgba(8,9,11,.12) 150px, rgba(8,9,11,.62) 350px, var(--bg) 460px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', padding: 'calc(14px + env(safe-area-inset-top)) var(--page-x) 40px' }}>
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
              background: 'rgba(255,255,255,.14)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              marginBottom: 20,
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
              padding: '5px 11px 5px 9px',
              borderRadius: 'var(--pill)',
              background: 'rgba(8,9,11,.34)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#fff',
              marginBottom: 12,
            }}
          >
            <span
              style={{ width: 7, height: 7, borderRadius: '50%', background: `var(--c-${s.type})` }}
            />
            {s.cat} · {formatDayLong(day)}
          </div>

          <h2 style={{ margin: '0 0 7px', fontSize: 32, fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1 }}>
            {s.title}
          </h2>

          {(s.adapted || s.ecart) && (
            <div style={{ margin: '10px 0 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {/* Deux origines distinctes, deux couleurs : l'ambre vient du
                  moteur d'adaptation, le bleu d'une décision de Mathieu. */}
              {s.ecart && <Badge fond="rgba(78,140,255,.18)" encre="#9DC1FF">{s.ecart}</Badge>}
              {s.adapted && <Badge fond="rgba(250,178,25,.16)" encre="#FFD166">{s.adapted}</Badge>}
            </div>
          )}

          {/* Distance, durée et allure sur une seule ligne, chacune à sa
              propre échelle : le chiffre qui définit la séance reste le plus
              gros, les deux autres l'accompagnent sans le concurrencer. */}
          <StatsSeance session={s} marathonPace={marathonPace} />

          <ZonesSeance parts={repartitionZones(s, marathonPace)} />

          <div style={{ height: 1, background: 'var(--border)', margin: '24px 0 20px' }} />

          {afficherDetails && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.6px' }}>Détails</div>
              {afficherToggleSurface && (
                <div
                  className="glass"
                  style={{
                    display: 'flex',
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
                        background: surface === v ? 'rgba(255,255,255,.92)' : 'transparent',
                        color: surface === v ? '#0b0c0e' : 'var(--sur-ink-2)',
                        transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast)',
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
              className="glass"
              style={{
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
          <div
            style={{
              position: 'relative',
              borderRadius: 22,
              padding: '17px 18px 18px',
              margin: '22px 0 4px',
              overflow: 'hidden',
              background: 'linear-gradient(145deg, rgba(217,119,87,.20), rgba(217,119,87,.05) 58%, rgba(255,255,255,.04))',
              border: '1px solid rgba(217,119,87,.28)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                color: '#F0A683',
                marginBottom: 9,
              }}
            >
              Coach
            </div>
            <p style={{ margin: 0, color: '#E4E7EB', fontSize: 15.5, lineHeight: 1.55 }}>{s.note}</p>
          </div>

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
                className="glass"
                style={{
                  borderRadius: 'var(--radius)',
                  padding: '15px 16px',
                  marginBottom: 13,
                }}
              >
                <h4 style={{ margin: '0 0 12px', fontSize: 15.5, fontWeight: 800, color: '#5BE05B', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="check" size={18} />
                  Séance notée
                </h4>
                <RessentiJauges pain={feedback.pain} rpe={feedback.rpe} />
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
              // Le plan ne fixe jamais de distance pour le vélo, seulement une
              // durée : sans ce champ, un home trainer ou une sortie non
              // synchronisée avec Strava ne comptait pour rien dans le volume
              // hebdomadaire de l'écran Suivi.
              demanderDistanceVelo={s.type === 'velo'}
              onSave={(pain, rpe, note, distanceVelo) => {
                onSave?.({
                  week: week.n,
                  day_index: jourOrigine,
                  slot,
                  day,
                  session_type: s.type,
                  pain,
                  rpe,
                  distance_km: s.type === 'velo' ? distanceVelo : (s.dist ?? null),
                  note: note || null,
                })
                setModifie(false)
              }}
            />
          )}

          {onSaveEcart && (
            <>
              <div
                style={{
                  height: 1,
                  margin: '22px 0 4px',
                  background:
                    'repeating-linear-gradient(90deg, var(--border-2) 0 4px, transparent 4px 9px)',
                }}
              />
              <EcartEditor
                origine={origine}
                actuel={seance.ecart?.patch ?? null}
                actuelRaison={seance.ecart?.reason ?? null}
                semaineAvant={semaineAvant}
                simuler={(patch) =>
                  seancesAvecEcarts(week, new Map(ecartsBase).set(cle, {
                    week: week.n,
                    day_index: jourOrigine,
                    slot,
                    patch,
                    reason: null,
                  }))
                }
                onSave={(patch, reason) => onSaveEcart(week.n, jourOrigine, slot, patch, reason)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Badge({ fond, encre, children }: { fond: string; encre: string; children: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11.5,
        fontWeight: 700,
        padding: '3.5px 9px',
        borderRadius: 'var(--pill)',
        background: fond,
        color: encre,
      }}
    >
      {children}
    </span>
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
const PAIN_COURT = [
  'Rien',
  'À peine',
  'Sensible',
  'Gênant',
  'Douloureux',
  'Franchement douloureux',
  'Trop',
  'Beaucoup trop',
  'Stop',
  'Stop, et kiné',
  'Stop, et kiné',
]
const RPE_H = [
  'Aucun effort.',
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
const RPE_COURT = [
  'Repos',
  'Très facile',
  'Facile',
  'Confortable',
  'Modéré',
  'Soutenu',
  'Difficile',
  'Dur',
  'Très dur',
  'Presque maximal',
  'Maximal',
]

function FormulaireRessenti({
  feedback,
  disabled,
  demanderDistanceVelo = false,
  onSave,
}: {
  feedback: FeedbackRow | null
  disabled: boolean
  /** Le plan ne porte aucune distance pour le vélo : un champ dédié la recueille. */
  demanderDistanceVelo?: boolean
  onSave: (pain: number, rpe: number, note: string, distanceVelo: number | null) => void
}) {
  const [pain, setPain] = useState(feedback?.pain ?? 0)
  const [rpe, setRpe] = useState(feedback?.rpe ?? 5)
  const [distanceVelo, setDistanceVelo] = useState(
    feedback?.distance_km != null ? String(feedback.distance_km) : '',
  )

  const idx = (v: number) => Math.max(0, Math.min(10, Math.round(v)))

  return (
    <div>
      <p style={{ color: 'var(--sur-ink-2)', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px' }}>
        Deux curseurs après chaque séance. C'est ce qui pilote l'adaptation du plan : au-delà de 4
        sur la douleur, la semaine suivante change automatiquement.
      </p>

      <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '18px 16px 14px', marginBottom: 12 }}>
        <JaugeRessenti
          label="Douleur au tendon"
          valeur={pain}
          onChange={setPain}
          disabled={disabled}
          court={PAIN_COURT[idx(pain)]}
          detail={PAIN_H[idx(pain)]}
          degrade="pain"
        />
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '18px 16px 14px', marginBottom: 12 }}>
        <JaugeRessenti
          label="Effort perçu"
          valeur={rpe}
          onChange={setRpe}
          disabled={disabled}
          court={RPE_COURT[idx(rpe)]}
          detail={RPE_H[idx(rpe)]}
          degrade="rpe"
        />
      </div>

      {demanderDistanceVelo && (
        <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px', marginBottom: 12 }}>
          <label
            htmlFor="distance-velo"
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              color: 'var(--sur-ink-3)',
              marginBottom: 8,
            }}
          >
            Distance parcourue
          </label>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <input
              id="distance-velo"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              placeholder="0"
              disabled={disabled}
              value={distanceVelo}
              onChange={(e) => setDistanceVelo(e.target.value)}
              style={{
                width: 90,
                background: 'var(--surface-2)',
                border: '1px solid var(--border-2)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--ink)',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
            <span style={{ color: 'var(--sur-ink-2)', fontSize: 14, fontWeight: 600 }}>km</span>
          </div>
          <p style={{ color: 'var(--sur-ink-3)', fontSize: 12, lineHeight: 1.5, margin: '10px 0 0' }}>
            Le plan ne fixe pas de distance pour le vélo. Celle-ci alimente le volume hebdomadaire
            de l'écran Suivi ; la charge du tendon, elle, reste calculée sur la durée.
          </p>
        </div>
      )}

      <button
        onClick={() => {
          const d = distanceVelo.trim() === '' ? null : Number(distanceVelo.replace(',', '.'))
          onSave(pain, rpe, '', d != null && Number.isFinite(d) && d >= 0 ? d : null)
        }}
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
