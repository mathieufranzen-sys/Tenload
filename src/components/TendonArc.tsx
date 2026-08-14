/**
 * L'indice de charge en arc fin.
 *
 * Remplace l'anneau épais de `TendonGauge` sur l'écran Aujourd'hui : un trait
 * de 2,5 px sur un demi-cercle ouvert, avec un point à la position courante.
 *
 * Le tracé reste sombre quelle que soit la bande : c'est le dégradé de fond
 * qui porte la gravité. Un arc qui changerait aussi de couleur dirait deux
 * fois la même chose, et brouillerait la lecture du niveau — la longueur du
 * trait est l'information, pas sa teinte.
 */

const W = 270
const H = 158
const CX = 135
const CY = 148
const R = 115
/** Longueur du demi-cercle, pour le `stroke-dasharray`. */
const ARC = Math.PI * R
/** Encre du tracé, la même sur les cinq bandes. */
const TRACE = 'rgba(8,9,11,.82)'

export function TendonArc({ value }: { value: number }) {
  const part = Math.max(0, Math.min(100, value)) / 100
  // 180° à gauche, 0° à droite : l'indice progresse dans le sens horaire.
  const angle = ((180 - 180 * part) * Math.PI) / 180
  const px = CX + R * Math.cos(angle)
  const py = CY - R * Math.sin(angle)

  return (
    <div style={{ position: 'relative', width: W, maxWidth: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Indice de charge du tendon : ${value} sur 100`}>
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="rgba(255,255,255,.22)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke={TRACE}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={ARC}
          strokeDashoffset={ARC * (1 - part)}
        />
        <circle cx={px} cy={py} r={4.5} fill={TRACE} stroke="rgba(255,255,255,.55)" strokeWidth={2} />
      </svg>
      <div
        style={{
          position: 'absolute',
          insetInline: 4,
          bottom: -2,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--sur-ink-3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  )
}
