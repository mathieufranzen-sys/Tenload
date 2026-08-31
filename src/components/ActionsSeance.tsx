/**
 * La ligne d'actions d'une séance, au-dessus de son détail.
 *
 * Elle remplace l'éditeur d'écart, qui empilait cinq champs dans un panneau
 * replié. Quatre gestes distincts, quatre boutons : sauter, déplacer,
 * enregistrer le réel, remplacer. Chacun ouvre ce dont il a besoin et rien de
 * plus.
 *
 * Le déplacement, lui, ne vit plus ici : un menu déroulant de sept jours ne
 * disait rien de la semaine qu'il fabriquait. Il est passé dans la vue
 * calendrier de l'écran Programme, où l'on voit ce qu'on déplace et à côté de
 * quoi on le pose.
 *
 * Sur les contraintes, la règle du dépôt tient : on AVERTIT sans bloquer.
 * C'est le tendon et l'emploi du temps de Mathieu ; refuser un changement le
 * pousserait à ne rien saisir, et on perdrait l'information au lieu de la
 * garder.
 */
import { useState } from 'react'
import type { Session, SessionType } from '../data/types'
import { familleDe } from '../lib/insights'
import {
  alertesAjoutees,
  TYPES_REMPLACEMENT,
  type Alerte,
  type EcartPatch,
} from '../lib/overrides'
import { Icon } from './Icon'

type Panneau = 'reel' | 'remplacer' | null

interface Props {
  /** La séance du plan, avant tout écart : la base de comparaison. */
  origine: Session
  /** L'écart déjà enregistré, s'il existe. */
  actuel: EcartPatch | null
  actuelRaison?: string | null
  /** Les séances de la semaine avant l'écart en cours d'édition. */
  semaineAvant: Session[]
  /** Recalcule la semaine avec le patch proposé, pour l'avertissement. */
  simuler: (patch: EcartPatch) => Session[]
  onSave: (patch: EcartPatch, reason: string | null) => void
  /** Ouvre la vue calendrier sur cette séance. Absent en lecture seule. */
  onDeplacer?: () => void
}

export function ActionsSeance({
  origine,
  actuel,
  actuelRaison,
  semaineAvant,
  simuler,
  onSave,
  onDeplacer,
}: Props) {
  const [panneau, setPanneau] = useState<Panneau>(null)
  const [patch, setPatch] = useState<EcartPatch>(actuel ?? {})
  const [raison, setRaison] = useState(actuelRaison ?? '')

  const maj = (p: Partial<EcartPatch>) => setPatch((v) => ({ ...v, ...p }))
  const saute = Boolean(patch.skipped)

  /**
   * Le repos jambes de la contrainte 4 n'a que deux actions : le déplacer dans
   * la semaine, ou mettre autre chose à sa place. Sauter un repos ne veut rien
   * dire — il n'y a rien à ne pas faire — et une donnée réelle non plus, un
   * repos n'ayant ni distance ni durée. Les proposer donnait deux boutons qui
   * fabriquaient des écarts vides sur la seule journée du plan qui n'en
   * demande aucun.
   */
  const estRepos = (patch.type ?? origine.type) === 'repos'

  const enregistrer = (p: EcartPatch) => {
    setPatch(p)
    onSave(p, raison.trim() || null)
  }

  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${estRepos ? 2 : 4}, 1fr)`,
          gap: 4,
          padding: '14px 0',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {!estRepos && (
          <Action
            icone="skip"
            label={saute ? 'Rétablir' : 'Sauter'}
            actif={saute}
            onClick={() => enregistrer({ ...patch, skipped: saute ? undefined : true })}
          />
        )}
        <Action icone="calendar" label="Déplacer" onClick={onDeplacer} />
        {!estRepos && (
          <Action
            icone="clip"
            label="Donnée réelle"
            actif={patch.dist != null || patch.durMin != null}
            onClick={() => setPanneau((p) => (p === 'reel' ? null : 'reel'))}
          />
        )}
        <Action
          icone="swap"
          label="Remplacer"
          actif={patch.type != null}
          onClick={() => setPanneau((p) => (p === 'remplacer' ? null : 'remplacer'))}
        />
      </div>

      {panneau === 'reel' && (
        <Panneau titre="Ce que tu as vraiment fait">
          {/* Le plan fixe une distance à toute séance de course, mais un écart
              qui CONVERTIT une autre discipline en course n'en hérite d'aucune :
              `versType` efface `dist` avec le reste de l'ancienne séance. Sans
              ce second cas, la distance réellement courue n'aurait nulle part
              où se saisir. */}
          {/* Une distance ne se saisit que là où elle a un sens. L'escalade et
              le renfo n'en ont pas ; le vélo si, même si le plan ne lui en
              fixe aucune — c'est ici qu'elle se saisit désormais, et plus dans
              le formulaire de ressenti. */}
          {porteUneDistance(origine, patch) && (
            <Champ label="Distance réelle">
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                placeholder={origine.dist != null ? `${origine.dist} km` : 'km parcourus'}
                value={patch.dist ?? ''}
                onChange={(e) =>
                  maj({ dist: e.target.value === '' ? undefined : Number(e.target.value) })
                }
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
              onChange={(e) =>
                maj({ durMin: e.target.value === '' ? undefined : Number(e.target.value) })
              }
              style={styleChamp}
            />
          </Champ>
          {/* Ni raison ni contrôle de contraintes ici : corriger une distance ou
              une durée ne déplace rien dans la semaine, il n'y a aucune
              contrainte à faire tomber. */}
          <Boutons
            onValider={() => {
              onSave(patch, raison.trim() || null)
              setPanneau(null)
            }}
            onEffacer={() => {
              enregistrer({ ...patch, dist: undefined, durMin: undefined })
              setPanneau(null)
            }}
            effacerLabel="Effacer"
            effacerVisible={patch.dist != null || patch.durMin != null}
          />
        </Panneau>
      )}

      {panneau === 'remplacer' && (
        <Panneau titre="Remplacer par">
          <div style={{ display: 'grid', gap: 7 }}>
            {TYPES_REMPLACEMENT.filter((r) => r.type !== origine.type).map((r) => (
              <button
                key={r.type}
                onClick={() => maj({ type: r.type })}
                aria-pressed={patch.type === r.type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '12px 13px',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'left',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  background:
                    patch.type === r.type ? 'rgba(255,255,255,.11)' : 'rgba(255,255,255,.04)',
                  border:
                    patch.type === r.type
                      ? '1px solid rgba(255,255,255,.26)'
                      : '1px solid var(--border)',
                }}
              >
                <MarqueType type={r.type} />
                <span style={{ flex: 1 }}>{r.label}</span>
              </button>
            ))}
          </div>
          <Pied
            patch={patch}
            raison={raison}
            setRaison={setRaison}
            semaineAvant={semaineAvant}
            simuler={simuler}
            onValider={() => {
              onSave(patch, raison.trim() || null)
              setPanneau(null)
            }}
            onEffacer={() => {
              enregistrer({ ...patch, type: undefined })
              setPanneau(null)
            }}
            effacerLabel="Garder la séance"
            effacerVisible={patch.type != null}
          />
        </Panneau>
      )}
    </div>
  )
}

function MarqueType({ type }: { type: SessionType }) {
  return (
    <span
      aria-hidden
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
        background: 'rgba(255,255,255,.07)',
      }}
    >
      <Icon name={ICONE_TYPE[type] ?? 'run'} size={16} />
    </span>
  )
}

const ICONE_TYPE: Partial<Record<SessionType, 'run' | 'walk' | 'bike' | 'dumb' | 'climb' | 'rest'>> = {
  ef: 'run',
  marche: 'walk',
  velo: 'bike',
  'muscu-haut': 'dumb',
  'muscu-bas': 'dumb',
  escalade: 'climb',
  repos: 'rest',
}

function Action({
  icone,
  label,
  actif = false,
  onClick,
}: {
  icone: 'skip' | 'calendar' | 'clip' | 'swap'
  label: string
  actif?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        padding: '2px 0',
        opacity: onClick ? 1 : 0.35,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: actif ? '#08090b' : 'var(--ink)',
          background: actif ? '#fff' : 'transparent',
          border: actif ? '1px solid #fff' : '1px solid var(--border-2)',
        }}
      >
        <Icon name={icone} size={19} />
      </span>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '.5px',
          textTransform: 'uppercase',
          color: 'var(--ink-2)',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
    </button>
  )
}

function Panneau({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div
      className="glass"
      style={{ borderRadius: 'var(--radius)', padding: '15px 16px', marginTop: 13 }}
    >
      <h4 style={{ margin: '0 0 13px', fontSize: 15.5, fontWeight: 800 }}>{titre}</h4>
      {children}
    </div>
  )
}

/** Raison, alertes de contrainte, et les deux boutons. Commun aux panneaux. */
function Pied({
  patch,
  raison,
  setRaison,
  semaineAvant,
  simuler,
  onValider,
  onEffacer,
  effacerLabel,
  effacerVisible,
}: {
  patch: EcartPatch
  raison: string
  setRaison: (v: string) => void
  semaineAvant: Session[]
  simuler: (patch: EcartPatch) => Session[]
  onValider: () => void
  onEffacer: () => void
  effacerLabel: string
  effacerVisible: boolean
}) {
  const alertes: Alerte[] = alertesAjoutees(semaineAvant, simuler(patch))

  return (
    <>
      <div style={{ marginTop: 13 }}>
        <Champ label="Pourquoi">
          <input
            type="text"
            placeholder="facultatif"
            value={raison}
            onChange={(e) => setRaison(e.target.value)}
            style={styleChamp}
          />
        </Champ>
      </div>

      {alertes.length > 0 && <Alertes alertes={alertes} />}

      <Boutons
        onValider={onValider}
        onEffacer={onEffacer}
        effacerLabel={effacerLabel}
        effacerVisible={effacerVisible}
      />
    </>
  )
}

function Boutons({
  onValider,
  onEffacer,
  effacerLabel,
  effacerVisible,
}: {
  onValider: () => void
  onEffacer: () => void
  effacerLabel: string
  effacerVisible: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 9 }}>
      <button
        onClick={onValider}
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
      {effacerVisible && (
        <button
          onClick={onEffacer}
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--pill)',
            fontWeight: 700,
            fontSize: 15.5,
            color: 'var(--ink-2)',
            border: '1px solid var(--border-2)',
          }}
        >
          {effacerLabel}
        </button>
      )}
    </div>
  )
}

/**
 * Une distance ne se saisit que là où elle a un sens.
 *
 * Le plan en fixe une à toute séance de course. Le vélo n'en a pas, et pourtant
 * il en parcourt : elle se saisit ici. L'escalade, le renfo et le repos n'en
 * ont aucune, et un champ vide de plus ne fait qu'inviter à écrire n'importe
 * quoi. Un écart qui CONVERTIT une autre discipline en course n'hérite d'aucune
 * distance non plus : `versType` efface `dist` avec le reste de l'ancienne
 * séance, d'où le second cas.
 */
export function porteUneDistance(origine: Session, patch: EcartPatch): boolean {
  const type = patch.type ?? origine.type
  if (type === 'velo') return true
  return origine.dist != null || familleDe(type) === 'course'
}

export function Alertes({ alertes }: { alertes: Alerte[] }) {
  return (
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
  )
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '.9px',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

const styleChamp: React.CSSProperties = {
  width: '100%',
  padding: '12px 13px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border-2)',
  color: 'var(--ink)',
  fontSize: 15,
  fontWeight: 600,
}
