/**
 * La section « dossards » de l'écran Objectif.
 *
 * Une carte par course : date et compte à rebours, distance, objectif,
 * chrono une fois le jour passé, et le mot du coach qui compare les trois à
 * la forme projetée. Les dossards du plan y sont d'office et ne se suppriment
 * pas ; ceux qu'on ajoute ne touchent ni au programme ni à la charge.
 */
import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Plan } from '../data/types'
import type { EcartPatch, EcartRow } from '../lib/overrides'
import { cleEcart } from '../lib/overrides'
import { daysBetween, formatDayLong, formatNumber } from '../lib/dates'
import { chronoPlausible, formatPace } from '../lib/paces'
import {
  chronoEquivalent,
  formatChrono,
  listerDossards,
  motDuDossard,
  nouvelIdDossard,
  type Dossard,
  type DossardRow,
} from '../lib/dossards'
import { CarteForme } from './CarteForme'
import { ChronoCourse, formaterChronoLong, lireChrono } from './ChronoCourse'
import { SubPage } from './SubPage'
import { BoutonAction } from './BoutonAction'
import { Icon } from './Icon'

const DISTANCES: Array<[string, number]> = [
  ['5 km', 5],
  ['10 km', 10],
  ['Semi', 21.0975],
  ['Marathon', 42.195],
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
  periode,
  allureMarathon,
  titre = true,
}: {
  /**
   * Les dossards à venir vivent dans Objectif, ceux qui sont passés dans
   * Profil → Dossards passés (retour du 22 septembre) : une course courue
   * n'est plus un objectif.
   */
  periode: 'avenir' | 'passe'
  /** Allure marathon visée, pour l'objectif par défaut du marathon. */
  allureMarathon: number
  /** Le titre « Dossards » : inutile dans une sous-page qui porte déjà le sien. */
  titre?: boolean
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
  const dossards = listerDossards(plan, lignes, ecarts, now, allureMarathon).filter((d) =>
    periode === 'avenir' ? d.day >= now : d.day < now,
  )
  const [ajout, setAjout] = useState(false)
  const [ouvert, setOuvert] = useState<string | null>(null)
  const dossardOuvert = dossards.find((d) => d.id === ouvert) ?? null
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
    <section style={{ marginTop: titre ? 26 : 0 }}>
      {/* Le bouton d'ajout reste à côté du titre (retour du 22 septembre) :
          en bas de liste, il descendait à chaque dossard ajouté. */}
      {titre && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '0 2px 12px' }}>
          <h2 className="display" style={{ margin: 0, fontSize: 'var(--fs-t-page)' }}>
            Dossards
          </h2>
          {modifiable && !ajout && (
            <BoutonAction icone="plus" onClick={() => setAjout(true)} style={{ width: 'auto' }}>
              Ajouter
            </BoutonAction>
          )}
        </div>
      )}

      {indisponibles && (
        <p className="carte" style={{ margin: '0 0 12px', padding: '14px 16px', fontSize: 'var(--fs-meta)', lineHeight: 1.5, color: 'var(--warning)' }}>
          La table des dossards n'existe pas encore en base. Colle{' '}
          <code style={{ color: 'var(--ink)' }}>supabase/dossards.sql</code> dans l'éditeur SQL de
          Supabase : en attendant, les dossards du plan s'affichent mais rien ne s'enregistre.
        </p>
      )}


      {/* Le formulaire s'ouvre sous le bouton qui l'appelle. */}
      <div>
        {ajout && onSave && (
          <FormulaireDossard
            onAnnuler={() => setAjout(false)}
            onValider={(l) => {
              onSave(l)
              setAjout(false)
            }}
          />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dossards.length === 0 && (
          <p style={{ margin: '4px 2px', fontSize: 'var(--fs-texte)', color: 'var(--ink-2)' }}>
            {periode === 'passe' ? 'Aucun dossard couru pour l’instant.' : 'Aucun dossard à venir.'}
          </p>
        )}
        {dossards.map((d) => (
          <ResumeDossard key={d.id} dossard={d} now={now} onOuvrir={() => setOuvert(d.id)} />
        ))}
      </div>


      {!titre && modifiable && !ajout && (
        <BoutonAction icone="plus" onClick={() => setAjout(true)} style={{ marginTop: 12 }}>
          Ajouter un dossard
        </BoutonAction>
      )}

      {/* Toucher un dossard ouvre sa page : c'est là que se saisissent le
          chrono réel et l'objectif, et que parle le coach. */}
      {dossardOuvert && (() => {
        const d = dossardOuvert
        // Par un portail : dans Profil, la section vit déjà dans une sous-page
        // décalée par `transform`, et un `position: fixed` imbriqué s'y
        // positionnerait par rapport à elle au lieu de l'écran.
        return createPortal(
          <SubPage
            ouvert
            surtitre={`${formatDayLong(d.day)} · ${formatNumber(Math.round(d.km * 10) / 10)} km`}
            titre={d.nom}
            onBack={() => setOuvert(null)}
          >
          <CarteDossard
            key={d.id}
            dossard={d}
            now={now}
            formeMarathon={formeMarathon}
            formeTest={formeTest}
            modifiable={modifiable}
            onObjectif={(s) => onSave?.(ligneDe(d, { objectif_s: s }))}
            onChronoLibre={(s) => onSave?.(ligneDe(d, { chrono_s: s }))}
            onSupprimer={
              d.duPlan
                ? undefined
                : () => {
                    onSave?.(ligneDe(d, { supprime: true }))
                    setOuvert(null)
                  }
            }
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
          </SubPage>,
          document.body,
        )
      })()}
    </section>
  )
}

/** Un dossard dans la liste : ce qu'il faut voir d'un coup d'œil, et la porte vers sa page. */
function ResumeDossard({ dossard: d, now, onOuvrir }: { dossard: Dossard; now: string; onOuvrir: () => void }) {
  const jours = daysBetween(now, d.day)
  const passe = jours < 0
  return (
    <button
      type="button"
      onClick={onOuvrir}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '16px 18px',
        color: 'inherit',
        // Un fond bleu clair plutôt que le gris des cartes : un dossard est un
        // rendez-vous, pas une ligne de liste (retour du 22 septembre).
        background: passe ? 'var(--surface)' : 'var(--bleu-50)',
        border: `1px solid ${passe ? 'var(--border)' : 'var(--bleu-100)'}`,
        borderRadius: 'var(--radius)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="display" style={{ margin: 0, fontSize: 'var(--fs-t-carte)', lineHeight: 1.15, fontWeight: 400 }}>
            {d.nom}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--fs-meta)', color: 'var(--ink-2)' }}>
            {formatDayLong(d.day)} · {formatNumber(Math.round(d.km * 10) / 10)} km
          </p>
        </div>
        <span
          className="puce"
          style={{
            flex: 'none',
            background: jours === 0 ? 'var(--neon)' : '#ffffff',
            color: jours === 0 ? 'var(--pale-ink)' : 'var(--bleu-700)',
            fontWeight: 600,
          }}
        >
          {jours === 0 ? "Aujourd'hui" : passe ? `Il y a ${-jours} j` : `Dans ${jours} j`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 14 }}>
        <div>
          <div style={{ fontSize: 'var(--fs-detail)', color: 'var(--ink-2)' }}>Objectif</div>
          <div className="chiffre" style={{ fontSize: 'var(--fs-c-m)' }}>{d.objectifS != null ? formatChrono(d.objectifS) : '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 'var(--fs-detail)', color: 'var(--ink-2)' }}>{passe || jours === 0 ? 'Chrono' : 'Allure visée'}</div>
          <div className="chiffre" style={{ fontSize: 'var(--fs-c-m)', color: passe ? 'var(--ink)' : 'var(--bleu-700)' }}>
            {passe || jours === 0
              ? d.chronoS != null
                ? formatChrono(d.chronoS)
                : 'À saisir'
              : d.objectifS != null
                ? `${formatPace(d.objectifS / d.km)}/km`
                : '—'}
          </div>
        </div>
        <Icon name="chevronRight" size={18} style={{ marginLeft: 'auto', alignSelf: 'center', color: 'var(--ink-3)' }} />
      </div>
    </button>
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
    // La page du dossard porte déjà son nom et sa date en titre : le corps
    // commence par ce qui se saisit.
    <article>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <span className="puce" style={{ background: jours === 0 ? 'var(--neon)' : 'var(--surface)' }}>
          {jours === 0 ? "Aujourd'hui" : passe ? `Il y a ${-jours} j` : `Dans ${jours} j`}
        </span>
        {d.duPlan && (
          <span className="puce" style={{ background: 'var(--surface)' }}>
            Au plan
          </span>
        )}
      </div>

      {/* L'objectif et le chrono réel, toujours côte à côte (retour du
          22 septembre) : avant la course, le chrono attend le jour J au lieu
          de céder sa place à l'allure visée, qui se lit sous l'objectif. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        <ChampChrono
          key={`o-${d.objectifS}`}
          label="Objectif"
          km={d.km}
          valeur={d.objectifS}
          modifiable={modifiable}
          onValider={onObjectif}
        />
        {!passe && jours !== 0 ? (
          <Valeur label="Chrono réel" texte="Le jour J" attente />
        ) : onChronoRecale ? (
          <Valeur label="Chrono réel" texte={d.chronoS != null ? formatChrono(d.chronoS) : '—'} />
        ) : (
          <ChampChrono key={`c-${d.chronoS}`} label="Chrono réel" km={d.km} valeur={d.chronoS} modifiable={modifiable} onValider={onChronoLibre} />
        )}
      </div>
      {d.objectifS != null && (
        // L'allure visée est ce qu'on emporte sur la ligne de départ : elle a
        // son bloc, pas une note de bas de page (retour du 22 septembre).
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 10,
            padding: '14px 16px',
            borderRadius: 18,
            background: 'var(--bleu-50)',
            border: '1px solid var(--bleu-100)',
          }}
        >
          <span style={{ fontSize: 'var(--fs-texte)', color: 'var(--bleu-700)' }}>Allure visée</span>
          <span className="chiffre" style={{ fontSize: 'var(--fs-c-l)', color: 'var(--bleu-700)', lineHeight: 1 }}>
            {formatPace(d.objectifS / d.km)}/km
          </span>
        </div>
      )}

      {/* La forme du jour contre l'objectif de CETTE course : la même règle
          que la forme projetée du marathon, à l'échelle de la distance
          (retour du 23 septembre). */}
      {!passe && d.objectifS != null && (
        <CarteForme
          style={{ marginTop: 16 }}
          titre="Ta forme aujourd'hui"
          minutes={chronoEquivalent(d.km, formeMarathon) / 60}
          objectif={d.objectifS / 60}
          plage={[(d.objectifS / 60) * 0.08, (d.objectifS / 60) * 0.04]}
          format={(min) => formatChrono(min * 60)}
          lue
          seances={0}
        />
      )}

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
          Le mot du coach
        </p>
        <p className="display-it" style={{ margin: '6px 0 0', fontSize: 'var(--fs-coach-s)', lineHeight: 1.35 }}>
          {mot.constat}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-meta)', lineHeight: 1.5, color: 'var(--sur-ink-2)' }}>{mot.conseil}</p>
      </div>

      {onSupprimer && modifiable && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {confirmer ? (
            <>
              <button type="button" onClick={() => setConfirmer(false)} style={boutonDiscret}>
                Garder
              </button>
              <button type="button" onClick={onSupprimer} style={{ ...boutonDiscret, color: 'var(--critical)', borderColor: 'color-mix(in srgb, var(--critical) 40%, transparent)' }}>
                Retirer ce dossard
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmer(true)} style={boutonDiscret}>
              Retirer
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
  fontSize: 'var(--fs-meta)',
  color: 'var(--sur-ink-2)',
} as const

function Valeur({ label, texte, attente }: { label: string; texte: string; attente?: boolean }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 18, background: 'var(--surface)' }}>
      <div style={{ fontSize: 'var(--fs-detail)', color: 'var(--accent)' }}>{label}</div>
      <div className="chiffre" style={{ fontSize: 'var(--fs-c-m)', marginTop: 2, color: attente ? 'var(--ink-3)' : undefined }}>
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
        background: 'var(--surface)',
        border: `1px ${saisie ? 'solid' : 'dashed'} ${invalide ? 'var(--c-erreur)' : 'var(--border-2)'}`,
      }}
    >
      <div style={{ fontSize: 'var(--fs-detail)', color: invalide ? 'var(--c-erreur)' : 'var(--accent)' }}>
        {invalide ? 'Chrono hors plage' : label}
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
          fontSize: 'var(--fs-c-m)',
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
      <p className="etiquette" style={{ fontSize: 'var(--fs-meta)' }}>Nouveau dossard</p>

      <Champ label="Nom de la course">
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Corrida de Noël" style={styleChamp} />
      </Champ>
      <Champ label="Date">
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} style={styleChamp} />
      </Champ>
      <Champ label="Distance">
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
            placeholder="Autre, en km"
            value={autre}
            onChange={(e) => {
              setAutre(e.target.value)
              setKm(null)
            }}
            style={{ ...styleChamp, width: 130, padding: '7px 13px' }}
          />
        </div>
      </Champ>
      <Champ label={objectifInvalide ? 'Objectif hors plage pour cette distance' : 'Objectif (facultatif)'}>
        <input
          inputMode="numeric"
          placeholder={distance != null && distance >= 20 ? '1:30:00' : '40:00'}
          value={objectif}
          onChange={(e) => setObjectif(formaterChronoLong(e.target.value))}
          style={{ ...styleChamp, borderColor: objectifInvalide ? 'var(--c-erreur)' : undefined }}
        />
      </Champ>

      <p style={{ margin: '4px 2px 14px', fontSize: 'var(--fs-detail)', lineHeight: 1.5, color: 'var(--sur-ink-3)' }}>
        Un dossard ajouté ne change rien au programme ni à l'indice : le plan reste celui qui est écrit.
        S'il tombe sur une séance, c'est à toi de la déplacer ou de la remplacer.
      </p>

      <BoutonAction
        icone="check"
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
      >
        Ajouter le dossard
      </BoutonAction>
      <button
        type="button"
        onClick={onAnnuler}
        style={{ ...boutonDiscret, display: 'block', width: '100%', marginTop: 8, padding: '14px 18px', fontSize: 'var(--fs-texte)' }}
      >
        Annuler
      </button>
    </div>
  )
}

function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--accent)', marginBottom: 7 }}>{label}</div>
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
  fontSize: 'var(--fs-body)',
  colorScheme: 'light',
} as const
