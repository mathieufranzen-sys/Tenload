/**
 * Le dégradé de fond de l'écran Aujourd'hui.
 *
 * Sept masses colorées floutées, tirées du camaïeu de la bande courante — les
 * six teintes vivent dans tokens.css sous `[data-band=…]`, pas ici : c'est le
 * design system qui porte la couleur, ce composant ne porte que les formes.
 */
import type { BandKey } from '../lib/tendonIndex'

export function MeshBackground({ band }: { band: BandKey }) {
  return (
    <div
      data-band={band}
      aria-hidden
      style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'var(--m6)' }}
    >
      <div className="mesh">
        <i className="s1" />
        <i className="s2" />
        <i className="s3" />
        <i className="s4" />
        <i className="s5" />
        <i className="s6" />
        <i className="s7" />
      </div>
      <div className="mesh-veil" />
    </div>
  )
}
