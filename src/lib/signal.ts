/**
 * Le signal d'une carte de séance : une seule icône, celle du message le plus
 * important (arbitré par Mathieu le 26 octobre 2026, option B). Les
 * étiquettes empilées sur les cartes ne se lisaient plus, et les
 * « initialement mercredi » décrivaient son agenda, pas un risque : il
 * déplace et modifie ses séances sans cesse. Tout le détail vit dans la
 * fiche de la séance.
 *
 * Trois niveaux, du plus au moins important :
 * 1. `alerte` : la semaine réelle casse une contrainte du plan (3, 4 ou 6)
 *    sur cette séance. C'est Mathieu qui l'a créée en déplaçant, l'app ne la
 *    corrige pas : sans signal, personne ne la voit.
 * 2. `douleur` : le tendon a changé la séance (indice, raideur du lendemain
 *    de sortie longue, reprise, palier).
 * 3. `adapte` : le volume a changé la séance (plafond, remontée, volume ouvert).
 * Le reste (faite autrement, non faite, déplacée, corrigée) ne va que dans la
 * fiche.
 */
import type { MotifAdaptation, Session } from '../data/types'
import type { SeancePlanifiee } from './adapt'
import { weekdayIndex } from './dates'
import { cleEcart, verifierContraintes, type Alerte } from './overrides'

export type NiveauSignal = 'alerte' | 'douleur' | 'adapte'

const DOULEUR: MotifAdaptation[] = ['indice', 'raideur', 'palier', 'reprise', 'alternance', 'intensite']
const VOLUME: MotifAdaptation[] = ['plafond', 'progression', 'volume']

export interface Signal {
  niveau: NiveauSignal | null
  /** Les contraintes cassées par cette séance, en clair, pour la fiche. */
  alertes: string[]
}

/** Le niveau d'une séance, d'après ses alertes puis le motif de son adaptation. */
export function niveauDe(s: Session, alertes: string[]): NiveauSignal | null {
  if (s.saute) return null
  if (alertes.length) return 'alerte'
  if (s.motif && DOULEUR.includes(s.motif)) return 'douleur'
  if (s.motif && VOLUME.includes(s.motif)) return 'adapte'
  return null
}

const vise = (a: Alerte, jour: number, s: Session) =>
  Boolean(a.cibles?.some((c) => c.jour === jour && c.types.includes(s.type)))

/**
 * Les signaux des séances d'UNE semaine de calendrier, telles qu'elles
 * tombent réellement : les contraintes se vérifient sur le calendrier, pas
 * sur le plan, que Mathieu ne suit qu'une fois sur dix. Clé : l'identité de
 * la séance dans le plan (`cleEcart`).
 */
export function signauxSemaine(seances: SeancePlanifiee[]): Map<string, Signal> {
  const placees = seances.map((x) => ({ x, jour: weekdayIndex(x.day) }))
  const alertes = verifierContraintes(placees.map(({ x, jour }) => ({ ...x.s, day: jour })))
  const out = new Map<string, Signal>()
  for (const { x, jour } of placees) {
    const siennes = x.s.saute ? [] : alertes.filter((a) => vise(a, jour, x.s)).map((a) => a.texte)
    out.set(cleEcart(x.semaineOrigine, x.jourOrigine, x.slot), { niveau: niveauDe(x.s, siennes), alertes: siennes })
  }
  return out
}
