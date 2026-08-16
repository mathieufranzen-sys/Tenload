/**
 * La séance du jour, dépliée, en verre dépoli sur le dégradé.
 *
 * Toutes les sections partagent le même retrait horizontal (16 px, 20 px à
 * gauche pour dégager le rail) : c'est ce qui manquait à la maquette, chaque
 * bloc avait son propre padding et les colonnes ne s'alignaient pas.
 */
import type { CSSProperties, ReactNode } from 'react'
import planJson from '../data/plan.json'
import type { Plan, Session, ZoneKey } from '../data/types'
import { formatNumber } from '../lib/dates'
import { allureUnique, estimateDuration, formatPace, zonePace } from '../lib/paces'
import { butDeLaSeance } from '../lib/coach'
import { CarteCoach } from './CarteCoach'

const plan = planJson as unknown as Plan

/** Retrait commun à toutes les sections de la carte. */
const RETRAIT = '15px 16px 15px 20px'

export function SessionHero({
  session: s,
  marathonPace,
  /** Le jour affiché, quand ce n'est pas aujourd'hui. Sert l'étiquette du haut. */
  quand = "Aujourd'hui",
  onClick,
}: {
  session: Session
  marathonPace: number
  quand?: string
  onClick?: () => void
}) {
  const Balise = onClick ? 'button' : 'div'
  const premierSegment = s.struct?.[0]
  const premierPas = s.main?.[0] ?? s.wu?.[0]
  // Le plan ne fixe une durée que pour le vélo et la muscu : pour une course,
  // elle se déduit de la structure et des allures courantes.
  const [dureeMin, dureeMax] = s.type === 'repos' ? [0, 0] : estimateDuration(s, marathonPace)
  // Rien si la séance change d'allure en route : voir `allureUnique`.
  const allure = allureUnique(s, marathonPace)

  return (
    <Balise
      onClick={onClick}
      className="glass"
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        textAlign: 'left',
        borderRadius: 22,
        overflow: 'hidden',
        color: 'inherit',
        padding: 0,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: `var(--c-${s.type})`,
        }}
      />

      <div style={{ padding: RETRAIT }}>
        <div style={etiquette}>{quand} · {s.cat}</div>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: '-.3px',
            margin: '3px 0 0',
            lineHeight: 1.25,
          }}
        >
          {s.title}
        </h2>
        {s.adapted && (
          <span
            style={{
              display: 'inline-block',
              marginTop: 8,
              fontSize: 9.5,
              fontWeight: 600,
              padding: '3px 9px',
              borderRadius: 'var(--pill)',
              background: 'rgba(255,199,120,.2)',
              color: '#ffd08a',
              border: '1px solid rgba(255,199,120,.28)',
            }}
          >
            {s.adapted}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', borderTop: SEPARATEUR }}>
        {s.dist ? <Kv label="Distance" value={`${formatNumber(s.dist)} km`} /> : null}
        {dureeMin > 0 ? (
          <Kv label="Durée" value={dureeMin === dureeMax ? `${dureeMin} min` : `${dureeMin}-${dureeMax} min`} />
        ) : null}
        {allure != null ? (
          <Kv label="Allure" value={formatPace(allure)} />
        ) : s.type === 'repos' ? (
          <Kv label="Charge" value="Aucune" />
        ) : null}
      </div>

      {(premierSegment || premierPas || s.ex?.length) && (
        <div style={{ padding: RETRAIT, borderTop: SEPARATEUR }}>
          {premierSegment && (
            <Pas
              titre={`${formatNumber(premierSegment.km)} km : ${formatPace(zonePace(marathonPace, premierSegment.zone))}/km`}
              detail={detailZone(premierSegment.zone, marathonPace)}
              couleur={`var(--c-${plan.zones[premierSegment.zone].color})`}
            />
          )}
          {!premierSegment && premierPas && (
            <Pas
              titre={typeof premierPas[0] === 'number' ? `${formatNumber(premierPas[0])} km` : String(premierPas[0])}
              detail={typeof premierPas[1] === 'string' && !(premierPas[1] in plan.zones) ? premierPas[1] : undefined}
              couleur={`var(--c-${s.type})`}
            />
          )}
          {!premierSegment && !premierPas && s.ex?.[0] && (
            <Pas titre={s.ex[0][0]} detail={s.ex[0][1]} couleur={`var(--c-${s.type})`} />
          )}
        </div>
      )}

      {/* Même bandeau que dans le détail de séance : une seule voix, une seule
          forme. La pastille ronde « C » qui tenait cette place ressemblait à un
          troisième interlocuteur. */}
      <div style={{ padding: '0 16px 15px 20px', marginTop: 15 }}>
        <CarteCoach texte={s.note} but={butDeLaSeance(s.type)} compact />
      </div>
    </Balise>
  )
}

const SEPARATEUR = '1px solid rgba(255,255,255,.12)'

const etiquette: CSSProperties = {
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: '.8px',
  textTransform: 'uppercase',
  color: 'var(--sur-ink-2)',
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, padding: '11px 12px 11px 20px', borderRight: SEPARATEUR }}>
      <div
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '.6px',
          textTransform: 'uppercase',
          color: 'var(--sur-ink-3)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 650,
          letterSpacing: '-.3px',
          marginTop: 3,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Pas({ titre, detail, couleur }: { titre: string; detail?: ReactNode; couleur: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
      <span aria-hidden style={{ width: 3, borderRadius: 2, background: couleur, flex: 'none' }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-.1px', lineHeight: 1.3 }}>{titre}</div>
        {detail && (
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--sur-ink-3)', marginTop: 2, lineHeight: 1.35 }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  )
}

function detailZone(zone: ZoneKey, marathonPace: number): string {
  if (zone === 'am') return 'Ton allure cible marathon'
  if (zone === 'ef' || zone === 'recup')
    return `Pas plus vite que ${formatPace(zonePace(marathonPace, zone))}/km. C'est une limite, pas un objectif.`
  return plan.zones[zone].label
}
