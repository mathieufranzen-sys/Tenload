/**
 * Les exercices d'une séance de renfo : ce qu'il faut faire, d'où ça vient,
 * et la saisie de ce qui a été fait.
 *
 * Demandé par Mathieu le 6 octobre 2026. La liste ne donnait que la
 * prescription du plan, la même de la semaine 7 à la semaine 34 : « 3 x 15 »
 * alors qu'il faisait 3 x 20 à 14 kg sur une jambe. Elle donne désormais la
 * charge à faire AUJOURD'HUI, calculée sur ses séances notées (`proposer`),
 * la raison en une ligne, et ce que l'exercice a gagné depuis le début.
 */
import { useState } from 'react'
import type { Exercise, SessionType } from '../data/types'
import type { PainMap } from '../lib/tendonIndex'
import {
  chargeDeDepart,
  exercicesDeLaSeance,
  formatCharge,
  suggestionsAAjouter,
  type Charge,
  type ExerciceDuJour,
  type ExerciceRenfo,
  type Marge,
  type RenfoRow,
} from '../lib/renfo'
import { BoutonAction } from './BoutonAction'
import { Icon } from './Icon'
import { Segmented } from './Segmented'

const MARGE_MOT: Record<Marge, string> = { facile: 'facile', juste: 'juste', limite: 'à la limite' }

export function ExercicesRenfo({
  ex,
  type,
  jour,
  now,
  historique,
  pain,
  indisponible,
  onSave,
}: {
  ex: Exercise[]
  type: SessionType
  jour: string
  now: string
  historique: RenfoRow[]
  pain: PainMap
  /** La table n'existe pas encore en base. */
  indisponible?: boolean
  /** Absent en lecture seule. */
  onSave?: (ligne: RenfoRow) => void
}) {
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [ajouts, setAjouts] = useState<ExerciceRenfo[]>([])
  const [suggestions, setSuggestions] = useState(false)

  const liste = exercicesDeLaSeance(ex, type, jour, historique, pain, now)
  // Un exercice ajouté mais pas encore enregistré n'existe que dans l'écran.
  for (const exo of ajouts) {
    if (liste.some((x) => x.exo.id === exo.id)) continue
    liste.push({
      exo,
      serie: '',
      precision: exo.consigne ?? '',
      plan: null,
      note: null,
      proposition: null,
      evolution: null,
      ajoute: true,
    })
  }
  // On note ce qui est fait, pas ce qui le sera : jamais une séance à venir.
  const saisie = onSave && !indisponible && jour <= now
  const aAjouter = saisie ? suggestionsAAjouter(type, liste) : []

  return (
    <div>
      {indisponible && onSave && (
        <p style={{ margin: '0 0 8px', color: 'var(--ink-3)', fontSize: 'var(--fs-detail)', lineHeight: 1.5 }}>
          Le suivi de la charge attend sa table en base : exécute supabase/renfo.sql une fois.
        </p>
      )}
      {liste.map((x, i) => (
        <LigneExercice
          key={x.exo.id}
          x={x}
          dernier={i === liste.length - 1 && aAjouter.length === 0}
          ouvert={ouvert === x.exo.id}
          saisie={!!saisie}
          onOuvrir={() => setOuvert(x.exo.id)}
          onFermer={() => setOuvert(null)}
          onSave={(c, marge) => {
            onSave?.({ day: jour, exercice: x.exo.id, ...c, marge })
            setOuvert(null)
          }}
          onRetirer={() => {
            // Un ajout jamais enregistré n'a rien à effacer en base.
            if (x.note) onSave?.({ day: jour, exercice: x.exo.id, series: 0, valeur: 0, kg: 0, marge: null })
            setAjouts((a) => a.filter((e) => e.id !== x.exo.id))
            setOuvert(null)
          }}
        />
      ))}
      {/* Repliée derrière un bouton (retour du 6 octobre) : le jour du haut,
          onze propositions faisaient une liste plus longue que la séance. */}
      {aAjouter.length > 0 && (
        <button
          type="button"
          className="puce"
          aria-expanded={suggestions}
          onClick={() => setSuggestions((v) => !v)}
          style={{ marginTop: 16, cursor: 'pointer' }}
        >
          <Icon name={suggestions ? 'x' : 'plus'} size={14} />
          {suggestions ? 'Fermer les suggestions' : 'Ajouter un exercice'}
        </button>
      )}
      {aAjouter.length > 0 && suggestions && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 0 4px' }}>
          {aAjouter.map((exo) => (
            <button
              key={exo.id}
              type="button"
              className="puce"
              style={{ cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border-2)' }}
              onClick={() => {
                setAjouts((a) => [...a, exo])
                setOuvert(exo.id)
                setSuggestions(false)
              }}
            >
              {exo.nom}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LigneExercice({
  x,
  dernier,
  ouvert,
  saisie,
  onOuvrir,
  onFermer,
  onSave,
  onRetirer,
}: {
  x: ExerciceDuJour
  dernier: boolean
  ouvert: boolean
  saisie: boolean
  onOuvrir: () => void
  onFermer: () => void
  onSave: (c: Charge, marge: Marge) => void
  onRetirer: () => void
}) {
  const { exo, note, proposition: p } = x
  const libre = exo.mesure === 'libre'
  // À droite, la charge faite une fois notée ; avant, la charge à faire : la
  // proposition, sinon le plan tel quel. Deux charges sur la même ligne
  // obligeaient à deviner laquelle valait.
  const aFaire = note ? formatCharge(exo, note) : p ? formatCharge(exo, p) : x.serie

  return (
    <div style={{ padding: '12px 0', borderBottom: dernier ? undefined : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ fontSize: 'var(--fs-texte)', minWidth: 0 }}>
          {exo.nom}
          {x.precision && (
            <span style={{ display: 'block', color: 'var(--ink-3)', fontSize: 'var(--fs-detail)', marginTop: 2, lineHeight: 1.4 }}>
              {x.precision}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <div style={{ fontSize: 'var(--fs-texte)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{aFaire}</div>
          {p?.hausse && !note && (
            <span className="tag-ecart" style={{ marginTop: 4, display: 'inline-block', background: 'var(--neon)', color: 'var(--ink)' }}>
              {p.hausse}
            </span>
          )}
        </div>
      </div>

      {/* Sans historique, la charge du plan se passe de commentaire : la
          même phrase sous chaque exercice ne disait rien. */}
      {/* Une fois l'exercice noté, la raison de la charge proposée ne
          concerne plus rien : seule l'évolution reste. */}
      {!libre && ((!note && p && p.statut !== 'plan') || x.evolution) && (
        <p style={{ margin: '6px 0 0', color: 'var(--ink-2)', fontSize: 'var(--fs-detail)', lineHeight: 1.45 }}>
          {[!note && p?.statut !== 'plan' && p?.raison, x.evolution && `${x.evolution}.`].filter(Boolean).join(' ')}
        </p>
      )}

      {!libre && note && !ouvert && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 'var(--fs-detail)' }}>
          <span style={{ color: 'var(--good)', display: 'inline-flex' }}>
            <Icon name="check" size={16} />
          </span>
          <span style={{ flex: 1 }}>
            Fait{note.marge && `, dernière série ${MARGE_MOT[note.marge]}`}
          </span>
          {saisie && (
            // Le même lien que le « Modifier » du ressenti, dans la même feuille.
            <button
              type="button"
              onClick={onOuvrir}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 2px',
                fontSize: 'var(--fs-detail)',
                fontWeight: 600,
                color: 'var(--sur-ink-2)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                cursor: 'pointer',
              }}
            >
              Modifier
            </button>
          )}
        </div>
      )}

      {!libre && !note && saisie && !ouvert && (
        <button
          type="button"
          onClick={onOuvrir}
          className="puce"
          style={{ marginTop: 8, cursor: 'pointer' }}
        >
          <Icon name="pencil" size={14} />
          Noter
        </button>
      )}

      {ouvert && (
        <Saisie
          exo={exo}
          depart={note ?? p ?? chargeDeDepart(exo)}
          margeDepart={note?.marge ?? null}
          peutRetirer={!!note || x.ajoute}
          onSave={onSave}
          onAnnuler={x.ajoute && !note ? onRetirer : onFermer}
          onRetirer={onRetirer}
        />
      )}
    </div>
  )
}

const LIBELLE_VALEUR = { reps: 'Répétitions', duree: 'Secondes', contacts: 'Contacts', libre: '' } as const

function Saisie({
  exo,
  depart,
  margeDepart,
  peutRetirer,
  onSave,
  onAnnuler,
  onRetirer,
}: {
  exo: ExerciceRenfo
  depart: Charge
  margeDepart: Marge | null
  peutRetirer: boolean
  onSave: (c: Charge, marge: Marge) => void
  onAnnuler: () => void
  onRetirer: () => void
}) {
  const [c, setC] = useState<Charge>({ series: depart.series, valeur: depart.valeur, kg: depart.kg })
  const [marge, setMarge] = useState<Marge | null>(margeDepart)
  const pasValeur = exo.mesure === 'reps' ? 1 : 5

  return (
    <div className="carte" style={{ padding: '14px 14px 16px', marginTop: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: exo.mesure === 'reps' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8 }}>
        <Compteur libelle="Séries" valeur={c.series} min={1} max={10} pas={1} onChange={(v) => setC({ ...c, series: v })} />
        <Compteur
          libelle={LIBELLE_VALEUR[exo.mesure]}
          valeur={c.valeur}
          min={1}
          max={exo.mesure === 'reps' ? 50 : 300}
          pas={pasValeur}
          onChange={(v) => setC({ ...c, valeur: v })}
        />
        {exo.mesure === 'reps' && (
          <Compteur libelle="Charge kg" valeur={c.kg} min={0} max={200} pas={1} onChange={(v) => setC({ ...c, kg: v })} />
        )}
      </div>

      <p className="etiquette" style={{ margin: '14px 0 6px' }}>Dernière série</p>
      <Segmented<Marge>
        label="Difficulté de la dernière série"
        options={[
          { cle: 'facile', libelle: 'Facile' },
          { cle: 'juste', libelle: 'Juste' },
          { cle: 'limite', libelle: 'À la limite' },
        ]}
        valeur={marge ?? ('' as Marge)}
        onChange={setMarge}
      />
      <p style={{ margin: '6px 0 0', color: 'var(--ink-3)', fontSize: 'var(--fs-detail)', lineHeight: 1.45 }}>
        Facile : trois répétitions ou plus en réserve. Juste : une ou deux. À la limite : aucune.
      </p>

      <BoutonAction icone="check" disabled={!marge} style={{ marginTop: 14 }} onClick={() => marge && onSave(c, marge)}>
        Enregistrer l&apos;exercice
      </BoutonAction>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 10 }}>
        <button type="button" onClick={onAnnuler} style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-detail)', cursor: 'pointer' }}>
          Annuler
        </button>
        {peutRetirer && (
          <button type="button" onClick={onRetirer} style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-detail)', cursor: 'pointer' }}>
            Retirer l&apos;exercice
          </button>
        )}
      </div>
    </div>
  )
}

function Compteur({
  libelle,
  valeur,
  min,
  max,
  pas,
  onChange,
}: {
  libelle: string
  valeur: number
  min: number
  max: number
  pas: number
  onChange: (v: number) => void
}) {
  const bouton = (signe: -1 | 1) => {
    const suivant = Math.min(max, Math.max(min, valeur + signe * pas))
    return (
      <button
        type="button"
        className="rond"
        aria-label={`${libelle} : ${signe < 0 ? 'moins' : 'plus'} ${pas}`}
        disabled={suivant === valeur}
        onClick={() => onChange(suivant)}
        style={{ width: 28, height: 28, fontSize: 'var(--fs-body)', background: 'var(--surface)', cursor: 'pointer' }}
      >
        {signe < 0 ? '−' : '+'}
      </button>
    )
  }
  return (
    <div style={{ textAlign: 'center' }}>
      <p className="etiquette" style={{ margin: '0 0 6px' }}>{libelle}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        {bouton(-1)}
        {/* Saisissable au clavier : de 0 à 14 kg, quatorze appuis sur + ne
            sont pas une saisie. Les boutons restent pour l'ajustement. */}
        <input
          inputMode="numeric"
          aria-label={libelle}
          value={valeur}
          onChange={(e) => {
            const v = Number(e.target.value.replace(/\D/g, ''))
            if (Number.isFinite(v)) onChange(Math.min(max, v))
          }}
          onBlur={() => valeur < min && onChange(min)}
          style={{
            width: '2.6ch',
            minWidth: 0,
            padding: 0,
            border: 'none',
            background: 'transparent',
            textAlign: 'center',
            fontSize: 'var(--fs-lead)',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--ink)',
          }}
        />
        {bouton(1)}
      </div>
    </div>
  )
}
