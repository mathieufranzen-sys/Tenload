/**
 * Le voile collant en haut d'une page qui défile.
 *
 * Les écrans en ont un depuis la refonte, les pages qui s'ouvrent par-dessus
 * (feuille de séance, sous-pages) n'en avaient pas : le contenu remontait
 * jusque sous l'horloge et la Dynamic Island, et un titre à moitié caché par
 * l'heure est pire qu'un titre absent.
 *
 * Deux détails comptent autant que le flou lui-même :
 *
 * - le voile occupe la ZONE SÛRE (`env(safe-area-inset-top)`), sinon il n'y a
 *   rien sous l'horloge et le flou commence trop bas ;
 * - il s'arrête en FONDU et non sur une ligne droite : un `backdrop-filter`
 *   coupé net dessine une arête au milieu de l'écran.
 *
 * Les écrans ont chacun gardé sa propre recette, aux valeurs près ; c'est
 * cette fonction qui fait foi pour tout ce qui s'écrit à partir d'ici.
 */
import type { CSSProperties } from 'react'

/** Hauteur du fondu sous le voile, en pixels. */
export const FONDU_COLLANT = 16

export function styleCollant(fondu = FONDU_COLLANT): CSSProperties {
  const masque = `linear-gradient(180deg, #000 0, #000 calc(100% - ${fondu}px), transparent 100%)`
  return {
    position: 'sticky',
    top: 0,
    zIndex: 5,
    paddingTop: 'calc(14px + env(safe-area-inset-top))',
    paddingLeft: 'var(--page-x)',
    paddingRight: 'var(--page-x)',
    paddingBottom: fondu,
    // Presque opaque : le flou seul ne suffit pas en mode clair, une carte
    // vert profond qui passe dessous rendait le titre illisible.
    background: 'color-mix(in srgb, var(--bg) 88%, transparent)',
    backdropFilter: 'blur(18px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
    maskImage: masque,
    WebkitMaskImage: masque,
  }
}
