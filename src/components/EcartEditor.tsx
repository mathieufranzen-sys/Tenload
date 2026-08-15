/**
 * Éditeur d'écart volontaire, en bas de la feuille de séance.
 *
 * Il ne touche jamais plan.json : il produit une ligne `plan_overrides`
 * appliquée au rendu. Le plan de référence reste le fichier que
 * reference/check_plan.py valide.
 *
 * Sur les contraintes, il AVERTIT sans bloquer. C'est le tendon et l'emploi du
 * temps de Mathieu ; refuser un déplacement le pousserait à ne rien saisir, et
 * on perdrait l'information au lieu de la garder.
 */
import { useState } from 'react'
import type { Session, SessionType } from '../data/types'
import { DAYS_LONG } from '../lib/dates'
import {
  alertesAjoutees,
  TYPES_REMPLACEMENT,
  type Alerte,
  type EcartPatch,
} from '../lib/overrides'
import { Icon } from './Icon'

interface Props {
  /** La séance du plan, avant tout écart : la base de comparaison. */
  origine: Session
  /** L'écart déjà enregistré, s'il existe. */
  actuel: EcartPatch | null
  /** La raison déjà saisie, pour ne pas la perdre en modifiant l'écart. */
  actuelRaison?: string | null
  /** Les séances de la semaine avant l'écart en cours d'édition. */
  semaineAvant: Session[]
  /** Recalcule la semaine avec le patch proposé, pour l'avertissement. */
  simuler: (patch: EcartPatch) => Session[]
  onSave: (patch: EcartPatch, reason: string | null) => void
}

const vide = (p: EcartPatch): boolean =>
  !p.skipped && p.type == null && p.day == null && p.dist == null && p.durMin == null

export function EcartEditor({
  origine,
  actuel,
  actuelRaison,
  semaineAvant,
  simuler,
  onSave,
}: Props) {
  const [ouvert, setOuvert] = useState(false)
  const [patch, setPatch] = useState<EcartPatch>(actuel ?? {})
  const [raison, setRaison] = useState(actuelRaison ?? '')

  const maj = (p: Partial<EcartPatch>) => setPatch((v) => ({ ...v, ...p }))

  const alertes: Alerte[] = vide(patch) ? [] : alertesAjoutees(semaineAvant, simuler(patch))
  const jourEffectif = patch.day ?? origine.day

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          padding: 15,
          marginTop: 13,
          borderRadius: 'var(--pill)',
          fontWeight: 700,
          fontSize: 16,
          color: 'var(--ink-2)',
          border: '1px solid var(--border-2)',
        }}
      >
        <Icon name="clip" size={17} />
        {actuel && !vide(actuel) ? "Modifier l'écart" : 'Modifier la séance'}
      </button>
    )
  }

  return (
    <div
      className="glass"
      style={{ borderRadius: 'var(--radius)', padding: '16px 17px', marginTop: 13 }}
    >
      <h4 style={{ margin: '0 0 4px', fontSize: 15.5, fontWeight: 800 }}>Écart au plan</h4>
      <p style={{ margin: '0 0 15px', fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)' }}>
        Le plan de référence n'est pas modifié. Cet écart s'applique à l'affichage et à la charge,
        et l'adaptation automatique continue de passer par-dessus.
      </p>

      <Champ label="Séance non faite">
        <Bascule actif={Boolean(patch.skipped)} onChange={(v) => maj({ skipped: v || undefined })} />
      </Champ>

      <Champ label="Remplacer par">
        <select
          value={patch.type ?? ''}
          onChange={(e) => maj({ type: (e.target.value || undefined) as SessionType | undefined })}
          style={styleChamp}
        >
          <option value="">Rien, garder la séance</option>
          {TYPES_REMPLACEMENT.filter((r) => r.type !== origine.type).map((r) => (
            <option key={r.type} value={r.type}>
              {r.label}
            </option>
          ))}
        </select>
      </Champ>

      <Champ label="Déplacer au">
        <select
          value={patch.day ?? ''}
          onChange={(e) => maj({ day: e.target.value === '' ? undefined : Number(e.target.value) })}
          style={styleChamp}
        >
          <option value="">{DAYS_LONG[origine.day]}, comme prévu</option>
          {DAYS_LONG.map((j, i) =>
            i === origine.day ? null : (
              <option key={i} value={i}>
                {j}
              </option>
            ),
          )}
        </select>
      </Champ>

      {origine.dist != null && (
        <Champ label="Distance réelle">
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            placeholder={`${origine.dist} km`}
            value={patch.dist ?? ''}
            onChange={(e) => maj({ dist: e.target.value === '' ? undefined : Number(e.target.value) })}
            style={styleChamp}
          />
        </Champ>
      )}

      <Champ label="Durée réelle">
        <input
          type="number"
          inputMode="numeric"
          step="5"
          min="0"
          placeholder={origine.dur ? `${origine.dur[0]} min` : 'en minutes'}
          value={patch.durMin ?? ''}
          onChange={(e) => maj({ durMin: e.target.value === '' ? undefined : Number(e.target.value) })}
          style={styleChamp}
        />
      </Champ>

      <Champ label="Pourquoi">
        <input
          type="text"
          placeholder="facultatif"
          value={raison}
          onChange={(e) => setRaison(e.target.value)}
          style={styleChamp}
        />
      </Champ>

      {alertes.length > 0 && (
        <div
          style={{
            borderRadius: 'var(--radius-sm)',
            padding: '12px 13px',
            margin: '4px 0 14px',
            background: 'rgba(229,72,77,.12)',
            border: '1px solid rgba(229,72,77,.32)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: '#FF9A9D', marginBottom: 6 }}>
            {alertes.length > 1
              ? `${alertes.length} contraintes ne tiennent plus`
              : 'Une contrainte ne tient plus'}
          </div>
          <ul style={{ margin: 0, paddingLeft: 17, color: '#E4E7EB', fontSize: 13.5, lineHeight: 1.55 }}>
            {alertes.map((a, i) => (
              <li key={i}>
                {a.texte} <span style={{ color: 'var(--ink-3)' }}>(contrainte {a.contrainte})</span>
              </li>
            ))}
          </ul>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Tu peux enregistrer quand même. C'est ton tendon qui tranche, pas l'app.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 9 }}>
        <button
          onClick={() => {
            onSave(patch, raison.trim() || null)
            setOuvert(false)
          }}
          style={{
            flex: 1,
            padding: 14,
            borderRadius: 'var(--pill)',
            fontWeight: 700,
            fontSize: 15.5,
            background: '#fff',
            color: '#08090b',
          }}
        >
          Enregistrer
        </button>
        {actuel && !vide(actuel) && (
          <button
            onClick={() => {
              // Un patch vide vaut « retour au plan » : la ligne reste en base
              // avec un patch neutre, ce qui garde l'écriture rejouable par la
              // file d'attente. Une suppression ne se rejoue pas sans risque.
              onSave({}, null)
              setPatch({})
              setRaison('')
              setOuvert(false)
            }}
            style={{
              padding: '14px 18px',
              borderRadius: 'var(--pill)',
              fontWeight: 700,
              fontSize: 15.5,
              color: 'var(--ink-2)',
              border: '1px solid var(--border-2)',
            }}
          >
            Annuler l'écart
          </button>
        )}
      </div>

      {!vide(patch) && (
        <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          {patch.skipped
            ? 'Cette séance ne comptera pas dans la charge du tendon.'
            : `La charge se reportera sur ${DAYS_LONG[jourEffectif].toLowerCase()}.`}
        </p>
      )}
    </div>
  )
}

const styleChamp: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border-2)',
  fontSize: 15,
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 13 }}>
      <span
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '1.1px',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function Bascule({ actif, onChange }: { actif: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={actif}
      onClick={() => onChange(!actif)}
      style={{
        width: 52,
        height: 31,
        borderRadius: 'var(--pill)',
        background: actif ? '#5BE05B' : 'var(--surface-3)',
        position: 'relative',
        transition: `background var(--dur-fast) var(--ease-out)`,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: actif ? 24 : 3,
          width: 25,
          height: 25,
          borderRadius: '50%',
          background: '#fff',
          transition: `left var(--dur-fast) var(--ease-out)`,
        }}
      />
    </button>
  )
}
