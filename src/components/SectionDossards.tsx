/**
 * La section « dossards » de l'écran Objectif.
 *
 * Une carte par course : date et compte à rebours, distance, objectif,
 * chrono une fois le jour passé, et le mot du coach qui compare les trois à
 * la forme projetée. Les dossards du plan y sont d'office et ne se suppriment
 * pas ; ceux qu'on ajoute ne touchent ni au programme ni à la charge.
 */
import { useState, type ReactNode } from 'react'
import type { Plan } from '../data/types'
import type { EcartPatch, EcartRow } from '../lib/overrides'
import { cleEcart } from '../lib/overrides'
import { daysBetween, formatDayLong, formatNumber } from '../lib/dates'
import { chronoPlausible, formatPace } from '../lib/paces'
import {
  formatChrono,
  listerDossards,
  motDuDossard,
  nouvelIdDossard,
  type Dossard,
  type DossardRow,
} from '../lib/dossards'
import { ChronoCourse, formaterChronoLong, lireChrono } from './ChronoCourse'
import { Icon } from './Icon'

const DISTANCES: Array<[string, number]> = [
  ['5 km', 5],
  ['10 km', 10],
  ['semi', 21.0975],
  ['marathon', 42.195],
]

export function SectionDossards({
  plan,
  now,
  lignes,
  ecarts,
  formeMarathon,
  formeTest,
  indisponibles,
  onSave,
  onSaveEcart,
  onRecalibrerForme,
}: {
  plan: Plan
  now: string
  lignes: DossardRow[]
  ecarts?: Map<string, EcartRow>
  /** Forme projetée, ressenti compris : c'est à elle que le coach compare. */
  formeMarathon: number
  /** Forme du dernier test, sans ajustement : la base d'un recalage. */
  formeTest: number
  indisponibles: boolean
  onSave?: (ligne: DossardRow) => void
  onSaveEcart?: (week: number, dayIndex: number, slot: number, patch: EcartPatch) => void
  onRecalibrerForme?: (allure: number) => void
}) {
  const dossards = listerDossards(plan, lignes, ecarts, now)
  const [ajout, setAjout] = useState(false)
  const modifiable = Boolean(onSave) && !indisponibles

  /** La ligne à écrire pour un dossard, avec ce qui change. */
  const ligneDe = (d: Dossard, patch: Partial<DossardRow>): DossardRow => ({
    ...(lignes.find((l) => l.id === d.id) ?? {
      id: d.id,
      nom: d.nom,
      day: d.day,
      distance_km: d.km,
      objectif_s: null,
      chrono_s: null,
      supprime: false,
    }),
    ...patch,
  })

  return (
    <section style={{ marginTop: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 2px 12px' }}>
        <h2 className="display" style={{ margin: 0, fontSize: 30 }}>
          dossards
        </h2>
        {modifiable && !ajout && (
          <button
            type="button"
            onClick={() => setAjout(true)}
            className="puce"
            style={{ background: 'var(--neon)', color: 'var(--ink)', fontWeight: 600, padding: '9px 16px' }}
          >
            <Icon name="plus" size={15} />
            ajouter
          </button>
        )}
      </div>

      {indisponibles && (
        <p className="carte" style={{ margin: '0 0 12px', padding: '14px 16px', fontSize: 14, lineHeight: 1.5, color: 'var(--warning)' }}>
          La table des dossards n'existe pas encore en base. Colle{' '}
          <code style={{ color: 'var(--ink)' }}>supabase/dossards.sql</code> dans l'éditeur SQL de
          Supabase : en attendant, les dossards du plan s'affichent mais rien ne s'enregistre.
        </p>
      )}

      {ajout && onSave && (
        <FormulaireDossard
          onAnnuler={() => setAjout(false)}
          onValider={(l) => {
            onSave(l)
            setAjout(false)
          }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {dossards.map((d) => (
          <CarteDossard
            key={d.id}
            dossard={d}
            now={now}
            formeMarathon={formeMarathon}
            formeTest={formeTest}
            modifiable={modifiable}
            onObjectif={(s) => onSave?.(ligneDe(d, { objectif_s: s }))}
            onChronoLibre={(s) => onSave?.(ligneDe(d, { chrono_s: s }))}
            onSupprimer={d.duPlan ? undefined : () => onSave?.(ligneDe(d, { supprime: true }))}
            onChronoRecale={
              d.recale && d.seance && onSaveEcart && onRecalibrerForme
                ? (chrono, allure) => {
                    const { semaine, jour, slot } = d.seance!
                    // Même chemin que la feuille de séance : le chrono devient
                    // la durée réelle de la course, la forme se recale dessus.
                    const actuel = ecarts?.get(cleEcart(semaine, jour, slot))?.patch ?? {}
                    onSaveEcart(semaine, jour, slot, { ...actuel, durMin: chrono / 60 })
                    onRecalibrerForme(allure)
                  }
                : undefined
            }
          />
        ))}
      </div>
    </section>
  )
}

function CarteDossard({
  dossard: d,
  now,
  formeMarathon,
  formeTest,
  modifiable,
  onObjectif,
  onChronoLibre,
  onChronoRecale,
  onSupprimer,
}: {
  dossard: Dossard
  now: string
  formeMarathon: number
  formeTest: number
  modifiable: boolean
  onObjectif: (secondes: number | null) => void
  onChronoLibre: (secondes: number | null) => void
  onChronoRecale?: (chrono: number, allure: number) => void
  onSupprimer?: () => void
}) {
  const jours = daysBetween(now, d.day)
  const passe = jours < 0
  const mot = motDuDossard(d, formeMarathon, now)
  const [confirmer, setConfirmer] = useState(false)

  return (
    <article className="carte" style={{ padding: '18px 18px 18px', opacity: passe && d.chronoS == null ? 0.92 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="display" style={{ margin: 0, fontSize: 23, lineHeight: 1.15 }}>
            {d.nom}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--accent)' }}>
            {formatDayLong(d.day)} · {formatNumber(Math.round(d.km * 10) / 10)} km
            {d.duPlan ? ' · au plan' : ''}
          </p>
        </div>
        <span
          className="puce"
          style={{
            flex: 'none',
            background: jours === 0 ? 'var(--pale)' : 'var(--surface-3)',
            color: jours === 0 ? 'var(--pale-ink)' : 'var(--ink)',
          }}
        >
          {jours === 0 ? "aujourd'hui" : passe ? `il y a ${-jours} j` : `dans ${jours} j`}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        <ChampChrono
          key={`o-${d.objectifS}`}
          label="objectif"
          km={d.km}
          valeur={d.objectifS}
          modifiable={modifiable}
          onValider={onObjectif}
        />
        {passe || jours === 0 ? (
          onChronoRecale ? (
            <Valeur label="chrono" texte={d.chronoS != null ? formatChrono(d.chronoS) : '—'} />
          ) : (
            <ChampChrono key={`c-${d.chronoS}`} label="chrono" km={d.km} valeur={d.chronoS} modifiable={modifiable} onValider={onChronoLibre} />
          )
        ) : (
          <Valeur label="allure visée" texte={d.objectifS != null ? `${formatPace(d.objectifS / d.km)}/km` : '—'} />
        )}
      </div>

      {(passe || jours === 0) && onChronoRecale && (
        <div style={{ marginTop: 12 }}>
          <ChronoCourse
            km={d.km}
            chronoSaisi={d.chronoS}
            formeActuelle={formeTest}
            disabled={!modifiable}
            onValider={onChronoRecale}
          />
        </div>
      )}

      <div
        className="carte-braise"
        style={{ marginTop: 14, padding: '14px 16px', borderRadius: 20 }}
      >
        <p className="etiquette" style={{ color: 'var(--pale)', opacity: 0.85 }}>
          le mot du coach
        </p>
        <p className="display-it" style={{ margin: '6px 0 0', fontSize: 18, lineHeight: 1.35 }}>
          {mot.constat}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--sur-ink-2)' }}>{mot.conseil}</p>
      </div>

      {onSupprimer && modifiable && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {confirmer ? (
            <>
              <button type="button" onClick={() => setConfirmer(false)} style={boutonDiscret}>
                garder
              </button>
              <button type="button" onClick={onSupprimer} style={{ ...boutonDiscret, color: 'var(--critical)', borderColor: 'rgba(255,107,94,.4)' }}>
                retirer ce dossard
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmer(true)} style={boutonDiscret}>
              retirer
            </button>
          )}
        </div>
      )}
    </article>
  )
}

const boutonDiscret = {
  padding: '8px 14px',
  borderRadius: 'var(--pill)',
  border: '1px solid var(--border-2)',
  fontSize: 13.5,
  color: 'var(--sur-ink-2)',
} as const

function Valeur({ label, texte }: { label: string; texte: string }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 18, background: 'var(--surface-2)' }}>
      <div style={{ fontSize: 13, color: 'var(--accent)' }}>{label}</div>
      <div className="chiffre" style={{ fontSize: 24, marginTop: 2 }}>
        {texte}
      </div>
    </div>
  )
}

/** Un chrono qu'on touche pour le saisir ; il s'enregistre en quittant le champ. */
function ChampChrono({
  label,
  km,
  valeur,
  modifiable,
  onValider,
}: {
  label: string
  km: number
  valeur: number | null
  modifiable: boolean
  onValider: (secondes: number | null) => void
}) {
  const [saisie, setSaisie] = useState(valeur != null ? formatChrono(valeur) : '')
  const secondes = lireChrono(saisie)
  const invalide = saisie !== '' && (secondes == null || !chronoPlausible(km, secondes))

  if (!modifiable) return <Valeur label={label} texte={valeur != null ? formatChrono(valeur) : '—'} />

  return (
    <label
      style={{
        display: 'block',
        padding: '12px 14px',
        borderRadius: 18,
        background: 'var(--surface-2)',
        border: `1px ${saisie ? 'solid' : 'dashed'} ${invalide ? 'var(--c-erreur)' : 'var(--border-2)'}`,
      }}
    >
      <div style={{ fontSize: 13, color: invalide ? 'var(--c-erreur)' : 'var(--accent)' }}>
        {invalide ? 'chrono hors plage' : label}
      </div>
      <input
        type="text"
        inputMode="numeric"
        placeholder={km >= 20 ? '—:——:——' : '—:——'}
        value={saisie}
        onChange={(e) => setSaisie(formaterChronoLong(e.target.value))}
        onBlur={() => {
          if (saisie === '') onValider(null)
          else if (!invalide && secondes != null) onValider(secondes)
        }}
        style={{
          width: '100%',
          marginTop: 2,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          color: 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
        }}
      />
    </label>
  )
}

function FormulaireDossard({
  onAnnuler,
  onValider,
}: {
  onAnnuler: () => void
  onValider: (ligne: DossardRow) => void
}) {
  const [nom, setNom] = useState('')
  const [day, setDay] = useState('')
  const [km, setKm] = useState<number | null>(10)
  const [autre, setAutre] = useState('')
  const [objectif, setObjectif] = useState('')

  const distance = km ?? (autre ? Number(autre.replace(',', '.')) : null)
  const objectifS = objectif ? lireChrono(objectif) : null
  const objectifInvalide = objectif !== '' && (objectifS == null || distance == null || !chronoPlausible(distance, objectifS))
  const pret = nom.trim() !== '' && /^\d{4}-\d{2}-\d{2}$/.test(day) && distance != null && distance > 0 && !objectifInvalide

  return (
    <div className="carte" style={{ padding: '18px 18px', marginBottom: 12, borderColor: 'var(--border-2)' }}>
      <p className="etiquette" style={{ fontSize: 14 }}>nouveau dossard</p>

      <Champ label="nom de la course">
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Corrida de Noël" style={styleChamp} />
      </Champ>
      <Champ label="date">
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} style={styleChamp} />
      </Champ>
      <Champ label="distance">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DISTANCES.map(([l, v]) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setKm(v)
                setAutre('')
              }}
              className="puce"
              style={km === v ? { background: 'var(--pale)', color: 'var(--pale-ink)' } : undefined}
            >
              {l}
            </button>
          ))}
          <input
            inputMode="decimal"
            placeholder="autre, en km"
            value={autre}
            onChange={(e) => {
              setAutre(e.target.value)
              setKm(null)
            }}
            style={{ ...styleChamp, width: 130, padding: '7px 13px' }}
          />
        </div>
      </Champ>
      <Champ label={objectifInvalide ? 'objectif hors plage pour cette distance' : 'objectif (facultatif)'}>
        <input
          inputMode="numeric"
          placeholder={distance != null && distance >= 20 ? '1:30:00' : '40:00'}
          value={objectif}
          onChange={(e) => setObjectif(formaterChronoLong(e.target.value))}
          style={{ ...styleChamp, borderColor: objectifInvalide ? 'var(--c-erreur)' : undefined }}
        />
      </Champ>

      <p style={{ margin: '4px 2px 14px', fontSize: 13, lineHeight: 1.5, color: 'var(--sur-ink-3)' }}>
        Un dossard ajouté ne change rien au programme ni à l'indice : le plan reste celui qui est écrit.
        S'il tombe sur une séance, c'est à toi de la déplacer ou de la remplacer.
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={!pret}
          onClick={() =>
            onValider({
              id: nouvelIdDossard(),
              nom: nom.trim(),
              day,
              distance_km: distance!,
              objectif_s: objectifS,
              chrono_s: null,
              supprime: false,
            })
          }
          style={{
            flex: 1,
            padding: 14,
            borderRadius: 'var(--pill)',
            background: pret ? 'var(--neon)' : 'var(--surface-3)',
            color: pret ? 'var(--ink)' : 'var(--ink-3)',
            fontSize: 15.5,
            fontWeight: 600,
          }}
        >
          ajouter le dossard
        </button>
        <button type="button" onClick={onAnnuler} style={{ ...boutonDiscret, padding: '14px 18px', fontSize: 15 }}>
          annuler
        </button>
      </div>
    </div>
  )
}

function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 13.5, color: 'var(--accent)', marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  )
}

const styleChamp = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 16,
  background: 'var(--surface-2)',
  border: '1px solid var(--border-2)',
  color: 'var(--ink)',
  fontSize: 16,
  colorScheme: 'dark',
} as const
