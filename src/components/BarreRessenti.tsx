/**
 * La barre pleine du ressenti : le chiffre à gauche, le mot à droite, tous
 * deux DANS la barre, dont le remplissage EST la valeur.
 *
 * Purement visuelle et sans interaction : elle sert aussi bien au curseur de
 * saisie (`JaugeRessenti`, qui pose un `input[type=range]` par-dessus) qu'au
 * rappel d'un ressenti déjà enregistré (`RessentiJauges`). Les deux doivent
 * être le même objet, l'un actif et l'autre au repos — deux dessins
 * différents pour la même donnée laissaient croire à deux choses différentes.
 */
import { formatNumber } from '../lib/dates'
import { COULEUR_DOULEUR, rangRessenti } from '../lib/ressenti'

/**
 * Hauteur de la barre. Le rapport visé est celui d'une ligne de réglage iOS,
 * autour de 0,12 sur la largeur utile : plus haute, deux barres mangeaient un
 * demi-écran.
 */
export const H_BARRE = 36
/** Même rayon partout, remplissage compris. */
const RAYON = 11
/** Retrait horizontal du chiffre et du mot. */
const RETRAIT = 13
/** Largeur plancher du remplissage : le chiffre doit tenir dedans à zéro. */
const LARGEUR_MIN = 46

/**
 * Largeur CSS du remplissage pour une valeur de 0 à 10.
 *
 * Le plancher de 46 px était appliqué APRÈS un calcul linéaire de 0 à 100 %,
 * avec `max()`. Sur une barre de 305 px, 0 et 1 tombaient donc tous les deux
 * à 46 px et 2 à 61 px : les trois premiers crans étaient écrasés, alors que
 * c'est exactement la zone où vit la douleur de Mathieu au quotidien (0,8 au
 * réveil, 1,3 le soir). L'échelle part maintenant DU plancher au lieu de s'y
 * heurter : chaque cran vaut le même écart, plancher compris.
 */
export function largeurRemplissage(valeur: number): string {
  const part = Math.max(0, Math.min(10, valeur)) / 10
  return `calc(${LARGEUR_MIN}px + ${part} * (100% - ${LARGEUR_MIN}px))`
}

/** Teinte neutre de l'effort perçu : un 9 sur une séance de qualité est une réussite. */
const NEUTRE = '#d4d4d8'

export type TeinteRessenti = 'douleur' | 'neutre'

/** Luminance perçue : au-delà du seuil, il faut de l'encre sombre par-dessus. */
function clair(couleur: string): boolean {
  const m = couleur.match(/^#([0-9a-f]{6})$/i)
  if (!m) return false
  const n = parseInt(m[1], 16)
  const [r, v, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r + 0.587 * v + 0.114 * b) / 255 > 0.6
}

export function BarreRessenti({
  valeur,
  court,
  teinte,
  hauteur = H_BARRE,
  attenuee,
}: {
  /** `null` = pas encore saisi : la barre reste vide et le dit. */
  valeur: number | null
  /** Qualificatif court, affiché à droite dans la barre. */
  court: string
  teinte: TeinteRessenti
  hauteur?: number
  /** Rend la barre inerte visuellement, sans la vider. */
  attenuee?: boolean
}) {
  const saisi = valeur != null
  const affiche = valeur ?? 0
  const pct = Math.max(0, Math.min(100, (affiche / 10) * 100))
  const hex = !saisi
    ? null
    : teinte === 'douleur'
      ? COULEUR_DOULEUR[rangRessenti(affiche)]
      : NEUTRE
  // Le chiffre repose toujours sur le remplissage : son encre suit donc la
  // luminance de la teinte. Un chiffre blanc sur l'ambre du milieu d'échelle
  // ne se lit pas, et c'est justement la zone où le plan commence à s'adapter.
  const encre = hex && clair(hex) ? '#0b0c0e' : '#fff'

  return (
    <div
      style={{
        position: 'relative',
        height: hauteur,
        borderRadius: RAYON,
        background: 'var(--surface-2)',
        overflow: 'hidden',
        opacity: attenuee ? 0.6 : 1,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: largeurRemplissage(affiche),
          background: hex ?? 'rgba(255,255,255,.16)',
          borderRadius: RAYON,
          transition: 'background var(--dur-fast), width var(--dur-fast)',
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
            // course : ailleurs il reste sur le fond sombre. Aux valeurs
            // hautes il se retrouve à cheval sur la frontière, d'où le halo —
            // c'est le seul endroit de la barre où le texte n'a pas un fond
            // unique sous lui.
            color: pct > 88 ? encre : '#fff',
            textShadow:
              pct > 78 && pct < 100
                ? `0 0 4px ${encre === '#fff' ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.55)'}`
                : undefined,
            textAlign: 'right',
            opacity: saisi ? 1 : 0.55,
          }}
        >
          {court}
        </span>
      </div>
    </div>
  )
}

/** Le micro-label en capitales qui coiffe une barre. */
export function LabelRessenti({ children }: { children: string }) {
  return (
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
      {children}
    </div>
  )
}
