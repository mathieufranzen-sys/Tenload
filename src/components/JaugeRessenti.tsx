/**
 * Curseur de ressenti : la barre pleine de `BarreRessenti`, rendue réglable.
 *
 * Remplace le biseau à curseur flottant : viser un point précis sur une bande
 * fine demandait plus de précision que ne l'autorise un pouce, assis sur un
 * banc après une sortie longue. Ici tout appui ou glissé sur la largeur
 * entière ajuste la valeur.
 *
 * L'interaction est portée par un `input[type=range]` transparent posé
 * par-dessus : clavier, tactile et lecteurs d'écran fonctionnent sans code.
 */
import { BarreRessenti, LabelRessenti, type TeinteRessenti } from './BarreRessenti'

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
  teinte: TeinteRessenti
  pas?: number
}) {
  return (
    <div style={{ margin: '2px 0' }}>
      <LabelRessenti>{label}</LabelRessenti>

      <div style={{ position: 'relative' }}>
        <BarreRessenti valeur={valeur} court={court} teinte={teinte} attenuee={disabled} />
        <input
          type="range"
          min={0}
          max={10}
          step={pas}
          value={valeur ?? 0}
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
        // Deux lignes réservées, la longueur maximale de ces textes. Sans
        // hauteur plancher, passer de « Rien du tout. » à une phrase de deux
        // lignes rallongeait le bloc en cours de glissement et faisait sauter
        // tout ce qui suit sous le pouce.
        <p
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            lineHeight: 1.4,
            color: 'var(--sur-ink-2)',
            margin: '8px 2px 0',
            minHeight: 36,
          }}
        >
          {detail}
        </p>
      )}
    </div>
  )
}
