/**
 * Curseur de ressenti en barre pleine : le chiffre à gauche, le mot à droite,
 * tous deux DANS la barre. Le remplissage lui-même est la valeur, pas un
 * repère posé dessus.
 *
 * Remplace le biseau à curseur flottant : viser un point précis sur une bande
 * fine demandait plus de précision que ne l'autorise un pouce, assis sur un
 * banc après une sortie longue. Ici tout appui ou glissé sur la largeur
 * entière ajuste la valeur.
 *
 * Le bord droit du remplissage porte le MÊME rayon que la barre, pas une
 * capsule : à 68 px de haut et en demi-cercle, il se lisait comme une pastille
 * posée sur la barre plutôt que comme son remplissage.
 *
 * L'interaction reste portée par un `input[type=range]` transparent posé
 * par-dessus : clavier, tactile et lecteurs d'écran fonctionnent sans code.
 */
import { formatNumber } from '../lib/dates'
import { rangRessenti } from '../lib/ressenti'

/**
 * Hauteur de la barre. Descendue de 68 à 36 px : à 68, sur une largeur utile
 * d'environ 300 px, la jauge occupait presque un quart de sa propre largeur et
 * les deux ensemble mangeaient un demi-écran. Le rapport visé est celui d'une
 * ligne de réglage iOS, autour de 0,12.
 */
const H = 36
/** Même rayon partout, remplissage compris. */
const RAYON = 11
/** Retrait horizontal du chiffre et du mot. */
const RETRAIT = 13
/** Largeur plancher du remplissage : le chiffre doit tenir dedans à zéro. */
const LARGEUR_MIN = 46

/**
 * Douleur : vert au rouge, en onze teintes discrètes plutôt qu'un dégradé
 * continu — chaque valeur entière a SA couleur, pas une position sur un ruban.
 * Le neutre sert à l'effort perçu et à la raideur du carnet : un 9 sur une
 * séance de qualité est une bonne nouvelle, pas une alerte.
 */
const PALETTES = {
  pain: [
    '#0ca30c', '#4bb814', '#7fc41c', '#b2c420', '#e0b01f',
    '#f5951f', '#ef7c3e', '#e6624c', '#d94a4a', '#c33a3a', '#a52424',
  ],
  neutre: null,
} as const

const NEUTRE = '#d4d4d8'

/** Luminance perçue : au-delà du seuil, il faut de l'encre sombre par-dessus. */
function clair(couleur: string): boolean {
  const m = couleur.match(/^#([0-9a-f]{6})$/i)
  if (!m) return false
  const n = parseInt(m[1], 16)
  const [r, v, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r + 0.587 * v + 0.114 * b) / 255 > 0.6
}

export function JaugeRessenti({
  label,
  valeur,
  onChange,
  disabled,
  court,
  detail,
  teinte,
  pas = 1,
}: {
  label: string
  /** `null` = pas encore saisi : la barre reste vide et le dit. */
  valeur: number | null
  onChange: (v: number) => void
  disabled?: boolean
  /** Qualificatif court, affiché à droite dans la barre. */
  court: string
  /** Une phrase qui explique le niveau. Omise, rien ne s'affiche dessous. */
  detail?: string
  teinte: keyof typeof PALETTES
  pas?: number
}) {
  const saisi = valeur != null
  const affiche = valeur ?? 0
  const pct = Math.max(0, Math.min(100, (affiche / 10) * 100))
  const palette = PALETTES[teinte]
  const hex = !saisi ? null : palette ? palette[rangRessenti(affiche)] : NEUTRE
  const couleur = hex ?? 'rgba(255,255,255,.16)'
  // Le chiffre repose toujours sur le remplissage : son encre suit donc la
  // luminance de la teinte. Un chiffre blanc sur l'ambre du milieu d'échelle
  // (#e0b01f, #b2c420) ne se lit pas, et c'est justement la zone où le plan
  // commence à s'adapter.
  const encre = hex && clair(hex) ? '#0b0c0e' : '#fff'

  return (
    <div style={{ margin: '2px 0' }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '1.3px',
          textTransform: 'uppercase',
          color: 'var(--sur-ink-2)',
          marginBottom: 7,
        }}
      >
        {label}
      </div>

      <div
        style={{
          position: 'relative',
          height: H,
          borderRadius: RAYON,
          background: 'var(--surface-2)',
          overflow: 'hidden',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            // Assez large pour contenir le chiffre même à zéro : plus étroit,
            // le remplissage coupait le nombre en deux au lieu de le porter.
            width: `max(${LARGEUR_MIN}px, ${pct}%)`,
            background: couleur,
            borderRadius: RAYON,
            transition: 'background var(--dur-fast)',
          }}
        />

        <div
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `0 ${RETRAIT}px`,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: 16.5,
              fontWeight: 700,
              color: encre,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-.3px',
              opacity: saisi ? 1 : 0.45,
            }}
          >
            {formatNumber(affiche)}
          </span>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              // Le mot n'est rejoint par le remplissage qu'en toute fin de
              // course : ailleurs il reste sur le fond sombre.
              color: pct > 88 ? encre : '#fff',
              textAlign: 'right',
              opacity: saisi ? 1 : 0.55,
            }}
          >
            {court}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={10}
          step={pas}
          value={affiche}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            margin: 0,
            cursor: disabled ? 'default' : 'pointer',
          }}
        />
      </div>

      {detail && (
        <p
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            lineHeight: 1.4,
            color: 'var(--sur-ink-2)',
            margin: '8px 2px 0',
          }}
        >
          {detail}
        </p>
      )}
    </div>
  )
}
