import { describe, expect, it } from 'vitest'
import planJson from '../data/plan.json'
import type { Plan } from '../data/types'
import { compterEnRetard, seancesANoter } from './aNoter'
import { addDays } from './dates'
import { indexerEcarts, slotsParJour, type EcartRow } from './overrides'

const plan = planJson as unknown as Plan
const semaine = plan.weeks[10]
const lundi = semaine.monday
const jour = (n: number) => addDays(lundi, n)

const entree = (over: Partial<Parameters<typeof seancesANoter>[0]> = {}) => ({
  weeks: [semaine],
  notees: new Set<string>(),
  now: jour(6),
  ...over,
})

describe('seancesANoter', () => {
  it('ne retient que ce qui est passé et pas encore noté', () => {
    const liste = seancesANoter(entree())
    expect(liste.length).toBeGreaterThan(0)
    expect(liste.every((x) => x.day <= jour(6))).toBe(true)
  })

  it('ignore le repos : il n’a rien à noter', () => {
    // Contrainte 4, le dimanche est un repos jambes complet. L'inscrire dans
    // la liste donnerait une tâche qui ne peut pas se terminer.
    expect(seancesANoter(entree()).some((x) => x.type === 'repos')).toBe(false)
  })

  it('classe du plus récent au plus ancien', () => {
    const jours = seancesANoter(entree()).map((x) => x.day)
    expect([...jours].sort().reverse()).toEqual(jours)
  })

  it('retire une séance dès qu’elle est notée', () => {
    const liste = seancesANoter(entree())
    const cible = liste[0]
    const apres = seancesANoter(
      entree({
        notees: new Set([`${cible.semaineOrigine}-${cible.jourOrigine}-${cible.slot}`]),
      }),
    )
    expect(apres.length).toBe(liste.length - 1)
    expect(apres.some((x) => x.slot === cible.slot && x.day === cible.day)).toBe(false)
  })

  it('la séance du jour n’est pas en retard', () => {
    // Une séance du soir n'est pas en retard à midi. Elle reste dans la liste,
    // parce qu'on veut pouvoir la noter dès qu'elle est faite, mais elle ne
    // compte pas dans le badge.
    const liste = seancesANoter(entree({ now: jour(3) }))
    const duJour = liste.filter((x) => x.day === jour(3))
    expect(duJour.length).toBeGreaterThan(0)
    expect(duJour.every((x) => !x.enRetard)).toBe(true)
    expect(compterEnRetard(liste)).toBe(liste.length - duJour.length)
  })

  it('une séance sautée sort de la liste', () => {
    const i = semaine.sessions.findIndex((s) => s.day === 0)
    const slot = slotsParJour(semaine.sessions)[i]
    const ecarts = indexerEcarts([
      { week: semaine.n, day_index: 0, slot, patch: { skipped: true }, reason: null } as EcartRow,
    ])
    const avant = seancesANoter(entree())
    const apres = seancesANoter(entree({ ecarts }))
    expect(apres.length).toBe(avant.length - 1)
  })

  it('suit la séance déplacée d’une semaine, et garde sa clé d’origine', () => {
    const i = semaine.sessions.findIndex((s) => s.day === 0)
    const slot = slotsParJour(semaine.sessions)[i]
    const ecarts = indexerEcarts([
      { week: semaine.n, day_index: 0, slot, patch: { day: 2, semaines: -1 }, reason: null } as EcartRow,
    ])
    const x = seancesANoter(entree({ ecarts })).find((v) => v.jourOrigine === 0 && v.slot === slot)
    expect(x).toBeDefined()
    expect(x!.day).toBe(jour(-5))
    expect(x!.semaineOrigine).toBe(semaine.n)
  })

  it('une journée couverte par une activité importée n’a rien à noter', () => {
    const avant = seancesANoter(entree())
    const apres = seancesANoter(entree({ joursAvecActivite: new Set([jour(3)]) }))
    expect(apres.some((x) => x.day === jour(3))).toBe(false)
    expect(apres.length).toBeLessThan(avant.length)
  })

  it('ne propose rien avant le début du plan', () => {
    expect(seancesANoter(entree({ now: addDays(lundi, -1) }))).toEqual([])
  })
})
