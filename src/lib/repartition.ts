/**
 * Répartition d'une séance par zone d'allure.
 *
 * Reprend l'analyse des étapes de `estimateDuration` (paces.ts) mais renvoie
 * le détail par zone au lieu d'un total : c'est ce qui permet de montrer où
 * part réellement le temps d'une séance, au-delà de son libellé.
 *
 * Les étapes non rattachables à une zone (« récup 3 min souple », « effort
 * 8/10 ») sont ignorées : mieux vaut un camembert incomplet qu'une zone
 * inventée. Les pourcentages portent donc sur ce qui est attribué.
 */
import type { Session, Step as StepTuple, ZoneKey } from '../data/types'
import { ZONE_OFFSETS, zonePace } from './paces'

export interface PartZone {
  zone: ZoneKey
  km: number
  secondes: number
  /** Part du temps attribué, de 0 à 1. */
  part: number
}

const estZone = (v: unknown): v is ZoneKey => typeof v === 'string' && v in ZONE_OFFSETS

/** Distance d'une étape, en kilomètres, ou null si elle ne s'exprime pas en distance. */
function kmDeLEtape(label: string | number): number | null {
  if (typeof label === 'number') return label
  const texte = String(label)

  // « 5 x 1000 m », « 6 x 800 m », « 3 x 2 km »
  const reps = texte.match(/^(\d+)\s*x\s*([\d,.]+)\s*(km|m)?/i)
  if (reps) {
    const n = Number(reps[1])
    const q = parseFloat(reps[2].replace(',', '.'))
    return reps[3]?.toLowerCase() === 'm' ? (n * q) / 1000 : n * q
  }

  const km = texte.match(/([\d,.]+)\s*km/)
  if (km) return parseFloat(km[1].replace(',', '.'))

  const metres = texte.match(/([\d,.]+)\s*m\b/)
  if (metres) return parseFloat(metres[1].replace(',', '.')) / 1000

  return null
}

export function repartitionZones(session: Session, marathonPace: number): PartZone[] {
  const parZone = new Map<ZoneKey, { km: number; secondes: number }>()

  const ajouter = (zone: ZoneKey, km: number) => {
    if (km <= 0) return
    const cur = parZone.get(zone) ?? { km: 0, secondes: 0 }
    cur.km += km
    cur.secondes += km * zonePace(marathonPace, zone)
    parZone.set(zone, cur)
  }

  if (session.struct?.length) {
    for (const seg of session.struct) if (estZone(seg.zone)) ajouter(seg.zone, seg.km)
  } else {
    const etapes: StepTuple[] = [
      ...(session.wu ?? []),
      ...(session.main ?? []),
      ...(session.cd ?? []),
    ]
    for (const [label, zone] of etapes) {
      if (!estZone(zone)) continue
      const km = kmDeLEtape(label)
      if (km != null) ajouter(zone, km)
    }
  }

  const total = [...parZone.values()].reduce((s, v) => s + v.secondes, 0)
  if (!total) return []

  return [...parZone.entries()]
    .map(([zone, v]) => ({
      zone,
      km: Math.round(v.km * 10) / 10,
      secondes: Math.round(v.secondes),
      part: v.secondes / total,
    }))
    .sort((a, b) => b.secondes - a.secondes)
}
