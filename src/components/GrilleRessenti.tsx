/**
 * La saisie du ressenti de séance en pastilles, de 0 à 10.
 *
 * Reprise de l'écran « Noter la douleur » de la maquette. Onze cibles d'un
 * pouce plutôt qu'un curseur : après une sortie longue, on vise une pastille
 * plus sûrement qu'une position sur une barre, et chaque valeur a sa couleur
 * avant même d'être lue. La valeur choisie se relit dessous, avec son mot et
 * sa phrase.
 *
 * La pastille « je ne sais pas » de la maquette n'est pas reprise : le
 * ressenti d'une séance est enregistré en entier ou pas du tout, et une
 * douleur inconnue se dit en ne notant pas la séance, ce que l'indice sait
 * déjà lire (`chargeInconnue`).
 */
import { COULEUR_DOULEUR, rangRessenti } from '../lib/ressenti'
import { formatNumber } from '../lib/dates'

/** L'effort n'est pas un signal d'alarme : un camaïeu chaud qui monte, sans rouge. */
const COULEUR_EFFORT = Array.from({ length: 11 }, (_, i) => {
  const t = i / 10
  const de = [58, 40, 30]
  const a = [255, 196, 150]
  return `rgb(${de.map((v, k) => Math.round(v + (a[k] - v) * t)).join(',')})`
})

function sombre(couleur: string): boolean {
  const hex = couleur.match(/^#([0-9a-f]{6})$/i)
  const rgb = couleur.match(/^rgb\((\d+),(\d+),(\d+)\)$/)
  const [r, v, b] = hex
    ? [0, 8, 16].map((d) => (parseInt(hex[1], 16) >> (16 - d)) & 255)
    : rgb
      ? rgb.slice(1).map(Number)
      : [0, 0, 0]
  return (0.299 * r + 0.587 * v + 0.114 * b) / 255 < 0.55
}

export function GrilleRessenti({
  label,
  valeur,
  onChange,
  teinte,
  mots,
  details,
  disabled,
}: {
  label: string
  valeur: number | null
  onChange: (v: number) => void
  teinte: 'douleur' | 'neutre'
  mots: string[]
  details: string[]
  disabled?: boolean
}) {
  const couleurs = teinte === 'douleur' ? COULEUR_DOULEUR : COULEUR_EFFORT

  return (
    <div>
      <p className="display" style={{ margin: '0 0 14px', fontSize: 22, lineHeight: 1.25 }}>
        {label}
      </p>
      <div role="radiogroup" aria-label={label} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {couleurs.map((c, v) => {
          const choisi = valeur === v
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={choisi}
              aria-label={`${v} sur 10, ${mots[v].toLowerCase()}`}
              disabled={disabled}
              onClick={() => onChange(v)}
              className="chiffre"
              style={{
                aspectRatio: '1',
                borderRadius: '50%',
                background: c,
                color: sombre(c) ? '#fbf1e8' : '#1a0d06',
                fontSize: 26,
                opacity: valeur != null && !choisi ? 0.55 : 1,
                boxShadow: choisi ? '0 0 0 3px var(--bg), 0 0 0 5px var(--pale)' : undefined,
                transform: choisi ? 'scale(1.04)' : undefined,
                transition: 'opacity var(--dur-fast), transform var(--dur-fast)',
              }}
            >
              {v}
            </button>
          )
        })}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginTop: 14,
          padding: '14px 20px',
          borderRadius: 24,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          minHeight: 70,
        }}
      >
        <span className="chiffre" style={{ fontSize: 34, lineHeight: 1, color: valeur == null ? 'var(--ink-3)' : 'var(--ink)' }}>
          {valeur == null ? '–' : formatNumber(valeur)}
        </span>
        <span style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--sur-ink-2)' }}>
          {valeur == null ? (
            'Rien n’est pré-rempli : touche la pastille qui correspond.'
          ) : (
            <>
              {/* Un ressenti ancien peut porter une demi-valeur, saisie au
                  curseur : le mot est celui du cran le plus proche. */}
              <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{mots[rangRessenti(valeur)].toLowerCase()}</b>.{' '}
              {details[rangRessenti(valeur)]}
            </>
          )}
        </span>
      </div>
    </div>
  )
}
