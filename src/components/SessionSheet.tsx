/**
 * Feuille modale de détail de séance, portée depuis reference/tendo-v3.html
 * (`openSheet`, `segs`, `step`, `fbForm`).
 */
import { useEffect, useMemo, useState } from 'react'
import planJson from '../data/plan.json'
import type { Plan, Week, ZoneKey } from '../data/types'
import type { SeancePlanifiee } from '../lib/adapt'
import {
  cleEcart,
  seancesAvecEcarts,
  slotsParJour,
  type EcartPatch,
  type EcartRow,
} from '../lib/overrides'
import { ActionsSeance } from './ActionsSeance'
import { CarteCoach } from './CarteCoach'
import { butDeLaSeance } from '../lib/coach'
import { formatDayLong, today } from '../lib/dates'
import { ChronoCourse, recalageSurCourse } from './ChronoCourse'
import {
  DOULEUR_DETAIL,
  DOULEUR_MOT,
  EFFORT_DETAIL,
  EFFORT_MOT,
} from '../lib/ressenti'
import { formatPace, zonePace } from '../lib/paces'
import type { FeedbackRow } from '../lib/buildPain'
import { Icon } from './Icon'
import { EchelleIntensite } from './MarqueSeance'
import { encreZone, styleSeance } from '../lib/seanceStyle'
import { deroulerSeance } from '../lib/deroule'
import { DecoupageSeance, ProfilSeance } from './ProfilSeance'
import { RessentiJauges } from './RessentiJauges'
import { GrilleRessenti } from './GrilleRessenti'
import { StatsSeance } from './StatsSeance'

const plan = planJson as unknown as Plan

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
  /** Ouvre la vue calendrier de Programme sur cette séance. */
  onDeplacer?: (seance: SeancePlanifiee) => void
  /** Forme projetée par le dernier test, avant ajustement par le ressenti. */
  formeActuelle?: number
  /** Enregistre une nouvelle forme projetée, calculée sur le chrono d'une course. */
  onRecalibrerForme?: (allure: number) => void
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
  onDeplacer,
  formeActuelle,
  onRecalibrerForme,
  onClose,
}: Props) {
  const { s, jourOrigine, slot, day } = seance
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


  /**
   * Un repos jambes complet n'a pas de ressenti à saisir : douleur à l'effort 0
   * et effort perçu 0 ne sont pas des estimations, ce sont des définitions.
   * Deux curseurs à zéro tous les dimanches n'apprenaient rien et donnaient
   * l'habitude de valider sans lire.
   *
   * Rien n'est écrit en base pour autant, et c'est délibéré : un 0 à l'effort
   * un jour de repos ne dit rien de la raideur au réveil, qui pèse 45 % du
   * signal. L'injecter dans le modèle ferait retomber l'indice dans le vert sur
   * un carnet muet, soit exactement l'angle mort que `painInconnue` existe pour
   * signaler.
   *
   * La règle porte sur le TYPE de la séance, écarts appliqués, et sur rien
   * d'autre. Elle regardait aussi l'absence d'écart et l'absence de ressenti :
   * déplacer le repos d'un jour, ou avoir noté un dimanche par le passé,
   * suffisait à faire réapparaître deux curseurs sur une journée qui n'a rien
   * à noter. Un repos remplacé par une vraie séance n'est plus de type
   * `repos`, et retrouve son formulaire par ce seul fait.
   */
  const ressentiImplicite = s.type === 'repos'

  const deroule = useMemo(() => deroulerSeance(s, marathonPace), [s, marathonPace])

  /**
   * L'allure réellement tenue, dès que la durée réelle est saisie et que la
   * séance porte une distance. `appliquerEcart` pose `dur` à une valeur unique
   * dans ce cas, ce qui la distingue de la fourchette estimée par le plan.
   */
  const allureReelle =
    seance.ecart?.patch.durMin != null && s.dist ? (seance.ecart.patch.durMin * 60) / s.dist : null

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
        // Rien ne doit ouvrir de défilement horizontal sur la feuille : c'est
        // arrivé avec un pictogramme qui débordait, ce clip reste en garde.
        overflowX: 'hidden',
        maxWidth: 'var(--shell-max)',
        margin: '0 auto',
      }}
    >
      {/* La lueur de la braise en haut de feuille, comme sur tous les écrans.
          Le grand pictogramme en filigrane est parti : la maquette annonce la
          séance par son titre en serif, et une icône de 200 px lui disputait
          la place. */}
      <div aria-hidden className="braise" style={{ position: 'absolute', height: 460, bottom: 'auto' }} />

      <div style={{ position: 'relative', padding: 'calc(14px + env(safe-area-inset-top)) var(--page-x) 40px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
            <p style={{ margin: '12px 0 0', fontSize: 13.5, color: 'var(--accent)', minWidth: 0 }}>
              {formatDayLong(day)} · semaine {week.n}
            </p>
            <button onClick={onClose} aria-label="Fermer" className="rond">
              <Icon name="x" size={18} />
            </button>
          </div>

          <h2 className="display" style={{ margin: '8px 0 0', fontSize: 38, lineHeight: 1.06 }}>
            {s.title}
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
            <span className="puce">
              {styleSeance(s.type).intensite > 0 && (
                <EchelleIntensite niveau={styleSeance(s.type).intensite} hauteur={11} />
              )}
              {s.cat.toLowerCase()}
            </span>
          </div>

          {(s.adapted || s.ecart) && (
            <div style={{ margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Deux origines distinctes, deux couleurs : le jaune vient du
                  moteur d'adaptation, la pêche d'une décision de Mathieu. */}
              {s.adapted && (
                <NoteSeance teinte="var(--warning)" fond="rgba(242,207,107,.07)">
                  {s.adapted}
                </NoteSeance>
              )}
              {s.ecart && (
                <NoteSeance teinte="var(--pale)" fond="color-mix(in srgb, var(--ink) 5%, transparent)">
                  {s.ecart}
                </NoteSeance>
              )}
            </div>
          )}

          {/* Distance, durée et allure sur une seule ligne, chacune à sa
              propre échelle : le chiffre qui définit la séance reste le plus
              gros, les deux autres l'accompagnent sans le concurrencer. */}
          <StatsSeance
            session={s}
            marathonPace={marathonPace}
            allureReelle={allureReelle}
          />

          {/* Le profil d'abord, le détail ensuite : la forme de la séance se
              lit en un coup d'œil, les allures se lisent quand on s'y met. */}
          {(deroule.length > 0 || s.ex || s.type === 'escalade' || s.type === 'repos') && (
            <section className="carte" style={{ padding: '18px 18px 20px', marginTop: 20 }}>
              {deroule.length > 0 && (
                <>
                  <p className="etiquette" style={{ marginBottom: 12 }}>
                    {['race', 'course'].includes(s.type) ? 'la course' : 'le déroulé'}
                  </p>
                  <ProfilSeance blocs={deroule} />
                  <DecoupageSeance session={s} blocs={deroule} marathonPace={marathonPace} />
                </>
              )}

              {s.ex && (
                <>
                  {deroule.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />}
                  <p className="etiquette" style={{ marginBottom: 4 }}>
                    {deroule.length > 0 ? 'renforcement enchaîné' : 'les exercices'}
                  </p>
                  {s.ex.map(([nom, serie, precision], i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 14,
                        padding: '11px 0',
                        borderBottom: i < s.ex!.length - 1 ? '1px solid var(--border)' : undefined,
                      }}
                    >
                      <div style={{ fontSize: 15.5 }}>
                        {nom}
                        {precision && (
                          <em style={{ display: 'block', fontStyle: 'normal', color: 'var(--ink-3)', fontSize: 13, marginTop: 2 }}>
                            {precision}
                          </em>
                        )}
                      </div>
                      <div style={{ fontSize: 14.5, color: 'var(--sur-ink-2)', whiteSpace: 'nowrap' }}>{serie}</div>
                    </div>
                  ))}
                </>
              )}

              {(s.type === 'escalade' || s.type === 'repos') && (
                <>
                  <p className="etiquette" style={{ marginBottom: 12 }}>
                    {s.type === 'repos' ? 'les consignes' : 'la séance'}
                  </p>
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
            </section>
          )}

          {/* Les actions sous le déroulé, comme dans la maquette : on décide
              de sauter ou de déplacer une séance après l'avoir regardée. */}
          {onSaveEcart && (
            <div style={{ marginTop: 14 }}>
              <ActionsSeance
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
                onDeplacer={onDeplacer && (() => onDeplacer(seance))}
              />
            </div>
          )}

          {recalageSurCourse(s) && day <= today() && formeActuelle != null && (
            <>
              <p className="etiquette" style={{ fontSize: 14, margin: '22px 2px 10px' }}>ton chrono</p>
              <ChronoCourse
                km={s.dist!}
                chronoSaisi={
                  seance.ecart?.patch.durMin != null ? Math.round(seance.ecart.patch.durMin * 60) : null
                }
                formeActuelle={formeActuelle}
                disabled={!onSaveEcart || !onRecalibrerForme}
                onValider={(chrono, allure) => {
                  // Le chrono devient la durée réelle de la course : c'est lui
                  // qui fait foi, et aucune colonne de plus n'est à créer.
                  onSaveEcart?.(week.n, jourOrigine, slot, {
                    ...(seance.ecart?.patch ?? {}),
                    durMin: chrono / 60,
                  })
                  onRecalibrerForme?.(allure)
                }}
              />
            </>
          )}
          <p className="etiquette" style={{ fontSize: 14, margin: '22px 2px 10px' }}>
            le ressenti, après
          </p>
          {ressentiImplicite ? (
            <div
              className="glass"
              style={{ borderRadius: 'var(--radius)', padding: '15px 16px' }}
            >
              <h4
                style={{
                  margin: '0 0 8px',
                  fontSize: 15.5,
                  fontWeight: 800,
                  color: 'var(--good)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Icon name="check" size={18} />
                Douleur à l&apos;effort 0, effort perçu 0
              </h4>
              <p style={{ margin: 0, color: 'var(--sur-ink-2)', fontSize: 14, lineHeight: 1.5 }}>
                Ce ne sont pas des estimations : il n&apos;y a pas eu d&apos;effort. Rien à saisir,
                sauf si tu enregistres un écart et que la journée devient autre chose.
              </p>
              <p style={{ margin: '10px 0 0', color: 'var(--sur-ink-3)', fontSize: 12.5, lineHeight: 1.5 }}>
                La raideur au réveil et la douleur du soir, elles, restent à noter dans le carnet de
                l&apos;écran Aujourd&apos;hui : un jour sans course n&apos;est pas un jour sans tendon.
              </p>
            </div>
          ) : feedback && !modifie ? (
            <RessentiJauges
              pain={feedback.pain}
              rpe={feedback.rpe}
              onModifier={onSave && (() => setModifie(true))}
            />
          ) : (
            <FormulaireRessenti
              feedback={feedback}
              disabled={!onSave}
              onSave={(pain, rpe, note) => {
                onSave?.({
                  week: week.n,
                  day_index: jourOrigine,
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

          {butDeLaSeance(s.type) && (
            <section className="carte" style={{ padding: '18px 20px', marginTop: 16 }}>
              <p className="etiquette">ce que travaille cette séance</p>
              <p style={{ margin: '8px 0 0', fontSize: 16, lineHeight: 1.55 }}>
                {butDeLaSeance(s.type)!.replace(/^À quoi ça sert\s*:\s*/i, '')}
              </p>
            </section>
          )}
          <CarteCoach texte={s.note} style={{ marginTop: 12 }} />

        </div>
      </div>
    </div>
  )
}

/** Une note sous le titre : ce que le moteur ou Mathieu a changé à la séance. */
function NoteSeance({ teinte, fond, children }: { teinte: string; fond: string; children: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '13px 16px',
        borderRadius: 20,
        border: `1px solid ${teinte}`,
        borderColor: `color-mix(in srgb, ${teinte} 45%, transparent)`,
        background: fond,
      }}
    >
      <span aria-hidden style={{ width: 4, borderRadius: 2, background: teinte, flex: 'none' }} />
      <span style={{ fontSize: 14.5, lineHeight: 1.45, color: 'var(--ink)' }}>{children}</span>
    </div>
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
  const couleur = zone ? encreZone(zone) : 'var(--ink-3)'

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

/**
 * Le ressenti ne recueille que ce que seul Mathieu peut dire : la douleur et
 * l'effort. La distance parcourue a quitté ce formulaire pour « Donnée
 * réelle », où vivent déjà les kilomètres et la durée. Deux champs pour la
 * même valeur en font toujours un qui ment, et c'est celui-ci qui mentait :
 * il se posait sous le curseur d'effort, loin de la distance affichée en tête
 * de feuille, sans dire laquelle des deux comptait.
 */
function FormulaireRessenti({
  feedback,
  disabled,
  onSave,
}: {
  feedback: FeedbackRow | null
  disabled: boolean
  onSave: (pain: number, rpe: number, note: string) => void
}) {
  /**
   * `null` tant que rien n'a été saisi : la barre affiche alors 0 en gris, et
   * non un vert de « aucune douleur » qui serait une affirmation. Même règle
   * que le carnet de l'écran Aujourd'hui, et même règle que partout dans
   * l'app — on ne présente pas une absence de mesure comme une mesure.
   */
  const [pain, setPain] = useState<number | null>(feedback?.pain ?? null)
  const [rpe, setRpe] = useState<number | null>(feedback?.rpe ?? null)

  return (
    <div>
      <p style={{ color: 'var(--sur-ink-2)', fontSize: 14, lineHeight: 1.5, margin: '0 0 18px' }}>
        Deux notes après chaque séance. C'est ce qui pilote l'adaptation du plan.
      </p>

      <div className="carte" style={{ padding: '20px 18px 18px', marginBottom: 12 }}>
        <GrilleRessenti
          label="La douleur pendant l’effort, elle était où ?"
          valeur={pain}
          onChange={setPain}
          disabled={disabled}
          teinte="douleur"
          mots={DOULEUR_MOT}
          details={DOULEUR_DETAIL}
        />
      </div>

      <div className="carte" style={{ padding: '20px 18px 18px', marginBottom: 12 }}>
        <GrilleRessenti
          label="Et l’effort perçu ?"
          valeur={rpe}
          onChange={setRpe}
          disabled={disabled}
          teinte="neutre"
          mots={EFFORT_MOT}
          details={EFFORT_DETAIL}
        />
      </div>

      <button
        onClick={() => {
          // Valider sans avoir touché une pastille vaut zéro : c'est une
          // affirmation volontaire, contrairement à l'affichage d'avant.
          onSave(pain ?? 0, rpe ?? 0, '')
        }}
        disabled={disabled}
        style={{
          display: 'block',
          width: '100%',
          marginTop: 12,
          padding: 15,
          borderRadius: 'var(--pill)',
          fontWeight: 600,
          fontSize: 16,
          background: disabled ? 'var(--surface-3)' : 'var(--neon)',
          color: disabled ? 'var(--ink-3)' : 'var(--ink)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        enregistrer mon ressenti
      </button>
      {disabled && (
        <p style={{ color: 'var(--ink-3)', fontSize: 12.5, marginTop: 8 }}>
          Connecte-toi pour enregistrer un ressenti.
        </p>
      )}
    </div>
  )
}
