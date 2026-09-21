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
import { useState, type ReactNode } from 'react'
import type { Session, SessionType } from '../data/types'
import { formatNumber } from '../lib/dates'
import { familleDe } from '../lib/insights'
import {
  alertesAjoutees,
  titreQualite,
  TYPES_REMPLACEMENT,
  type Alerte,
  type EcartPatch,
  type Qualite,
  type ZoneQualite,
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
          gap: 8,
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
                onClick={() => maj({ type: r.type, qualite: undefined })}
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
                    patch.type === r.type ? 'color-mix(in srgb, var(--ink) 11%, transparent)' : 'color-mix(in srgb, var(--ink) 4%, transparent)',
                  border:
                    patch.type === r.type
                      ? '1px solid color-mix(in srgb, var(--ink) 26%, transparent)'
                      : '1px solid var(--border)',
                }}
              >
                <MarqueType type={r.type} />
                <span style={{ flex: 1 }}>{r.label}</span>
              </button>
            ))}
          </div>
          {/* Une séance spécifique n'est pas une discipline, c'est un contenu :
              la liste au-dessus ne sait pas la produire. Trois réglages
              suffisent à la composer, et le titre s'écrit tout seul. */}
          <ComposeurQualite
            valeur={patch.qualite ?? null}
            onChange={(q) => maj({ qualite: q ?? undefined, type: undefined })}
          />
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
              enregistrer({ ...patch, type: undefined, qualite: undefined })
              setPanneau(null)
            }}
            effacerLabel="Garder la séance"
            effacerVisible={patch.type != null || patch.qualite != null}
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
        background: 'color-mix(in srgb, var(--ink) 7%, transparent)',
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

/**
 * Le composeur de séance de qualité.
 *
 * Trois réglages et pas un de plus : le nombre de répétitions, leur longueur,
 * leur zone. Un champ libre laisserait écrire « 5 x 1000 m » sans que le
 * modèle sache ce que ça coûte au tendon, et un titre qui ne se traduit pas en
 * segments est un titre qui ment sur la charge.
 */
const LONGUEURS = [0.4, 0.5, 0.8, 1, 1.5, 2, 3, 4, 5]
const ZONES: Array<{ cle: ZoneQualite; label: string }> = [
  { cle: 'am', label: 'Allure marathon' },
  { cle: 'seuil', label: 'Seuil' },
  { cle: 'vo2', label: 'VO2max' },
]

function ComposeurQualite({
  valeur,
  onChange,
}: {
  valeur: Qualite | null
  onChange: (q: Qualite | null) => void
}) {
  const q: Qualite = valeur ?? { reps: 5, km: 1, zone: 'seuil' }
  const actif = valeur != null

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 14,
        borderTop: '1px dashed var(--border-2)',
      }}
    >
      <button
        onClick={() => onChange(actif ? null : q)}
        aria-pressed={actif}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          width: '100%',
          padding: '12px 13px',
          borderRadius: 'var(--radius-sm)',
          textAlign: 'left',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--ink)',
          background: actif ? 'color-mix(in srgb, var(--ink) 11%, transparent)' : 'color-mix(in srgb, var(--ink) 4%, transparent)',
          border: actif ? '1px solid color-mix(in srgb, var(--ink) 26%, transparent)' : '1px solid var(--border)',
        }}
      >
        {/* L'icône suit la zone : en VO2 la séance devient un intervalle, et
            l'échelle d'intensité doit le dire avant qu'on lise le titre. */}
        <MarqueType type={q.zone === 'vo2' ? 'inter' : 'tempo'} />
        <span style={{ flex: 1 }}>{actif ? titreQualite(q) : 'Une séance de qualité'}</span>
      </button>

      {actif && (
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <Reglage label="Répétitions">
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <Choix key={n} actif={q.reps === n} onClick={() => onChange({ ...q, reps: n })}>
                {n === 1 ? 'continu' : String(n)}
              </Choix>
            ))}
          </Reglage>
          <Reglage label="Longueur d’une répétition">
            {LONGUEURS.map((km) => (
              <Choix key={km} actif={q.km === km} onClick={() => onChange({ ...q, km })}>
                {km < 1 ? `${Math.round(km * 1000)} m` : `${formatNumber(km)} km`}
              </Choix>
            ))}
          </Reglage>
          <Reglage label="Zone">
            {ZONES.map((z) => (
              <Choix key={z.cle} actif={q.zone === z.cle} onClick={() => onChange({ ...q, zone: z.cle })}>
                {z.label}
              </Choix>
            ))}
          </Reglage>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--sur-ink-3)', lineHeight: 1.45 }}>
            {formatNumber(Math.round((q.reps * q.km + 4.5) * 10) / 10)} km au total, échauffement de
            2,5 km et retour au calme de 2 km compris. Le contrôle des contraintes la traite comme
            une séance de vitesse.
          </p>
        </div>
      )}
    </div>
  )
}

function Reglage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--accent)',
          marginBottom: 7,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{children}</div>
    </div>
  )
}

function Choix({
  actif,
  onClick,
  children,
}: {
  actif: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={actif}
      style={{
        padding: '7px 12px',
        borderRadius: 'var(--pill)',
        fontSize: 13,
        fontWeight: 650,
        fontVariantNumeric: 'tabular-nums',
        color: actif ? 'var(--pale-ink)' : 'var(--ink)',
        background: actif ? 'var(--pale)' : 'color-mix(in srgb, var(--ink) 5%, transparent)',
        border: actif ? '1px solid var(--pale)' : '1px solid var(--border)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

/** Une tuile d'action de la maquette : l'icône au-dessus, le verbe dessous. */
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
      aria-pressed={actif}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 9,
        padding: '16px 4px 14px',
        borderRadius: 22,
        color: actif ? 'var(--pale-ink)' : 'var(--ink)',
        background: actif ? 'var(--pale)' : 'var(--surface)',
        border: `1px solid ${actif ? 'var(--pale)' : 'var(--border-2)'}`,
        opacity: onClick ? 1 : 0.35,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Icon name={icone} size={21} style={{ strokeWidth: 1.6 }} />
      <span style={{ fontSize: 13.5, textAlign: 'center', lineHeight: 1.2, textTransform: 'lowercase' }}>
        {label}
      </span>
    </button>
  )
}

function Panneau({ titre, children }: { titre: string; children: ReactNode }) {
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
          fontWeight: 600,
          fontSize: 15.5,
          background: 'var(--pale)',
          color: 'var(--pale-ink)',
        }}
      >
        enregistrer
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
        background: 'rgba(255,107,94,.12)',
        border: '1px solid rgba(255,107,94,.32)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--critical)', marginBottom: 6 }}>
        {alertes.length > 1
          ? `${alertes.length} contraintes ne tiennent plus`
          : 'Une contrainte ne tient plus'}
      </div>
      <ul style={{ margin: 0, paddingLeft: 17, color: 'var(--ink)', fontSize: 13.5, lineHeight: 1.55 }}>
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

function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ fontSize: 14, color: 'var(--accent)', marginBottom: 7, textTransform: 'lowercase' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

const styleChamp: React.CSSProperties = {
  width: '100%',
  padding: '12px 13px',
  borderRadius: 16,
  background: 'var(--surface-2)',
  border: '1px solid var(--border-2)',
  color: 'var(--ink)',
  fontSize: 15,
  fontWeight: 600,
}
