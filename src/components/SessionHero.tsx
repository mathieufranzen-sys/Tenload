/**
 * La séance du jour, en tête de l'écran Aujourd'hui.
 *
 * Refonte du 21 septembre 2026 : titre en serif, les chiffres de la séance en
 * puces, et la pastille pâle qui ouvre le détail. Le premier pas de la séance
 * reste sous un filet : c'est la seule consigne à avoir en tête au départ.
 */
import type { ReactNode } from 'react'
import planJson from '../data/plan.json'
import type { Plan, Session, ZoneKey } from '../data/types'
import { formatNumber } from '../lib/dates'
import { allureUnique, estimateDuration, formatDuration, formatPace, zonePace } from '../lib/paces'
import { encreZone, styleSeance } from '../lib/seanceStyle'
import { EchelleIntensite } from './MarqueSeance'
import { Icon } from './Icon'

const plan = planJson as unknown as Plan

export function SessionHero({
  session: s,
  marathonPace,
  /** Le jour affiché, quand ce n'est pas aujourd'hui. Sert l'étiquette du haut. */
  quand = "Aujourd'hui",
  /** « 1 sur 2 » : le rang de la séance dans la journée, quand il y en a plusieurs. */
  rang,
  onClick,
}: {
  session: Session
  marathonPace: number
  quand?: string
  rang?: { n: number; total: number }
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
  const st = styleSeance(s.type)

  return (
    <Balise
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        textAlign: 'left',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        color: 'inherit',
        padding: '18px 18px 18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        // Un cran plus chaud que les autres cartes : c'est la seule séance de
        // l'écran qui appelle un geste.
        background:
          'radial-gradient(120% 100% at 0% 0%, rgba(62,122,44,.2), transparent 60%), var(--surface)',
        border: '1px solid rgba(142,242,129,.16)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <p className="etiquette" style={{ color: 'var(--sur-ink-2)' }}>
          {quand === "Aujourd'hui" ? 'séance du jour' : `séance · ${quand}`}
        </p>
        {rang && rang.total > 1 && (
          <span style={{ fontSize: 13, color: 'var(--accent)' }}>
            {rang.n} sur {rang.total}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginTop: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="display" style={{ fontSize: 30, lineHeight: 1.08, margin: 0 }}>
            {s.title}
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
              color: 'var(--accent)',
              fontSize: 14,
            }}
          >
            <span>{s.cat}</span>
            {st.intensite > 0 && <EchelleIntensite niveau={st.intensite} hauteur={11} />}
          </div>
        </div>
        {onClick && (
          <span
            aria-hidden
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--pale)',
              color: 'var(--pale-ink)',
              display: 'grid',
              placeItems: 'center',
              flex: 'none',
            }}
          >
            <Icon name="arrowUpRight" size={20} />
          </span>
        )}
      </div>

      {s.adapted && (
        <span
          className="puce"
          style={{
            marginTop: 12,
            background: 'rgba(242,207,107,.14)',
            color: 'var(--warning)',
            border: '1px solid rgba(242,207,107,.3)',
            whiteSpace: 'normal',
          }}
        >
          {s.adapted}
        </span>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
        {s.dist ? <span className="puce">{formatNumber(s.dist)} km</span> : null}
        {dureeMin > 0 ? (
          <span className="puce">
            {dureeMin === dureeMax ? formatDuration(dureeMin) : `${formatDuration(dureeMin)} à ${formatDuration(dureeMax)}`}
          </span>
        ) : null}
        {allure != null ? (
          <span className="puce">{formatPace(allure)}/km</span>
        ) : s.type === 'repos' ? (
          <span className="puce">aucune charge</span>
        ) : null}
      </div>

      {(premierSegment || premierPas || s.ex?.length) && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: SEPARATEUR }}>
          {premierSegment && (
            <Pas
              titre={`${formatNumber(premierSegment.km)} km : ${formatPace(zonePace(marathonPace, premierSegment.zone))}/km`}
              detail={detailZone(premierSegment.zone, marathonPace)}
              couleur={encreZone(premierSegment.zone)}
            />
          )}
          {!premierSegment && premierPas && (
            <Pas
              titre={typeof premierPas[0] === 'number' ? `${formatNumber(premierPas[0])} km` : String(premierPas[0])}
              detail={typeof premierPas[1] === 'string' && !(premierPas[1] in plan.zones) ? premierPas[1] : undefined}
              couleur="var(--accent-doux)"
            />
          )}
          {!premierSegment && !premierPas && s.ex?.[0] && (
            <Pas titre={s.ex[0][0]} detail={s.ex[0][1]} couleur="var(--accent-doux)" />
          )}
        </div>
      )}

      {/* Pas de mot du coach ici : il vit dans le détail de séance, à un clic,
          et l'écran Aujourd'hui en porte déjà un en bas. Trois fois la même
          voix sur un même écran, c'est deux fois de trop. */}
    </Balise>
  )
}

const SEPARATEUR = '1px solid var(--border)'

function Pas({ titre, detail, couleur }: { titre: string; detail?: ReactNode; couleur: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
      <span aria-hidden style={{ width: 3, borderRadius: 2, background: couleur, flex: 'none' }} />
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.3 }}>{titre}</div>
        {detail && (
          <div style={{ fontSize: 12.5, color: 'var(--sur-ink-3)', marginTop: 3, lineHeight: 1.4 }}>
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
