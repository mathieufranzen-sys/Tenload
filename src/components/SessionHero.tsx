/**
 * La séance du jour, en tête de l'écran Aujourd'hui.
 *
 * Refonte du 21 septembre 2026 : titre en serif, les chiffres de la séance en
 * puces, et la pastille pâle qui ouvre le détail. Le premier pas de la séance
 * reste sous un filet : c'est la seule consigne à avoir en tête au départ.
 */
import type { Session } from '../data/types'
import { formatNumber } from '../lib/dates'
import { allureUnique, estimateDuration, formatDuration, formatPace } from '../lib/paces'
import { styleSeance } from '../lib/seanceStyle'
import { EchelleIntensite } from './MarqueSeance'
import { Icon } from './Icon'

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
  // Le plan ne fixe une durée que pour le vélo et la muscu : pour une course,
  // elle se déduit de la structure et des allures courantes.
  const [dureeMin, dureeMax] = s.type === 'repos' ? [0, 0] : estimateDuration(s, marathonPace)
  // Rien si la séance change d'allure en route : voir `allureUnique`.
  const allure = allureUnique(s, marathonPace)
  const st = styleSeance(s.type)

  return (
    <Balise
      onClick={onClick}
      className="carte-bleue"
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        textAlign: 'left',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        color: 'var(--ink)',
        padding: '18px 18px 18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        // La séance à faire est un bloc bleu, la couleur secondaire des blocs
        // de page (arbitré le 22 septembre) : elle se détache des cartes
        // grises sans prendre le vert du coach.
      }}
    >
      {/* Le bouton rond dans le coin, à 12 px du haut comme du bord droit
          (retour du 22 septembre) : le titre passe dessous en entier. */}
      {onClick && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 52,
            height: 52,
            borderRadius: '50%',
            // Encre fixe : dans le bloc bleu, `--ink` vaut blanc, et une
            // flèche blanche sur néon ne se lit pas.
            background: 'var(--neon)',
            color: '#142800',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Icon name="arrowUpRight" size={20} />
        </span>
      )}

      <p className="etiquette" style={{ color: 'var(--sur-ink-2)', paddingRight: onClick ? 64 : 0 }}>
        {quand === "Aujourd'hui" ? 'Séance du jour' : `Séance · ${quand}`}
        {rang && rang.total > 1 && ` · ${rang.n} sur ${rang.total}`}
      </p>

      <h2 className="display" style={{ fontSize: 'var(--fs-t-page)', lineHeight: 1.08, margin: '8px 0 0', paddingRight: onClick ? 64 : 0 }}>
        {s.title}
      </h2>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 6,
          color: 'var(--accent)',
          fontSize: 'var(--fs-meta)',
        }}
      >
        {/* La catégorie seule : l'intensité rejoint la ligne de repères,
            comme sur les cartes de séance. */}
        <span>{s.cat}</span>
      </div>

      {s.adapted && (
        <div style={{ marginTop: 12 }}>
          <span className="tag-adapte">{s.adapted}</span>
        </div>
      )}

      {/* Les mêmes repères que les cartes en dessous, dans le même ordre et
          au même niveau : distance, durée, allure (retour du 22 septembre).
          Le premier pas de la séance a quitté cet écran, le détail est à un
          geste. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 7,
          marginTop: 12,
          color: 'var(--sur-ink-2)',
          fontSize: 'var(--fs-detail)',
          fontWeight: 500,
        }}
      >
        <span>
          {[
            s.dist ? `${formatNumber(s.dist)} km` : null,
            dureeMin > 0
              ? dureeMin === dureeMax
                ? formatDuration(dureeMin)
                : `${formatDuration(dureeMin)} à ${formatDuration(dureeMax)}`
              : null,
            allure != null ? `${formatPace(allure)}/km` : s.type === 'repos' ? 'Aucune charge' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {st.intensite > 0 && <EchelleIntensite niveau={st.intensite} hauteur={11} />}
      </div>

      {/* Pas de mot du coach ici : il vit dans le détail de séance, à un clic,
          et l'écran Aujourd'hui en porte déjà un en bas. Trois fois la même
          voix sur un même écran, c'est deux fois de trop. */}
    </Balise>
  )
}
