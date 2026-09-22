/**
 * Le carnet du jour : les seules saisies qui nourrissent l'indice de charge.
 *
 * Refonte du 21 septembre 2026, d'après la maquette : l'écran Aujourd'hui
 * n'en porte plus que le résumé (`CarteCarnet`, une ligne par mesure et les
 * gestes de soin), et la saisie vit dans sa propre page (`PageCarnet`),
 * ordonnée comme la journée : ce matin, après la séance, ce soir.
 *
 * Volontairement limité à ce qui compte pour le modèle — `stretching` et
 * `icing` sont en base mais n'entrent dans aucun terme de `tendonIndex.ts`,
 * les exposer laisserait croire qu'ils comptent.
 */
import type { ReactNode } from 'react'
import type { DailyLogRow, FeedbackRow } from '../lib/buildPain'
import type { SeancePlanifiee } from '../lib/adapt'
import { addDays, formatNumber } from '../lib/dates'
import { DOULEUR_MOT, EFFORT_MOT, rangRessenti } from '../lib/ressenti'
import { JaugeRessenti } from './JaugeRessenti'
import { BarreRessenti, LabelRessenti } from './BarreRessenti'
import { useJournal } from '../hooks/DataProvider'
import { useSaisieDifferee } from '../hooks/useSaisieDifferee'
import { useFileAttente } from '../hooks/useFileAttente'
import { Icon } from './Icon'

/** Une séance du jour et son ressenti, s'il est noté. */
export interface SeanceDuCarnet {
  x: SeancePlanifiee
  fb: FeedbackRow | null
}

const GESTES: Array<{
  champ: 'eccentric' | 'jumps' | 'hydration_l'
  label: string
  effet: string
  icone: 'dumb' | 'up' | 'heart'
  detail: string
}> = [
  { champ: 'eccentric', label: 'Excentrique', effet: '−6', icone: 'dumb', detail: 'Le traitement, pas un complément' },
  { champ: 'jumps', label: 'Sauts', effet: '−2', icone: 'up', detail: 'Le test de charge du kiné' },
  // Hydratation n'est pas un booléen en base (`hydration_l` est en litres) :
  // le geste écrit 2 L ou efface la saisie, seuil retenu pour le crédit.
  { champ: 'hydration_l', label: 'Hydratation', effet: '−2', icone: 'heart', detail: '2 litres ou plus' },
]

const actif = (l: DailyLogRow | null, champ: (typeof GESTES)[number]['champ']) =>
  champ === 'hydration_l' ? (l?.hydration_l ?? 0) >= 2 : Boolean(l?.[champ])

const basculer = (l: DailyLogRow | null, champ: (typeof GESTES)[number]['champ']): Partial<DailyLogRow> =>
  champ === 'hydration_l'
    ? { hydration_l: actif(l, champ) ? null : 2 }
    : ({ [champ]: !actif(l, champ) } as Partial<DailyLogRow>)

/** Les séances qui portent un ressenti : le repos et les séances sautées n'en ont pas. */
const aNoter = (seances: SeanceDuCarnet[]) =>
  seances.filter(({ x }) => x.s.type !== 'repos' && !x.s.saute)

/** Le pire ressenti noté dans la journée, ou null si rien n'est noté. */
function pire(seances: SeanceDuCarnet[], champ: 'pain' | 'rpe'): number | null {
  const v = seances.map((s) => s.fb?.[champ]).filter((n): n is number => n != null)
  return v.length ? Math.max(...v) : null
}

/**
 * Le réveil et le soir se notent dans les 24 h : plus tard, c'est de la
 * mémoire, pas une mesure. Une valeur déjà saisie reste corrigeable.
 */
const perime = (day: string, now: string) => day < addDays(now, -1)

// ──────────────────────────────────────────────────────────── le résumé

export function CarteCarnet({
  day,
  now,
  seances,
  onOuvrir,
}: {
  day: string
  now: string
  seances: SeanceDuCarnet[]
  onOuvrir: () => void
}) {
  const { ligne, enregistrerLog } = useJournal()
  const enAttente = useFileAttente()
  const l = ligne(day)
  const notables = aNoter(seances)
  const douleurEffort = pire(notables, 'pain')
  const effort = pire(notables, 'rpe')
  const vieux = perime(day, now)

  const mesures = [l?.pain_wake, l?.pain_evening, ...(notables.length ? [douleurEffort, effort] : [])]
  const faites = mesures.filter((v) => v != null).length

  return (
    <section className="carte" style={{ padding: '18px 18px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <p className="etiquette">Carnet du jour</p>
        <span style={{ fontSize: 13, color: enAttente > 0 ? 'var(--warning)' : 'var(--ink-2)' }}>
          {enAttente > 0
            ? `${enAttente} saisie${enAttente > 1 ? 's' : ''} en attente`
            : `${faites} mesure${faites > 1 ? 's' : ''} sur ${mesures.length}`}
        </span>
      </div>

      {/* Les deux mesures du carnet se saisissent ici même, avec les curseurs
          pleine épaisseur de la version d'origine. Celles de la séance se
          lisent seulement : elles se notent dans la feuille de séance. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
        <CurseurCarnet
          label="Raideur au réveil"
          valeur={l?.pain_wake ?? null}
          onEcrire={(v) => enregistrerLog(day, { pain_wake: v })}
          verrouille={vieux && l?.pain_wake == null}
        />
        {notables.length > 0 && (
          <>
            <Lecture label="Douleur pendant l'effort" valeur={douleurEffort} teinte="douleur" mots={DOULEUR_MOT} />
            <Lecture label="Effort perçu" valeur={effort} teinte="neutre" mots={EFFORT_MOT} />
          </>
        )}
        <CurseurCarnet
          label="Douleur en fin de journée"
          valeur={l?.pain_evening ?? null}
          onEcrire={(v) => enregistrerLog(day, { pain_evening: v })}
          verrouille={vieux && l?.pain_evening == null}
        />
      </div>

      <button type="button" className="bouton-pale" onClick={onOuvrir} style={{ marginTop: 18 }}>
        Ouvrir le carnet
        <span className="pastille">
          <Icon name="arrowUpRight" size={18} />
        </span>
      </button>
    </section>
  )
}

/** Une mesure de séance, en lecture : la même barre, sans curseur. */
function Lecture({
  label,
  valeur,
  teinte,
  mots,
}: {
  label: string
  valeur: number | null
  teinte: 'douleur' | 'neutre'
  mots: string[]
}) {
  return (
    <div>
      <LabelRessenti>{label}</LabelRessenti>
      <BarreRessenti
        valeur={valeur}
        court={valeur == null ? 'Après la séance' : mots[rangRessenti(valeur)]}
        teinte={teinte}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────── la page

export function PageCarnet({
  day,
  now,
  seances,
  onOuvrirSeance,
}: {
  day: string
  now: string
  seances: SeanceDuCarnet[]
  /** Ouvre la feuille de séance, où se note le ressenti. */
  onOuvrirSeance?: (x: SeancePlanifiee) => void
}) {
  const { ligne, enregistrerLog } = useJournal()
  const enAttente = useFileAttente()
  const l = ligne(day)
  const vieux = perime(day, now)
  const notables = aNoter(seances)
  const soinsCoches = GESTES.filter((g) => actif(l, g.champ))
  const credit = soinsCoches.reduce((n, g) => n + Number(g.effet.replace('−', '')), 0)

  return (
    <div style={{ paddingBottom: 30 }}>
      {enAttente > 0 && (
        <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--warning)' }}>
          {enAttente} saisie{enAttente > 1 ? 's' : ''} en attente de réseau
        </p>
      )}

      <Section titre="Ce matin">
        <div className="carte" style={{ padding: '18px 18px 20px' }}>
          <CurseurCarnet
            label="Raideur au réveil"
            valeur={l?.pain_wake ?? null}
            onEcrire={(v) => enregistrerLog(day, { pain_wake: v })}
            verrouille={vieux && l?.pain_wake == null}
          />
        </div>
      </Section>

      {notables.length > 0 && (
        <Section titre={notables.length > 1 ? 'Après les séances' : 'Après la séance'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notables.map(({ x, fb }) => (
              <LigneSeance
                key={`${x.semaineOrigine}-${x.jourOrigine}-${x.slot}`}
                titre={x.s.title}
                fb={fb}
                onOuvrir={onOuvrirSeance && (() => onOuvrirSeance(x))}
              />
            ))}
          </div>
        </Section>
      )}

      <Section titre="Ce soir">
        <div className="carte" style={{ padding: '18px 18px 20px' }}>
          <CurseurCarnet
            label="Douleur en fin de journée"
            valeur={l?.pain_evening ?? null}
            onEcrire={(v) => enregistrerLog(day, { pain_evening: v })}
            verrouille={vieux && l?.pain_evening == null}
          />
        </div>
      </Section>

      <Section
        titre="Les gestes de soin"
        aDroite={`−${credit} point${credit > 1 ? 's' : ''} sur −10 possibles`}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {GESTES.map((g) => {
            const on = actif(l, g.champ)
            return (
              <button
                key={g.champ}
                type="button"
                aria-pressed={on}
                onClick={() => enregistrerLog(day, basculer(l, g.champ))}
                style={{
                  position: 'relative',
                  textAlign: 'left',
                  padding: '16px 16px 18px',
                  borderRadius: 24,
                  // Coché : le néon de Button/Accent. Le vert profond est
                  // réservé au mot du coach.
                  border: `1px solid ${on ? 'transparent' : 'var(--border-2)'}`,
                  background: on ? 'var(--neon)' : 'var(--surface)',
                  color: 'var(--ink)',
                  minHeight: 118,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Icon name={g.icone} size={22} style={{ color: on ? 'var(--ink)' : 'var(--accent)' }} />
                  {on && <Icon name="check" size={20} />}
                </span>
                <span>
                  <span style={{ display: 'block', fontSize: 17, fontWeight: 600 }}>
                    {g.label} <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.7 }}>{g.effet}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 13, marginTop: 3, opacity: 0.75 }}>{g.detail}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      <p style={{ fontSize: 13.5, color: 'var(--sur-ink-3)', lineHeight: 1.5, margin: '18px 2px 0' }}>
        L'effet se voit sur l'indice de demain : c'est ce que tu fais aujourd'hui qui protège le
        tendon du lendemain. Tout s'enregistre au fil de la saisie.
      </p>
    </div>
  )
}

function Section({ titre, aDroite, children }: { titre: string; aDroite?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, margin: '0 2px 10px' }}>
        <h3 className="display" style={{ margin: 0, fontSize: 21, fontWeight: 400 }}>
          {titre}
        </h3>
        {aDroite && <span style={{ fontSize: 13, color: 'var(--sur-ink-2)' }}>{aDroite}</span>}
      </div>
      {children}
    </section>
  )
}

/** Une séance à noter : pointillés tant que rien n'est noté, comme dans la maquette. */
function LigneSeance({
  titre,
  fb,
  onOuvrir,
}: {
  titre: string
  fb: FeedbackRow | null
  onOuvrir?: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 14px 14px 16px',
        borderRadius: 24,
        border: fb ? '1px solid var(--glass-border)' : '1.5px dashed var(--border-2)',
        background: fb ? 'var(--surface)' : 'transparent',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          flex: 'none',
          display: 'grid',
          placeItems: 'center',
          border: fb ? 'none' : '1.5px dashed var(--border-2)',
          background: fb ? 'rgba(111,224,176,.14)' : 'transparent',
          color: fb ? 'var(--good)' : 'var(--sur-ink-2)',
          fontSize: 18,
        }}
      >
        {fb ? <Icon name="check" size={18} /> : '?'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16 }}>{titre}</div>
        <div style={{ fontSize: 13.5, color: 'var(--sur-ink-2)', marginTop: 2 }}>
          {fb
            ? `Douleur ${formatNumber(fb.pain)} · effort ${fb.rpe}`
            : "Douleur pendant l'effort et effort perçu, pas encore notés"}
        </div>
      </div>
      {onOuvrir && (
        <button
          type="button"
          onClick={onOuvrir}
          style={{
            flex: 'none',
            padding: '9px 16px',
            borderRadius: 'var(--pill)',
            background: fb ? 'transparent' : 'var(--pale)',
            color: fb ? 'var(--ink)' : 'var(--pale-ink)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {fb ? 'Modifier' : 'Noter'}
        </button>
      )}
    </div>
  )
}

/**
 * Un curseur du carnet : il suit le doigt tout de suite, il écrit après.
 *
 * L'écriture recalcule l'indice, donc la bande, donc le mot du coach et le
 * bloc de tête, tous plus haut dans la page et tous de hauteurs variables.
 * Écrire à chaque mouvement faisait sauter le contenu sous le pouce en plein
 * geste. Voir `useSaisieDifferee`.
 */
function CurseurCarnet({
  label,
  valeur,
  onEcrire,
  verrouille,
}: {
  label: string
  valeur: number | null
  onEcrire: (v: number) => void
  verrouille?: boolean
}) {
  const [affichee, changer] = useSaisieDifferee(valeur, onEcrire)

  return (
    <JaugeRessenti
      label={label}
      valeur={affichee}
      onChange={changer}
      disabled={verrouille}
      court={affichee == null ? 'Non saisi' : DOULEUR_MOT[rangRessenti(affichee)]}
      teinte="douleur"
      pas={0.5}
    />
  )
}
