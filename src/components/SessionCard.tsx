/**
 * Carte de séance : le composant le plus vu de l'app.
 *
 * L'identité du type de séance tient dans l'icône de discipline à gauche et
 * l'échelle d'intensité qui l'accompagne, toutes deux en encre neutre. Le
 * liseré de couleur qui jouait ce rôle est parti : la couleur ne dit plus que
 * la charge du tendon. Le chevron annonce que la carte s'ouvre.
 */
import type { Session } from '../data/types'
import { formatNumber } from '../lib/dates'
import { estimateDuration, formatDuration } from '../lib/paces'
import { Icon } from './Icon'
import { EchelleIntensite, MarqueSeance } from './MarqueSeance'
import { styleSeance } from '../lib/seanceStyle'

interface Props {
  session: Session
  marathonPace: number
  /** Ressenti déjà enregistré. */
  feedback?: { pain: number; rpe: number } | null
  onClick?: () => void
}

export function SessionCard({ session: s, marathonPace, feedback, onClick }: Props) {
  const [lo, hi] = estimateDuration(s, marathonPace)
  const duration = lo === hi ? formatDuration(lo) : `${formatDuration(lo)} - ${formatDuration(hi)}`
  // La distance seulement : le repli sur `s.dur` répétait la durée à côté
  // d'elle-même, « 40 min - 45 min · 40 min ». Une séance sans distance n'en
  // a pas, et la ligne s'arrête à la durée.
  const volume = s.dist ? `${formatNumber(s.dist)} km` : null
  const st = styleSeance(s.type)

  return (
    <button
      onClick={onClick}
      className="carte"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 13,
        width: '100%',
        textAlign: 'left',
        color: 'inherit',
        borderRadius: 22,
        padding: '15px 15px',
        marginBottom: 11,
        overflow: 'hidden',
        // Une séance sautée s'efface plus qu'une séance notée : elle reste
        // lisible dans la semaine, mais elle ne réclame plus rien.
        opacity: s.saute ? 0.4 : 1,
        transition: 'transform var(--dur-fast), background var(--dur-fast)',
      }}
    >
      {/* L'icône est alignée en haut et non centrée : les cartes n'ont pas
          toutes la même hauteur (étiquettes d'écart, ressenti noté), et une
          marque centrée sautait d'une ligne à l'autre en balayant la semaine. */}
      {/* Une séance notée prend la coche verte de la maquette à la place de
          son icône : c'est ce qu'on cherche en balayant la journée. Elle
          n'est plus grisée, le vert suffit à dire qu'elle est derrière. */}
      {feedback ? (
        <span
          role="img"
          aria-label="Séance notée"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            flex: 'none',
            background: 'rgba(111,224,176,.14)',
            color: 'var(--good)',
          }}
        >
          <Icon name="check" size={20} />
        </span>
      ) : (
        <MarqueSeance type={s.type} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          className="display"
          style={{
            margin: '0 0 4px',
            fontSize: 20,
            lineHeight: 1.18,
          }}
        >
          <span style={s.saute ? { textDecoration: 'line-through' } : undefined}>{s.title}</span>
        </h3>
        {/* Les deux chiffres de la séance sur la même ligne, juste sous le
            titre. La date n'y est plus : ces cartes s'affichent toujours dans
            un contexte qui la porte déjà — le jour consulté sur Aujourd'hui,
            l'en-tête du jour sur Programme — et elle occupait la place des
            deux seuls chiffres qui décident de la séance. */}
        {s.type !== 'repos' && (
          <div style={{ color: 'var(--sur-ink-2)', fontSize: 13, fontWeight: 500 }}>
            {[duration, volume].filter(Boolean).join(' · ')}
          </div>
        )}

        {/* Les étiquettes d'écart tiennent sur la même ligne que l'intensité :
            elles qualifient la même séance, les empiler sur deux rangs donnait
            à lire deux informations de nature différente. */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
          {/* Le nom de la séance était déjà le titre, juste au-dessus. Le tag
              porte donc ce qui n'est écrit nulle part ailleurs : l'effort. */}
          {st.intensite > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px',
                borderRadius: 'var(--pill)',
                background: 'var(--surface-3)',
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              Intensité
              <EchelleIntensite niveau={st.intensite} hauteur={11} />
            </span>
          )}
          {/* Pêche pour une décision de Mathieu, jaune pour le moteur
              d'adaptation : la couleur dit d'où vient le changement. */}
          {s.ecart && <Etiquette teinte="255,220,194" encre="var(--pale)">{s.ecart}</Etiquette>}
          {s.adapted && <Etiquette teinte="242,207,107" encre="var(--warning)">{s.adapted}</Etiquette>}
        </div>

        {feedback && (
          <div style={{ marginTop: 9, color: 'var(--good)', fontSize: 13, fontWeight: 500 }}>
            noté · douleur {formatNumber(feedback.pain)}/10 · effort {feedback.rpe}/10
          </div>
        )}
      </div>

      {onClick && (
        <Icon
          name="chevronRight"
          size={19}
          style={{ color: 'var(--sur-ink-3)', flex: 'none', strokeWidth: 1.7, marginTop: 13 }}
        />
      )}
    </button>
  )
}

function Etiquette({
  teinte,
  encre,
  children,
}: {
  teinte: string
  encre: string
  children: string
}) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 500,
        padding: '4px 10px',
        borderRadius: 'var(--pill)',
        background: `rgba(${teinte},.18)`,
        color: encre,
        border: `1px solid rgba(${teinte},.26)`,
      }}
    >
      {children}
    </span>
  )
}
