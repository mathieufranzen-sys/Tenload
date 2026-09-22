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
import { libelleNature } from '../lib/natureSemaine'
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
  /**
   * Jour à amener à l'écran : aujourd'hui par défaut, ou celui choisi dans
   * la vue globale. Null quand c'est une séance mise en avant qui décide.
   */
  jourVise?: string | null
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
  jourVise,
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
   * 238 jours du plan à chaque prise serait absurde.
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
  /**
   * Le navigateur émet un `click` après le `pointerup`, même quand le geste
   * était un déplacement : sans ce drapeau, poser une séance ouvrait aussitôt
   * sa feuille de détail.
   */
  const ignorerClic = useRef(false)

  // Amène la semaine visée à l'écran à l'ouverture, et la séance mise en avant
  // quand on arrive ici depuis le bouton « Déplacer » d'une feuille de séance.
  //
  // On vise le jour que la séance occupe MAINTENANT, pas sa case d'origine.
  // `focus` est son identité dans le plan de référence, qui ne bouge jamais :
  // la chercher telle quelle dans les lignes du calendrier, qui sont indexées
  // par date, ne trouvait rien et retombait sur le lundi de la semaine
  // d'origine. Une séance déjà déplacée renvoyait donc à l'endroit d'où elle
  // était partie.
  //
  // Sans séance à mettre en avant, on descend sur `jourVise` : aujourd'hui à
  // l'ouverture, ou le jour choisi dans la vue globale. L'en-tête de sa
  // semaine vient en haut de l'écran, pour lire la semaine entière.
  useEffect(() => {
    if (focus) {
      const cible = seances.find((x) => cleEcart(x.semaineOrigine, x.jourOrigine, x.slot) === focus)
      const semaine = plan.weeks.find((w) => w.n === semaineVisee)
      const jour = cible?.day ?? semaine?.monday
      lignes.current.get(`jour-${jour}`)?.scrollIntoView({ block: 'center' })
      return
    }
    if (!jourVise) return
    const w = plan.weeks.find((x) => jourVise >= x.monday && jourVise <= addDays(x.monday, 6))
    const cle = jourVise === now && w ? `semaine-${w.n}` : `jour-${jourVise}`
    lignes.current.get(cle)?.scrollIntoView({ block: jourVise === now ? 'start' : 'center' })
    // Seulement à l'arrivée : défiler ensuite ne doit pas ramener l'écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, jourVise])

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
      if (c && c.day !== prise.day) {
        onDeplacer?.(prise, c.jour, c.semaines)
        ignorerClic.current = true
        setPrise(null)
        setSurvol(null)
        setCurseur(null)
        return
      }
    }
    // Le doigt s'est levé sans avoir désigné un autre jour, ou le navigateur a
    // repris le pointeur pour faire défiler la page. On GARDE la prise : la
    // séance reste attrapée et se pose d'un simple appui sur un jour. Sans ça,
    // sur iPhone, un défilement qui démarre pendant l'appui long annulait le
    // geste sans rien dire, et le déplacement paraissait cassé.
    if (prise) {
      ignorerClic.current = true
      setCurseur(null)
      return
    }
    setPrise(null)
    setSurvol(null)
    setCurseur(null)
  }

  /** Abandonne la prise en cours, sans rien déplacer. */
  const annuler = () => {
    setPrise(null)
    setSurvol(null)
    setCurseur(null)
  }

  /** Pose la séance attrapée sur ce jour. */
  const poserSur = (jour: string) => {
    const c = cibles.get(jour)
    if (prise && c && c.day !== prise.day) onDeplacer?.(prise, c.jour, c.semaines)
    annuler()
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
        <p style={{ margin: 0, fontSize: 'var(--fs-detail)', color: 'var(--sur-ink-2)', lineHeight: 1.4 }}>
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
            fontSize: 'var(--fs-detail)',
            fontWeight: 700,
            color: initial ? 'var(--pale-ink)' : 'var(--ink)',
            background: initial ? 'var(--pale)' : 'transparent',
            border: initial ? '1px solid var(--pale)' : '1px solid var(--border-2)',
          }}
        >
          Voir le plan initial
        </button>
      </div>

      {plan.weeks.map((w, i) => (
        <section
          key={w.n}
          ref={(el) => {
            if (el) lignes.current.set(`semaine-${w.n}`, el as unknown as HTMLDivElement)
            else lignes.current.delete(`semaine-${w.n}`)
          }}
          style={{ marginBottom: 8, paddingTop: 6, scrollMarginTop: 170 }}
        >
          <EnteteSemaine
            semaine={w}
            courante={now >= w.monday && now <= addDays(w.monday, 6)}
            premiere={i === 0}
          />
          {Array.from({ length: 7 }, (_, i) => {
            const jour = addDays(w.monday, i)
            const cible = cibles.get(jour)
            return (
              <div
                key={jour}
                id={`cal-jour-${jour}`}
                ref={(el) => {
                  if (el) lignes.current.set(`jour-${jour}`, el)
                  else lignes.current.delete(`jour-${jour}`)
                }}
                onClick={
                  prise
                    ? () => {
                        if (ignorerClic.current) {
                          ignorerClic.current = false
                          return
                        }
                        poserSur(jour)
                      }
                    : undefined
                }
                style={{
                  cursor: prise ? 'pointer' : undefined,
                  display: 'flex',
                  gap: 12,
                  padding: '9px 10px',
                  // Des filets droits : arrondis, ils se lisaient comme des
                  // cartes et non comme la coupure entre deux jours.
                  borderRadius: 0,
                  minHeight: 54,
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--glass-border)',
                  background: fondCible(prise != null, cible, survol === jour),
                  transition: 'background var(--dur-fast)',
                }}
              >
                {/* Mêmes corps que la pastille de jour de la vue semaine, et
                    même bleu pour aujourd'hui : les deux vues se lisent pareil. */}
                <div style={{ width: 42, flex: 'none', paddingTop: 2 }}>
                  <div
                    style={{
                      fontSize: 'var(--fs-detail)',
                      color: jour === now ? 'var(--bleu-700)' : 'var(--ink-2)',
                    }}
                  >
                    {DAYS_LONG[weekdayIndex(jour)].slice(0, 3)}
                  </div>
                  <div
                    className="chiffre"
                    style={{
                      fontSize: 'var(--fs-c-m)',
                      lineHeight: 1.1,
                      color: jour === now ? 'var(--bleu-700)' : 'var(--ink)',
                    }}
                  >
                    {formatDay(jour).split(' ')[0]}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 6 }}>
                  {(parJour.get(jour) ?? []).map((x) => (
                    <CarteJour
                      key={`${x.semaineOrigine}-${x.jourOrigine}-${x.slot}`}
                      seance={x}
                      priseEnCours={prise?.day === x.day && prise?.slot === x.slot}
                      passe={jour < now}
                      misEnAvant={focus === cleEcart(x.semaineOrigine, x.jourOrigine, x.slot)}
                      onOuvrir={
                        onOuvrirSeance && !prise
                          ? () => {
                              if (ignorerClic.current) {
                                ignorerClic.current = false
                                return
                              }
                              onOuvrirSeance(x)
                            }
                          : undefined
                      }
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
                    <div style={{ fontSize: 'var(--fs-detail)', color: 'var(--critical)', fontWeight: 600, lineHeight: 1.35 }}>
                      {cible.conflits.join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      ))}

      {prise && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            maxWidth: 'var(--shell-max)',
            margin: '0 auto',
            padding: '12px 14px',
            borderRadius: 'var(--pill)',
            background: 'var(--neon)',
            color: 'var(--ink)',
            boxShadow: '0 12px 32px rgba(0,0,0,.45)',
            fontSize: 'var(--fs-meta)',
            fontWeight: 600,
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {prise.s.title} · appuie sur un jour pour la poser
          </span>
          <button
            onClick={annuler}
            style={{
              flex: 'none',
              padding: '7px 12px',
              borderRadius: 'var(--pill)',
              background: 'var(--pale-ink)',
              color: 'var(--pale)',
              fontSize: 'var(--fs-detail)',
              fontWeight: 600,
            }}
          >
            Annuler
          </button>
        </div>
      )}

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
            borderRadius: 'var(--pill)',
            background: 'linear-gradient(135deg, #4f63f2, #2b3aa6)',
            color: '#ffffff',
            fontSize: 'var(--fs-meta)',
            fontWeight: 600,
            transform: 'rotate(-2deg)',
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
  if (cible.conflits.length) return survole ? 'rgba(255,107,94,.26)' : 'rgba(255,107,94,.10)'
  return survole ? 'color-mix(in srgb, var(--ink) 16%, transparent)' : 'color-mix(in srgb, var(--ink) 5%, transparent)'
}

/**
 * La coupure entre deux semaines, et non plus seulement leur titre.
 *
 * Le calendrier déroule 238 jours d'affilée : une ligne de texte un peu plus
 * grasse ne suffisait pas à faire voir où une semaine s'arrête, et on perdait
 * le compte en défilant. Trois choses la marquent maintenant, toutes en encre
 * neutre puisque la couleur appartient à la charge : un filet pleine largeur,
 * un vrai blanc au-dessus, et le bloc de périodisation rappelé à droite, qui
 * est la seule information d'orientation absente du reste de l'écran.
 */
function EnteteSemaine({
  semaine,
  courante,
  premiere,
}: {
  semaine: Week
  courante: boolean
  premiere: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 9,
        // Le bandeau va pleine largeur, au-delà du padding de la page : une
        // coupure qui s'arrête avant le bord se lit comme une bordure de bloc
        // et pas comme une fin de semaine. Fond plein plutôt qu'un simple
        // filet, parce que sur 238 jours de défilement un trait d'un pixel
        // passe sous l'œil sans l'arrêter.
        margin: premiere ? '0 calc(var(--page-x) * -1)' : '34px calc(var(--page-x) * -1) 0',
        padding: '13px var(--page-x) 12px',
        background: 'var(--surface)',
        borderTop: premiere ? 'none' : '2px solid var(--border-2)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span className="display" style={{ fontSize: 'var(--fs-t-liste)', whiteSpace: 'nowrap' }}>
        Semaine {semaine.n}
      </span>
      <span
        style={{
          fontSize: 'var(--fs-detail)',
          fontWeight: 500,
          color: 'var(--sur-ink-3)',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {formatDay(semaine.monday)} → {formatDay(addDays(semaine.monday, 6))}
        {' · '}
        {libelleNature(semaine)}
      </span>
      {courante && (
        <span
          style={{
            marginLeft: 'auto',
            flex: 'none',
            whiteSpace: 'nowrap',
            fontSize: 'var(--fs-micro)',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 'var(--pill)',
            // Le présent a la teinte de la pastille du jour de la vue semaine.
            background: 'var(--bleu-100)',
            color: 'var(--bleu-800)',
          }}
        >
          En cours
        </span>
      )}
    </div>
  )
}

function CarteJour({
  seance,
  priseEnCours,
  passe,
  misEnAvant,
  onOuvrir,
  onPrise,
}: {
  seance: SeancePlanifiee
  priseEnCours: boolean
  /** Jour révolu : grisé, comme dans la vue semaine. */
  passe: boolean
  misEnAvant: boolean
  onOuvrir?: () => void
  onPrise?: (e: React.PointerEvent) => void
}) {
  return (
    <div
      onPointerDown={onPrise}
      onClick={onOuvrir}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '10px 13px',
        borderRadius: 16,
        background: 'var(--surface)',
        border: misEnAvant ? '1.5px solid var(--accent)' : '1px solid var(--glass-border)',
        opacity: priseEnCours ? 0.3 : seance.s.saute ? 0.4 : passe ? 0.55 : 1,
        cursor: onOuvrir ? 'pointer' : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          className="display"
          style={{
            fontSize: 'var(--fs-t-ligne)',
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textDecoration: seance.s.saute ? 'line-through' : undefined,
          }}
        >
          {seance.s.title}
        </div>
        {seance.ecart && (
          <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--sur-ink-3)', fontWeight: 500, marginTop: 1 }}>
            {seance.s.ecart}
          </div>
        )}
      </div>
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
