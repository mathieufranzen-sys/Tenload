/**
 * Le fond des écrans : la lueur « braise » (global.css).
 *
 * Il portait le camaïeu de la bande du jour. La refonte du 21 septembre 2026
 * pose tout sur le même fond chaud : la charge du tendon se lit dans la
 * jauge, et un écran entier qui change de couleur disait la même chose en
 * plus fort, jusqu'à se faire oublier. `band` reste dans la signature pour
 * que les écrans n'aient pas à changer ; `formes=false` donne la lueur calme
 * des écrans de lecture.
 */
import type { BandKey } from '../lib/tendonIndex'

export function MeshBackground({
  formes = true,
}: {
  band?: BandKey
  formes?: boolean
  disposition?: 'hero' | 'bords'
}) {
  return <div aria-hidden className={formes ? 'braise' : 'braise braise--calme'} />
}
