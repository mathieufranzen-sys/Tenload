/**
 * Bascule en pilule, reprise des références : deux ou trois vues d'un même
 * graphique, jamais des réglages. Le libellé actif est plein, les autres
 * transparents — pas de bordure, la pastille suffit.
 */
export function Segmented<T extends string>({
  options,
  valeur,
  onChange,
  label,
}: {
  options: Array<{ cle: T; libelle: string }>
  valeur: T
  onChange: (v: T) => void
  /** Décrit le rôle du groupe pour les lecteurs d'écran. */
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: 'flex',
        background: 'rgba(255,255,255,.07)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 'var(--pill)',
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((o) => {
        const actif = o.cle === valeur
        return (
          <button
            key={o.cle}
            type="button"
            aria-pressed={actif}
            onClick={() => onChange(o.cle)}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 'var(--pill)',
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: actif ? 'rgba(255,255,255,.92)' : 'transparent',
              color: actif ? '#0b0c0e' : 'var(--sur-ink-2)',
              cursor: 'pointer',
              transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast)',
            }}
          >
            {o.libelle}
          </button>
        )
      })}
    </div>
  )
}
