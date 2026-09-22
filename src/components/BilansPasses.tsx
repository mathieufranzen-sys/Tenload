/**
 * Profil → Bilans de la semaine : chaque semaine terminée, et son bilan.
 *
 * Demandé le 22 septembre 2026. Le bilan ne s'affiche dans Aujourd'hui que
 * le dimanche et le lundi : passé ce jour, il n'était plus relisible nulle
 * part. Chaque bilan se recalcule tel que l'écran Aujourd'hui l'a montré, le
 * lundi qui suit la semaine (voir `construireBilan`), sans la forme projetée,
 * qui ne vaut que pour aujourd'hui.
 */
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Plan, Week } from '../data/types'
import { adapt, construireContexte, seancesDeLaSemaine } from '../lib/adapt'
import { construireBilan } from '../lib/bilanDeSemaine'
import type { FeedbackRow } from '../lib/buildPain'
import { addDays, formatDay } from '../lib/dates'
import { libelleNature } from '../lib/natureSemaine'
import type { EcartRow } from '../lib/overrides'
import { bandOf, type LoadMap, type PainMap } from '../lib/tendonIndex'
import { CarteBilan } from './CarteBilan'
import { Icon } from './Icon'
import { SubPage } from './SubPage'

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export function BilansPasses({
  plan,
  now,
  load,
  pain,
  feedback,
  ecarts,
  attestes,
}: {
  plan: Plan
  now: string
  load: LoadMap
  pain: PainMap
  feedback: FeedbackRow[]
  ecarts?: Map<string, EcartRow>
  attestes?: Set<string>
}) {
  // Une semaine se bilane dès son dimanche : c'est le jour où Aujourd'hui
  // commence à la montrer.
  const semaines = plan.weeks.filter((w) => addDays(w.monday, 6) <= now).reverse()
  const [ouverte, setOuverte] = useState<Week | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {semaines.length === 0 && (
        <p style={{ margin: '4px 2px', fontSize: 15, color: 'var(--ink-2)' }}>Aucune semaine terminée pour l'instant.</p>
      )}
      {semaines.map((w) => (
        <button
          key={w.n}
          type="button"
          onClick={() => setOuverte(w)}
          className="carte"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            width: '100%',
            textAlign: 'left',
            color: 'inherit',
            borderRadius: 22,
            padding: '14px 16px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <b className="display" style={{ display: 'block', fontSize: 19, fontWeight: 400, lineHeight: 1.2 }}>
              Semaine {w.n}
            </b>
            <span style={{ display: 'block', color: 'var(--sur-ink-2)', fontSize: 13.5, marginTop: 2 }}>
              {formatDay(w.monday)} → {formatDay(addDays(w.monday, 6))} · {majuscule(libelleNature(w, { charge: true }))}
            </span>
          </div>
          <Icon name="chevronRight" size={18} style={{ color: 'var(--sur-ink-3)', flex: 'none', strokeWidth: 1.7 }} />
        </button>
      ))}

      {/* Par un portail : la liste vit déjà dans une sous-page décalée par
          `transform`, où un `position: fixed` se calerait sur elle. */}
      {ouverte &&
        createPortal(
          <SubPage
            ouvert
            surtitre={`${formatDay(ouverte.monday)} → ${formatDay(addDays(ouverte.monday, 6))} · ${libelleNature(ouverte, { charge: true })}`}
            titre={`Bilan de la semaine ${ouverte.n}`}
            onBack={() => setOuverte(null)}
          >
            <BilanDe
              plan={plan}
              semaine={ouverte}
              now={now}
              load={load}
              pain={pain}
              feedback={feedback}
              ecarts={ecarts}
              attestes={attestes}
            />
          </SubPage>,
          document.body,
        )}
    </div>
  )
}

/** Le bilan d'une semaine, calculé seulement quand on l'ouvre. */
function BilanDe({
  plan,
  semaine,
  now,
  load,
  pain,
  feedback,
  ecarts,
  attestes,
}: {
  plan: Plan
  semaine: Week
  now: string
  load: LoadMap
  pain: PainMap
  feedback: FeedbackRow[]
  ecarts?: Map<string, EcartRow>
  attestes?: Set<string>
}) {
  const donnees = useMemo(() => {
    const lundiSuivant = addDays(semaine.monday, 7)
    const ref = lundiSuivant < now ? lundiSuivant : now
    // L'indice se relit autour du jour du bilan ; les séances, elles, sont
    // celles du Programme d'aujourd'hui, écarts et séances figées compris.
    const aRef = adapt(load, pain, feedback, ref, attestes)
    const aNow = adapt(load, pain, feedback, now, attestes)
    const contexte = construireContexte(plan.weeks, feedback, pain, now, ecarts)
    const i = plan.weeks.findIndex((w) => w.n === semaine.n)
    const bilan = construireBilan({
      plan,
      bilanee: semaine,
      suivante: plan.weeks[i + 1],
      ref,
      seancesDe: (w) => seancesDeLaSemaine(plan.weeks, w, now, aNow.byDate, ecarts, contexte),
      indices: aRef.byDate,
      feedback,
      pain,
      attestes,
      forme: null,
    })
    const jours = Array.from({ length: 7 }, (_, k) => {
      const d = aRef.byDate[addDays(semaine.monday, k)]
      return d && !d.painInconnue ? { idx: d.idx, bande: bandOf(d.idx).key } : null
    })
    return { bilan, jours }
  }, [plan, semaine, now, load, pain, feedback, ecarts, attestes])

  return <CarteBilan bilan={donnees.bilan} jours={donnees.jours} />
}
