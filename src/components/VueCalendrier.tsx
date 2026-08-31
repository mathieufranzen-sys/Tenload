/**
 * Le plan jour par jour, et le déplacement des séances à la main.
 *
 * Le menu déroulant de sept jours qui vivait dans la feuille de séance ne
 * disait rien de la semaine qu'il fabriquait : on choisissait « jeudi » sans
 * voir ce que jeudi portait déjà. Ici on voit ce qu'on déplace, et à côté de
 * quoi on le pose.
 *
 * Le déplacement est en pointeur et non en drag-and-drop HTML5, qui n'existe
 * pas sur iPhone. Un appui maintenu de 220 ms ouvre le geste, ce qui laisse le
 * défilement vertical fonctionner normalement le reste du temps.
 *
 * Sur les contraintes, la règle du dépôt tient : les jours en conflit se
 * signalent pendant le geste, mais rien n'est interdit. C'est le tendon de
 * Mathieu qui tranche, pas l'app.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Plan, Session, Week } from '../data/types'
import type { SeancePlanifiee } from '../lib/adapt'
import { DAYS_LONG, addDays, formatDay, weekdayIndex } from '../lib/dates'
import {
  alertesAjoutees,
  cleEcart,
  dispositionSemaine,
  type EcartRow,
} from '../lib/overrides'
import { styleSeance } from '../lib/seanceStyle'
import { Icon } from './Icon'

/** Le geste s'ouvre après ce délai, pour ne pas voler le défilement. */
const DELAI_PRISE_MS = 220
/** Au-delà de ce mouvement avant le délai, c'est un défilement, pas une prise. */
const TOLERANCE_PX = 10

export interface CibleDrop {
  /** Date ISO du jour visé. */
  day: string
  /** Jour dans la semaine d'accueil, 0-6. */
  jour: number
  /** Décalage de semaines par rapport à la semaine d'origine de la séance. */
  semaines: number
  /** Contraintes que ce dépôt ferait tomber. Il reste permis. */
  conflits: string[]
}

interface Props {
  plan: Plan
  /** Toutes les séances du plan, écarts et adaptation appliqués. */
  seances: SeancePlanifiee[]
  /** Les mêmes, sans aucun écart : ce que le plan disait au départ. */
  seancesInitiales: SeancePlanifiee[]
  ecarts?: Map<string, EcartRow>
  now: string
  /** Semaine à amener à l'écran à l'ouverture. */
  semaineVisee: number
  /** Clé `semaine-jour-slot` de la séance à mettre en avant, après « Déplacer ». */
  focus?: string | null
  onOuvrirSeance?: (seance: SeancePlanifiee) => void
  /** Absent en lecture seule : le calendrier reste alors consultable. */
  onDeplacer?: (seance: SeancePlanifiee, jour: number, semaines: number) => void
}

export function VueCalendrier({
  plan,
  seances,
  seancesInitiales,
  ecarts,
  now,
  semaineVisee,
  focus,
  onOuvrirSeance,
  onDeplacer,
}: Props) {
  const [initial, setInitial] = useState(false)
  const [prise, setPrise] = useState<SeancePlanifiee | null>(null)
  const [survol, setSurvol] = useState<string | null>(null)
  const [curseur, setCurseur] = useState<{ x: number; y: number } | null>(null)

  const affichees = initial ? seancesInitiales : seances

  /** Les séances par date, dans l'ordre de la journée. */
  const parJour = useMemo(() => {
    const m = new Map<string, SeancePlanifiee[]>()
    for (const x of affichees) {
      const l = m.get(x.day) ?? []
      l.push(x)
      m.set(x.day, l)
    }
    return m
  }, [affichees])

  /**
   * Les jours où la séance prise peut atterrir, avec leurs conflits.
   *
   * Bornés à la semaine d'origine plus ou moins une : c'est ce que Mathieu a
   * demandé, et ça borne aussi le calcul — vérifier les contraintes sur les
   * 245 jours du plan à chaque prise serait absurde.
   */
  const cibles = useMemo(() => {
    if (!prise || !onDeplacer) return new Map<string, CibleDrop>()
    return ciblesPossibles(plan.weeks, prise, ecarts)
  }, [prise, plan.weeks, ecarts, onDeplacer])

  const lignes = useRef(new Map<string, HTMLDivElement>())
  const timer = useRef<number | null>(null)
  const depart = useRef<{ x: number; y: number } | null>(null)
  /**
   * La carte capture le pointeur dès la prise. Sans ça, un doigt qui sort de
   * la carte pendant le geste envoie ses événements ailleurs, et le
   * déplacement se perd — c'est exactement ce qui arrive sur un écran tactile,
   * où l'on vise un jour situé loin du point de départ.
   */
  const capture = useRef<{ el: Element; id: number } | null>(null)

  // Amène la semaine visée à l'écran à l'ouverture, et la séance mise en avant
  // quand on arrive ici depuis le bouton « Déplacer » d'une feuille de séance.
  //
  // On vise le jour que la séance occupe MAINTENANT, pas sa case d'origine.
  // `focus` est son identité dans le plan de référence, qui ne bouge jamais :
  // la chercher telle quelle dans les lignes du calendrier, qui sont indexées
  // par date, ne trouvait rien et retombait sur le lundi de la semaine
  // d'origine. Une séance déjà déplacée renvoyait donc à l'endroit d'où elle
  // était partie.
  useEffect(() => {
    const cible = focus
      ? seances.find((x) => cleEcart(x.semaineOrigine, x.jourOrigine, x.slot) === focus)
      : null
    const semaine = plan.weeks.find((w) => w.n === semaineVisee)
    const jour = cible?.day ?? semaine?.monday
    lignes.current.get(`jour-${jour}`)?.scrollIntoView({ block: 'center' })
  }, [semaineVisee, focus, seances, plan.weeks])

  const jourSousLePointeur = (x: number, y: number): string | null => {
    for (const [cle, el] of lignes.current) {
      if (!cle.startsWith('jour-')) continue
      const r = el.getBoundingClientRect()
      if (y >= r.top && y <= r.bottom && x >= r.left && x <= r.right) return cle.slice(5)
    }
    return null
  }

  const relacher = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    depart.current = null
    if (capture.current) {
      const { el, id } = capture.current
      if ('releasePointerCapture' in el) {
        try {
          ;(el as Element & { releasePointerCapture(i: number): void }).releasePointerCapture(id)
        } catch {
          // Le pointeur a déjà été relâché par le navigateur : rien à défaire.
        }
      }
      capture.current = null
    }
    if (prise && survol) {
      const c = cibles.get(survol)
      if (c && c.day !== prise.day) onDeplacer?.(prise, c.jour, c.semaines)
    }
    setPrise(null)
    setSurvol(null)
    setCurseur(null)
  }

  return (
    <div
      onPointerMove={(e) => {
        if (depart.current && !prise) {
          const d = Math.hypot(e.clientX - depart.current.x, e.clientY - depart.current.y)
          if (d > TOLERANCE_PX && timer.current) {
            window.clearTimeout(timer.current)
            timer.current = null
            depart.current = null
          }
          return
        }
        if (!prise) return
        e.preventDefault()
        setCurseur({ x: e.clientX, y: e.clientY })
        setSurvol(jourSousLePointeur(e.clientX, e.clientY))
      }}
      onPointerUp={relacher}
      onPointerCancel={relacher}
      style={{ touchAction: prise ? 'none' : 'auto' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: 'var(--sur-ink-2)', lineHeight: 1.4 }}>
          {initial
            ? 'Le plan de référence, sans aucun de tes écarts.'
            : onDeplacer
              ? 'Appui long sur une séance pour la déplacer.'
              : 'Le plan jour par jour.'}
        </p>
        <button
          onClick={() => setInitial((v) => !v)}
          aria-pressed={initial}
          style={{
            flex: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 13px',
            borderRadius: 'var(--pill)',
            fontSize: 12.5,
            fontWeight: 700,
            color: initial ? '#08090b' : 'var(--ink)',
            background: initial ? '#fff' : 'transparent',
            border: initial ? '1px solid #fff' : '1px solid var(--glass-border)',
          }}
        >
          <Icon name="clip" size={14} />
          Voir initial
        </button>
      </div>

      {plan.weeks.map((w) => (
        <section key={w.n} style={{ marginBottom: 8 }}>
          <EnteteSemaine semaine={w} courante={now >= w.monday && now <= addDays(w.monday, 6)} />
          {Array.from({ length: 7 }, (_, i) => {
            const jour = addDays(w.monday, i)
            const cible = cibles.get(jour)
            return (
              <div
                key={jour}
                ref={(el) => {
                  if (el) lignes.current.set(`jour-${jour}`, el)
                  else lignes.current.delete(`jour-${jour}`)
                }}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '9px 10px',
                  borderRadius: 14,
                  minHeight: 54,
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--glass-border)',
                  background: fondCible(prise != null, cible, survol === jour),
                  transition: 'background var(--dur-fast)',
                }}
              >
                <div style={{ width: 42, flex: 'none', paddingTop: 4 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '.7px',
                      textTransform: 'uppercase',
                      color: jour === now ? 'var(--ink)' : 'var(--sur-ink-3)',
                    }}
                  >
                    {DAYS_LONG[weekdayIndex(jour)].slice(0, 3)}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      letterSpacing: '-.5px',
                      color: jour === now ? 'var(--ink)' : 'var(--sur-ink-2)',
                    }}
                  >
                    {formatDay(jour).split(' ')[0]}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6 }}>
                  {(parJour.get(jour) ?? []).map((x) => (
                    <CarteJour
                      key={`${x.semaineOrigine}-${x.jourOrigine}-${x.slot}`}
                      seance={x}
                      priseEnCours={prise?.day === x.day && prise?.slot === x.slot}
                      misEnAvant={focus === cleEcart(x.semaineOrigine, x.jourOrigine, x.slot)}
                      onOuvrir={onOuvrirSeance && !prise ? () => onOuvrirSeance(x) : undefined}
                      onPrise={
                        onDeplacer && !initial
                          ? (e) => {
                              const el = e.currentTarget
                              const id = e.pointerId
                              const pos = { x: e.clientX, y: e.clientY }
                              depart.current = pos
                              timer.current = window.setTimeout(() => {
                                try {
                                  el.setPointerCapture(id)
                                  capture.current = { el, id }
                                } catch {
                                  // Pointeur déjà parti : le geste se fera sans
                                  // capture, ce qui reste correct à la souris.
                                }
                                setPrise(x)
                                setCurseur(pos)
                                setSurvol(x.day)
                              }, DELAI_PRISE_MS)
                            }
                          : undefined
                      }
                    />
                  ))}
                  {cible && cible.conflits.length > 0 && survol === jour && (
                    <div style={{ fontSize: 11.5, color: '#FF9A9D', fontWeight: 600, lineHeight: 1.35 }}>
                      {cible.conflits.join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      ))}

      {prise && curseur && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            left: curseur.x - 90,
            top: curseur.y - 22,
            zIndex: 80,
            width: 180,
            padding: '9px 12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,.94)',
            color: '#08090b',
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 12px 32px rgba(0,0,0,.45)',
            pointerEvents: 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {prise.s.title}
        </div>
      )}
    </div>
  )
}

/** Le fond d'un jour pendant un geste : cible normale, cible en conflit, survol. */
function fondCible(enCours: boolean, cible: CibleDrop | undefined, survole: boolean): string {
  if (!enCours) return 'transparent'
  if (!cible) return 'transparent'
  if (cible.conflits.length) return survole ? 'rgba(229,72,77,.26)' : 'rgba(229,72,77,.10)'
  return survole ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.05)'
}

function EnteteSemaine({ semaine, courante }: { semaine: Week; courante: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 9,
        padding: '18px 2px 8px',
      }}
    >
      <span style={{ fontSize: 14.5, fontWeight: 750, letterSpacing: '-.3px' }}>
        Semaine {semaine.n}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--sur-ink-3)' }}>
        {formatDay(semaine.monday)} — {formatDay(addDays(semaine.monday, 6))}
      </span>
      {courante && (
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: '.9px',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 'var(--pill)',
            // Même teinte que le tag « aujourd'hui » de la vue semaine : les
            // deux disent la même chose, le présent.
            background: 'rgba(52,211,153,.18)',
            border: '1px solid rgba(52,211,153,.3)',
            color: '#6ee7b7',
          }}
        >
          en cours
        </span>
      )}
    </div>
  )
}

function CarteJour({
  seance,
  priseEnCours,
  misEnAvant,
  onOuvrir,
  onPrise,
}: {
  seance: SeancePlanifiee
  priseEnCours: boolean
  misEnAvant: boolean
  onOuvrir?: () => void
  onPrise?: (e: React.PointerEvent) => void
}) {
  const st = styleSeance(seance.s.type)
  return (
    <div
      onPointerDown={onPrise}
      onClick={onOuvrir}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '9px 11px',
        borderRadius: 12,
        background: 'rgba(255,255,255,.055)',
        border: misEnAvant ? '1px solid rgba(255,255,255,.42)' : '1px solid var(--glass-border)',
        opacity: priseEnCours ? 0.3 : seance.s.saute ? 0.4 : 1,
        cursor: onOuvrir ? 'pointer' : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <Icon name={st.icone} size={16} style={{ color: 'var(--sur-ink-2)' }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 650,
            letterSpacing: '-.2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textDecoration: seance.s.saute ? 'line-through' : undefined,
          }}
        >
          {seance.s.title}
        </div>
        {seance.ecart && (
          <div style={{ fontSize: 11, color: 'var(--sur-ink-3)', fontWeight: 500, marginTop: 1 }}>
            {seance.s.ecart}
          </div>
        )}
      </div>
      {onPrise && (
        <Icon name="grip" size={15} style={{ color: 'var(--sur-ink-3)', flex: 'none' }} />
      )}
    </div>
  )
}

/**
 * Les jours où la séance peut atterrir, semaine d'origine plus ou moins une,
 * avec les contraintes que chaque dépôt ferait tomber.
 */
export function ciblesPossibles(
  weeks: Week[],
  seance: SeancePlanifiee,
  ecarts?: Map<string, EcartRow>,
): Map<string, CibleDrop> {
  const out = new Map<string, CibleDrop>()
  const origine = weeks.find((w) => w.n === seance.semaineOrigine)
  if (!origine) return out

  const i = weeks.findIndex((w) => w.n === origine.n)
  const cle = cleEcart(origine.n, seance.jourOrigine, seance.slot)
  const patchActuel = ecarts?.get(cle)?.patch ?? {}
  const sans = retirer(ecarts, cle)

  for (const decalage of [-1, 0, 1]) {
    const accueil = weeks[i + decalage]
    if (!accueil) continue

    // Le contrôle porte sur la semaine d'ACCUEIL, celle où la séance atterrit.
    // Quitter une semaine ne peut qu'y retirer des alertes, jamais en ajouter :
    // aucune des contraintes vérifiées ne se casse en enlevant une séance.
    const avant = dispositionSemaine(weeks, accueil, sans)

    for (let j = 0; j < 7; j++) {
      const day = addDays(accueil.monday, j)
      const apres = dispositionSemaine(
        weeks,
        accueil,
        new Map(sans).set(cle, {
          week: origine.n,
          day_index: seance.jourOrigine,
          slot: seance.slot,
          patch: { ...patchActuel, day: j, semaines: decalage || undefined },
          reason: null,
        }),
      )
      out.set(day, {
        day,
        jour: j,
        semaines: decalage,
        conflits: alertesAjoutees(avant, apres).map((a) => a.texte),
      })
    }
  }
  return out
}

function retirer(ecarts: Map<string, EcartRow> | undefined, cle: string): Map<string, EcartRow> {
  const m = new Map(ecarts ?? [])
  m.delete(cle)
  return m
}

/** Réexporté pour les tests : la simulation d'un dépôt sans l'écran. */
export type { Session }
