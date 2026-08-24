/**
 * Le dégradé de fond de l'écran Aujourd'hui.
 *
 * Sept masses colorées floutées, tirées du camaïeu de la bande courante — les
 * six teintes vivent dans tokens.css sous `[data-band=…]`, pas ici : c'est le
 * design system qui porte la couleur, ce composant ne porte que les formes.
 */
import type { BandKey } from '../lib/tendonIndex'

/**
 * `formes=false` garde le camaïeu et le voile de lisibilité, sans les masses
 * floutées : pour un écran de lecture (Allures) plutôt qu'un écran hero.
 *
 * `disposition="bords"` garde les masses mais les rabat contre les bords et
 * le haut de page. Sur Aujourd'hui la composition est le sujet, on la voit ;
 * sur Suivi elle passe derrière quatre graphiques, et une masse en plein
 * milieu de l'écran se lisait comme une donnée de plus.
 */
export function MeshBackground({
  band,
  formes = true,
  disposition = 'hero',
}: {
  band: BandKey
  formes?: boolean
  disposition?: 'hero' | 'bords'
}) {
  return (
    <div
      data-band={band}
      aria-hidden
      style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'var(--m6)' }}
    >
      {formes && (
        <div className={disposition === 'bords' ? 'mesh mesh--bords' : 'mesh'}>
          <i className="s1" />
          <i className="s2" />
          <i className="s3" />
          <i className="s4" />
          <i className="s5" />
          <i className="s6" />
          <i className="s7" />
        </div>
      )}
      <div className="mesh-veil" />
    </div>
  )
}
