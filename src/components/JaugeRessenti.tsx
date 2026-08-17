/**
 * Curseur de ressenti en barre pleine, épaisse : le chiffre à gauche, le mot
 * à droite, tous deux DANS la barre. Le remplissage lui-même est la valeur,
 * pas un repère posé dessus.
 *
 * Remplace le biseau à curseur flottant : viser un point précis sur une
 * bande fine de 27 px demandait plus de précision que ne l'autorise un
 * pouce, assis sur un banc après une sortie longue. Ici tout appui ou
 * glissé sur la largeur entière ajuste la valeur.
 *
 * Le bord droit du remplissage est arrondi en capsule, pas coupé net : c'est
 * lui qui joue le rôle du curseur, il doit se lire comme une poignée qu'on
 * déplace, pas comme une barre de progression qui s'arrête.
 *
 * L'interaction reste portée par un `input[type=range]` transparent posé
 * par-dessus : clavier, tactile et lecteurs d'écran fonctionnent sans code.
 */
import { formatNumber } from '../lib/dates'

const H = 68
/** Rayon du bord droit du remplissage : capsule prononcée, pas un simple arrondi. */
const CAP = H / 2
/** Rayon du bord gauche : celui du conteneur, pour un raccord propre à zéro. */
const RADIUS_GAUCHE = 22

/**
 * Douleur : vert au rouge, en onze teintes discrètes plutôt qu'un dégradé
 * continu — chaque valeur entière a SA couleur, pas une position sur un
 * ruban. Effort perçu reste neutre à toute valeur : un 9 sur une séance de
 * qualité est une bonne nouvelle, pas une alerte, le colorer en rouge
 * mentirait sur la lecture.
 */
const PALETTES = {
  pain: [
    '#0ca30c', '#4bb814', '#7fc41c', '#b2c420', '#e0b01f',
    '#f5951f', '#ef7c3e', '#e6624c', '#d94a4a', '#c33a3a', '#a52424',
  ],
  rpe: null,
} as const

const RPE_NEUTRE = 'rgba(255,255,255,.82)'

export function JaugeRessenti({
  label,
  valeur,
  onChange,
  disabled,
  court,
  detail,
  degrade,
  pas = 1,
}: {
  label: string
  valeur: number
  onChange: (v: number) => void
  disabled?: boolean
  /** Qualificatif court, affiché dans la barre. */
  court: string
  /** Une phrase qui explique le niveau. */
  detail: string
  degrade: keyof typeof PALETTES
  pas?: number
}) {
  const pct = Math.max(0, Math.min(100, (valeur / 10) * 100))
  const palette = PALETTES[degrade]
  const couleur = palette ? palette[Math.max(0, Math.min(10, Math.round(valeur)))] : RPE_NEUTRE

  return (
    <div style={{ margin: '4px 0 2px' }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '1.3px',
          textTransform: 'uppercase',
          color: 'var(--sur-ink-2)',
          marginBottom: 9,
        }}
      >
        {label}
      </div>

      <div
        style={{
          position: 'relative',
          height: H,
          borderRadius: RADIUS_GAUCHE,
          background: 'var(--surface-2)',
          overflow: 'hidden',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {/* Le remplissage ne descend jamais sous une largeur minimale : à
            zéro, la capsule doit encore se lire comme une poignée posée au
            bord, pas disparaître. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `max(${CAP * 2}px, ${pct}%)`,
            background: couleur,
            borderTopLeftRadius: RADIUS_GAUCHE,
            borderBottomLeftRadius: RADIUS_GAUCHE,
            borderTopRightRadius: CAP,
            borderBottomRightRadius: CAP,
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
            padding: '0 22px',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: '#fff',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-.5px',
              textShadow: '0 1px 4px rgba(0,0,0,.4)',
            }}
          >
            {formatNumber(valeur)}
          </span>
          <span
            style={{
              fontSize: 14.5,
              fontWeight: 650,
              color: '#fff',
              textShadow: '0 1px 4px rgba(0,0,0,.4)',
              textAlign: 'right',
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
          value={valeur}
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

      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          lineHeight: 1.45,
          color: 'var(--sur-ink-2)',
          margin: '10px 2px 0',
        }}
      >
        {detail}
      </p>
    </div>
  )
}
