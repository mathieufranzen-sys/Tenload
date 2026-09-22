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
        background: 'var(--surface)',
        border: '1px solid var(--border)',
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
              padding: '8px 12px',
              borderRadius: 'var(--pill)',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              // Button/Accent : le néon, texte Green-400 (retour du 22 septembre).
              background: actif ? 'var(--neon)' : 'transparent',
              color: actif ? 'var(--ink)' : 'var(--sur-ink-2)',
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
