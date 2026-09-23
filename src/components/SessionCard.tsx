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
import { EchelleIntensite } from './MarqueSeance'
import { styleSeance } from '../lib/seanceStyle'

interface Props {
  session: Session
  marathonPace: number
  /** Ressenti déjà enregistré. */
  feedback?: { pain: number; rpe: number } | null
  onClick?: () => void
  /**
   * Version de la vue semaine du Programme : la carte vit à côté de la
   * pastille du jour, dans une colonne plus étroite. Ni icône ni chevron, la
   * distance passe à droite du titre, comme dans la maquette.
   */
  compact?: boolean
  /**
   * Vue semaine seulement. `aFaire` : la séance du jour pas encore notée,
   * traitée comme la séance du jour de l'écran Aujourd'hui (fond blanc,
   * filet fort). `passe` : un jour révolu, grisé.
   */
  etat?: 'aFaire' | 'passe'
}

export function SessionCard({ session: s, marathonPace, feedback, onClick, compact = false, etat }: Props) {
  if (compact)
    return <CarteCompacte session={s} marathonPace={marathonPace} feedback={feedback} onClick={onClick} etat={etat} />
  const [lo, hi] = estimateDuration(s, marathonPace)
  const duration = lo === hi ? formatDuration(lo) : `${formatDuration(lo)} à ${formatDuration(hi)}`
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
        // Une séance notée passe en vert très clair (retour du 23 septembre) :
        // elle est derrière toi, elle ne doit plus peser autant qu'une carte
        // qui attend quelque chose. Une séance sautée, elle, s'efface : il n'y
        // a rien à en retirer.
        background: feedback ? 'color-mix(in srgb, var(--neon) 14%, var(--bg))' : undefined,
        borderColor: feedback ? 'color-mix(in srgb, var(--neon-2) 35%, transparent)' : undefined,
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
      {/* Une séance notée garde sa coche : c'est ce qu'on cherche en
          balayant la journée. Les autres n'ont plus d'icône de discipline
          (retour du 22 septembre) : le titre la dit déjà. */}
      {feedback && (
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
            background: 'color-mix(in srgb, var(--neon) 22%, transparent)',
            color: 'var(--good)',
          }}
        >
          <Icon name="check" size={20} />
        </span>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          className="display"
          style={{
            margin: '0 0 4px',
            fontSize: 'var(--fs-t-liste)',
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
        {/* Les repères sur une ligne, en texte : distance, durée, intensité.
            La pilule a été essayée puis retirée le 23 septembre, le reste de
            l'app écrit ses chiffres en texte. */}
        {s.type !== 'repos' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              color: 'var(--sur-ink-2)',
              fontSize: 'var(--fs-detail)',
              fontWeight: 500,
            }}
          >
            <span>{[volume, duration].filter(Boolean).join(' · ')}</span>
            {st.intensite > 0 && <EchelleIntensite niveau={st.intensite} hauteur={11} />}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
          {s.ecart && <span className="tag-ecart">{s.ecart}</span>}
          {s.adapted && <span className="tag-adapte">{s.adapted}</span>}
        </div>

        {feedback && (
          <div style={{ marginTop: 9, color: 'var(--good)', fontSize: 'var(--fs-detail)', fontWeight: 500 }}>
            Noté · douleur {formatNumber(feedback.pain)}/10 · effort {feedback.rpe}/10
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

function CarteCompacte({ session: s, marathonPace, feedback, onClick, etat }: Omit<Props, 'compact'>) {
  const [lo, hi] = estimateDuration(s, marathonPace)
  const duree = lo === hi ? formatDuration(lo) : `${formatDuration(lo)} à ${formatDuration(hi)}`
  const repos = s.type === 'repos'
  const st = styleSeance(s.type)

  return (
    <button
      onClick={onClick}
      className={etat === 'aFaire' && !repos ? 'carte-bleue' : undefined}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        color: 'var(--ink)',
        padding: '14px 16px',
        borderRadius: 22,
        // Le repos se dessine en pointillés : un jour vide n'est pas une
        // séance, mais il se déplace et se remplace comme elle.
        border: repos
          ? '1.5px dashed var(--border-2)'
          : etat === 'aFaire'
            ? 'none'
            : '1px solid var(--glass-border)',
        background: repos ? 'transparent' : etat === 'aFaire' ? '#4f63f2' : 'var(--surface)',
        opacity: s.saute ? 0.45 : etat === 'passe' ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <span
          className={repos ? undefined : 'display'}
          style={{
            fontSize: repos ? 'var(--fs-body)' : 'var(--fs-t-liste)',
            lineHeight: 1.2,
            color: repos ? 'var(--sur-ink-3)' : 'var(--ink)',
            textDecoration: s.saute ? 'line-through' : undefined,
          }}
        >
          {s.title}
        </span>
        {feedback ? (
          <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--good)', flex: 'none' }}>Noté</span>
        ) : s.dist ? (
          <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--accent)', flex: 'none' }}>{formatNumber(s.dist)} km</span>
        ) : null}
      </div>
      {!repos && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 4,
            fontSize: 'var(--fs-meta)',
            color: 'var(--sur-ink-2)',
          }}
        >
          <span>{feedback ? `Douleur ${formatNumber(feedback.pain)} · effort ${feedback.rpe}` : duree}</span>
          {st.intensite > 0 && <EchelleIntensite niveau={st.intensite} hauteur={10} />}
        </div>
      )}
      {(s.ecart || s.adapted) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
          {s.ecart && <span className="tag-ecart">{s.ecart}</span>}
          {s.adapted && <span className="tag-adapte">{s.adapted}</span>}
        </div>
      )}
    </button>
  )
}
