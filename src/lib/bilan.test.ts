import { describe, expect, it } from 'vitest'
import { bilanSemaine, type SeanceBilan } from './bilan'
import { addDays } from './dates'
import { sessionLoad } from './load'
import type { Session, Week } from '../data/types'

const LUNDI = '2026-09-14'
const DIMANCHE = addDays(LUNDI, 6)

const s = (extra: Partial<Session>): Session => ({ day: 0, type: 'ef', title: 'Séance', cat: '', note: '', ...extra })

const semaine = (n: number, monday: string, sessions: Session[], deload = false): Week => ({
  n,
  bloc: 'A',
  blocName: '',
  monday,
  deload,
  sl: 24,
  efKm: 7,
  sessions,
})

const plan = [
  s({ day: 0, type: 'long', dist: 24, title: 'Sortie longue de 24 km', struct: [{ km: 24, zone: 'ef' }] }),
  s({ day: 1, type: 'ef', dist: 7, title: 'Endurance facile 7 km' }),
  s({ day: 3, type: 'velo', title: 'Vélo Z2', dur: [60, 60] }),
  s({ day: 6, type: 'repos', title: 'Repos' }),
]

const vecue = (w: Week, faites: number[], sautees: number[] = []): SeanceBilan[] =>
  w.sessions.map((x) => ({
    s: sautees.includes(x.day) ? { ...x, saute: true } : x,
    typePlan: x.type,
    day: addDays(w.monday, x.day),
    faite: faites.includes(x.day),
    reference: x,
  }))

describe('bilanSemaine', () => {
  const w = semaine(6, LUNDI, plan)

  it('compte les séances, les kilomètres et l’excentrique de la semaine', () => {
    const pain = {
      [LUNDI]: { wake: 1, eccentric: true },
      [addDays(LUNDI, 1)]: { wake: 1.5, evening: 3 },
      [addDays(LUNDI, 2)]: { wake: 1, eccentric: true },
    }
    const b = bilanSemaine({ semaine: w, seances: vecue(w, [0, 1], [3]), pain, charge: {}, now: DIMANCHE })
    expect(b).toMatchObject({ faites: 2, prevues: 3, sautees: 1, nonNotees: 0, kmRealises: 31, kmPrevus: 31, excentrique: 2 })
    expect(b.pic).toEqual({ valeur: 3, day: addDays(LUNDI, 1), moment: 'soir' })
    expect(b.raideur).toBeCloseTo(7 / 6)
  })

  it('ne compare pas la charge au plan quand une séance passée n’est pas notée', () => {
    const b = bilanSemaine({ semaine: w, seances: vecue(w, [0]), pain: {}, charge: { [LUNDI]: 26 }, now: DIMANCHE })
    expect(b.nonNotees).toBe(2)
    expect(b.ecartCharge).toBeNull()
  })

  it('compare la charge au plan quand tout est noté', () => {
    // Une semaine faite exactement comme écrite : la charge réelle est celle du plan.
    const charge = Object.fromEntries(plan.map((x) => [addDays(LUNDI, x.day), sessionLoad(x)]))
    const b = bilanSemaine({ semaine: w, seances: vecue(w, [0, 1, 3]), pain: {}, charge, now: DIMANCHE })
    expect(b.ecartCharge).toBe(0)
  })

  it('ne donne pas de moyenne de raideur sur deux matins', () => {
    const pain = { [LUNDI]: { wake: 1 }, [addDays(LUNDI, 1)]: { wake: 2 } }
    expect(bilanSemaine({ semaine: w, seances: vecue(w, []), pain, charge: {}, now: DIMANCHE }).raideur).toBeNull()
  })

  it('annonce la décharge et la sortie longue plafonnée par le palier', () => {
    const lundiSuivant = addDays(LUNDI, 7)
    const w2 = semaine(7, lundiSuivant, [s({ day: 0, type: 'long', dist: 26, title: 'Sortie longue de 26 km' })], true)
    const plafonnee: SeanceBilan = {
      s: { ...w2.sessions[0], dist: 24, title: 'Sortie longue de 24 km', adapted: 'Palier tenu · Raideur du lendemain à 4' },
      typePlan: 'long',
      day: lundiSuivant,
      faite: false,
      reference: w2.sessions[0],
    }
    const b = bilanSemaine({
      semaine: w,
      seances: vecue(w, [0, 1, 3]),
      pain: {},
      charge: {},
      now: DIMANCHE,
      suivante: { semaine: w2, seances: [plafonnee] },
    })
    expect(b.suivante[0]).toContain('décharge')
    expect(b.suivante[1]).toBe('Sortie longue tenue à 24 km au lieu de 26 km : raideur du lendemain à 4.')
  })

  it('dit quand rien ne change', () => {
    const w2 = semaine(7, addDays(LUNDI, 7), [s({ day: 2, type: 'escalade', title: 'Escalade' })])
    const b = bilanSemaine({
      semaine: w,
      seances: vecue(w, []),
      pain: {},
      charge: {},
      now: DIMANCHE,
      suivante: { semaine: w2, seances: vecue(w2, []) },
    })
    expect(b.suivante).toEqual(['Semaine type, rien de particulier annoncé.'])
  })
})
