/**
 * Curseur de ressenti en biseau, repris des fiches d'effort perçu de la
 * référence : le nombre en très grand, un qualificatif court, une phrase qui
 * dit ce que ça veut dire, puis une bande qui s'élargit vers la droite.
 *
 * L'élargissement n'est pas décoratif : il traduit le fait que l'échelle est
 * de moins en moins fine à mesure qu'on monte. La différence entre 1 et 2 est
 * subtile, celle entre 8 et 9 ne l'est pas.
 *
 * L'interaction reste portée par un `input[type=range]` transparent posé
 * par-dessus : clavier, tactile et lecteurs d'écran fonctionnent sans code.
 */
import { formatNumber } from '../lib/dates'

const DEGRADES = {
  pain: 'linear-gradient(90deg,#12b312 0%,#8fc41a 22%,#fab219 45%,#ec835a 68%,#d03b3b 100%)',
  rpe: 'linear-gradient(90deg,#2dd4bf 0%,#4ade80 24%,#fde047 50%,#fb923c 74%,#a855f7 100%)',
} as const

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
  /** Qualificatif court, affiché en gras sous le nombre. */
  court: string
  /** Une phrase qui explique le niveau. */
  detail: string
  degrade: keyof typeof DEGRADES
  pas?: number
}) {
  const pct = Math.max(0, Math.min(100, (valeur / 10) * 100))

  return (
    <div style={{ margin: '4px 0 2px' }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '1.3px',
          textTransform: 'uppercase',
          color: 'var(--sur-ink-2)',
          textAlign: 'center',
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 68,
          fontWeight: 300,
          letterSpacing: '-3px',
          lineHeight: 1,
          textAlign: 'center',
          marginTop: 8,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatNumber(valeur)}
      </div>

      <div style={{ fontSize: 17, fontWeight: 650, letterSpacing: '-.3px', textAlign: 'center', marginTop: 8 }}>
        {court}
      </div>
      <p
        style={{
          fontSize: 13.5,
          fontWeight: 500,
          lineHeight: 1.45,
          color: 'var(--sur-ink-2)',
          textAlign: 'center',
          margin: '5px auto 0',
          maxWidth: '30ch',
          minHeight: 38,
        }}
      >
        {detail}
      </p>

      <div style={{ position: 'relative', height: 44, marginTop: 14 }}>
        {/* La bande s'élargit vers la droite : un ruban en dégradé, découpé. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 9,
            height: 26,
            background: DEGRADES[degrade],
            clipPath: 'polygon(0% 40%, 100% 0%, 100% 100%, 0% 60%)',
            opacity: disabled ? 0.45 : 1,
          }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 11,
            left: `calc(${pct}% - 11px)`,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 2px 10px rgba(0,0,0,.55)',
            pointerEvents: 'none',
          }}
        />
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

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: 'var(--sur-ink-3)',
          fontSize: 11,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {[0, 2, 4, 6, 8, 10].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  )
}
