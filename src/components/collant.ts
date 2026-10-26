/**
 * Le bandeau collant en haut d'une page qui défile, le même partout.
 *
 * Un BLOC PLEIN, à bord net, comme l'en-tête du Programme : arbitré par
 * Mathieu le 26 octobre 2026, à la place du flou qui s'effaçait en dégradé.
 * Le dégradé laissait le contenu se lire à travers le bas du titre ; le bloc
 * dit clairement où s'arrête l'en-tête.
 *
 * Il occupe la ZONE SÛRE (`env(safe-area-inset-top)`) : sans ça, le contenu
 * qui défile remonte jusque sous l'horloge et la Dynamic Island.
 */
import type { CSSProperties } from 'react'

/** Le fond du bandeau : celui de la page, presque opaque, avec un léger flou. */
export const FOND_BANDEAU: CSSProperties = {
  background: 'color-mix(in srgb, var(--bg) 86%, transparent)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
}

/** Le retrait sous le contenu du bandeau, avant son bord. */
export const BAS_BANDEAU = 12

export function styleCollant(): CSSProperties {
  return {
    position: 'sticky',
    top: 0,
    zIndex: 5,
    paddingTop: 'calc(14px + env(safe-area-inset-top))',
    paddingLeft: 'var(--page-x)',
    paddingRight: 'var(--page-x)',
    paddingBottom: BAS_BANDEAU,
    ...FOND_BANDEAU,
  }
}
