import { describe, expect, it } from 'vitest'
import { bilanSemaine, effortAttendu, type FaitsBilan, type SeanceBilan } from './bilan'
import { addDays } from './dates'
import { sessionLoad } from './load'
import type { Session, Week } from '../data/types'

const LUNDI = '2026-09-14'
const DIMANCHE = addDays(LUNDI, 6)

const s = (extra: Partial<Session>): Session => ({ day: 0, type: 'ef', title: 'Séance', cat: '', note: '', ...extra })

const semaine = (n: number, monday: string, sessions: Session[], deload = false): Week => ({
  n, bloc: 'A', blocName: '', monday, deload, sl: 24, efKm: 7, sessions,
})

const plan = [
  s({ day: 0, type: 'long', dist: 24, title: 'Sortie longue de 24 km', struct: [{ km: 24, zone: 'ef' }] }),
  s({ day: 1, type: 'ef', dist: 8, title: 'Course facile de 8 km' }),
  s({ day: 3, type: 'tempo', dist: 12, title: 'Seuil 3 x 8 min', seuilMin: 24, qualite: 'seuil' }),
  s({ day: 5, type: 'ef', dist: 10, title: 'Course facile de 10 km' }),
  s({ day: 6, type: 'repos', title: 'Repos' }),
]

/** Les faits que Today calcule : neutres par défaut, surchargés au besoin. */
const faits = (extra: Partial<FaitsBilan> = {}): FaitsBilan => ({
  volume28: 200,
  attestes: 7,
  sansDouleur: { jours: 41, releves: 38 },
  excentriqueSerie: 3,
  semainesDAffilee: 5,
  indice: { moyen: 27, pic: 34, emballement: 1.05, monotonie: 0.9 },
  forme: { allure: 286, ecart: -3, seances: 5 },
  echeances: { dixKm: 58, marathon: 199 },
  dosage: { seuil: 3, vitesse: 1 },
  ...extra,
})

const vecue = (
  w: Week,
  faites: number[],
  extra: Record<number, Partial<SeanceBilan>> = {},
  sautees: number[] = [],
): SeanceBilan[] =>
  w.sessions.map((x) => ({
    s: sautees.includes(x.day) ? { ...x, saute: true } : x,
    typePlan: x.type,
    day: addDays(w.monday, x.day),
    faite: faites.includes(x.day),
    rpe: null,
    douleur: null,
    reference: x,
    ...extra[x.day],
  }))

const w = semaine(6, LUNDI, plan)

describe('bilanSemaine', () => {
  it('compte les séances, les kilomètres, le seuil et l’excentrique', () => {
    const pain = {
      [LUNDI]: { wake: 1, eccentric: true },
      [addDays(LUNDI, 1)]: { wake: 1.5, evening: 3 },
      [addDays(LUNDI, 2)]: { wake: 1, eccentric: true },
    }
    const b = bilanSemaine({ semaine: w, seances: vecue(w, [0, 1, 3]), pain, charge: {}, now: DIMANCHE, faits: faits() })
    expect(b).toMatchObject({ faites: 3, prevues: 4, sautees: 0, nonNotees: 1, kmRealises: 44, excentrique: 2 })
    expect(b.seuilMin).toBe(24)
    expect(b.pic).toEqual({ valeur: 3, day: addDays(LUNDI, 1), moment: 'soir' })
    expect(b.raideur).toBeCloseTo(7 / 6)
  })

  it('donne la part de la sortie longue dans le volume réellement couru', () => {
    const b = bilanSemaine({ semaine: w, seances: vecue(w, [0, 1, 3, 5]), pain: {}, charge: {}, now: DIMANCHE, faits: faits() })
    // 24 km sur 54 km courus.
    expect(Math.round(b.partLongue!)).toBe(44)
  })

  it('ne compare pas la charge au plan quand une séance passée n’est pas notée', () => {
    const b = bilanSemaine({ semaine: w, seances: vecue(w, [0]), pain: {}, charge: { [LUNDI]: 26 }, now: DIMANCHE, faits: faits() })
    expect(b.ecartCharge).toBeNull()
  })

  it('compare la charge au plan quand tout est noté', () => {
    const charge = Object.fromEntries(plan.map((x) => [addDays(LUNDI, x.day), sessionLoad(x)]))
    const b = bilanSemaine({ semaine: w, seances: vecue(w, [0, 1, 3, 5]), pain: {}, charge, now: DIMANCHE, faits: faits() })
    expect(b.ecartCharge).toBe(0)
  })

  it('ne donne pas de moyenne de raideur sur deux matins', () => {
    const pain = { [LUNDI]: { wake: 1 }, [addDays(LUNDI, 1)]: { wake: 2 } }
    expect(bilanSemaine({ semaine: w, seances: vecue(w, []), pain, charge: {}, now: DIMANCHE, faits: faits() }).raideur).toBeNull()
  })
})

describe('les erreurs de la semaine', () => {
  const erreurs = (extra: Record<number, Partial<SeanceBilan>>, faites = [0, 1, 3, 5]) =>
    bilanSemaine({ semaine: w, seances: vecue(w, faites, extra), pain: {}, charge: {}, now: DIMANCHE, faits: faits() }).erreurs

  it('relève une séance courue au-dessus de l’effort attendu', () => {
    const e = erreurs({ 3: { rpe: 9 } })
    expect(e.join(' ')).toContain('Seuil 3 x 8 min')
    expect(e.join(' ')).toContain('7,5 attendu')
  })

  it('ne dit rien d’un effort dans la cible', () => {
    expect(erreurs({ 3: { rpe: 7 } })).toEqual([])
  })

  it('relève une séance faite avec de la douleur', () => {
    expect(erreurs({ 0: { douleur: 5 } }).join(' ')).toContain('5 de douleur')
  })

  it('relève les séances sans ressenti', () => {
    expect(erreurs({}, [0, 1]).join(' ')).toContain('2 séances sans ressenti')
  })

  it('l’effort attendu dépend de ce que la séance travaille', () => {
    expect(effortAttendu(s({ qualite: 'seuil' }))).toBe(7.5)
    expect(effortAttendu(s({ qualite: 'specifique' }))).toBe(9)
    expect(effortAttendu(s({}))).toBeNull()
  })
})

describe('les adaptations proposées', () => {
  const avec = (f: Partial<FaitsBilan>, pain: Record<string, { wake?: number; evening?: number }> = {}, extra: Record<number, Partial<SeanceBilan>> = {}) =>
    bilanSemaine({ semaine: w, seances: vecue(w, [0, 1, 3, 5], extra), pain, charge: {}, now: DIMANCHE, faits: faits(f) }).adaptations

  const raideurs = (semaine: number, precedente: number) =>
    Object.fromEntries(
      [0, 1, 2, 3].flatMap((k) => [
        [addDays(LUNDI, k), { wake: semaine }],
        [addDays(LUNDI, k - 7), { wake: precedente }],
      ]),
    )

  it('majore le volume quand tout va dans le même sens', () => {
    const a = avec({}, raideurs(1.2, 1.8))
    expect(a.join(' ')).toContain('Majorer le volume de 5 %')
  })

  it('coupe l’intensité et non le volume quand la raideur remonte', () => {
    const a = avec({}, raideurs(1.9, 1.3))
    expect(a.join(' ')).toContain("Couper l'intensité")
    expect(a.join(' ')).not.toContain('Majorer')
  })

  it('ralentit les séances sur un effort perçu trop haut', () => {
    expect(avec({}, {}, { 3: { rpe: 9 }, 0: { rpe: 8 } }).join(' ')).toContain('Ralentir les séances')
  })

  it('rend une vitesse au seuil quand le dosage dérive', () => {
    expect(avec({ dosage: { seuil: 2, vitesse: 2 } }).join(' ')).toContain('Rendre une séance de vitesse au seuil')
  })

  it('ne propose rien quand rien ne le déclenche', () => {
    expect(avec({}).join(' ')).toContain('Rien à changer')
  })
})

describe('le mot mental', () => {
  const mental = (suiv: Week) =>
    bilanSemaine({
      semaine: w, seances: vecue(w, [0, 1, 3, 5]), pain: {}, charge: {}, now: DIMANCHE,
      faits: faits({ echeances: { dixKm: 200, marathon: 400 } }),
      suivante: { semaine: suiv, seances: vecue(suiv, []) },
    }).mental

  it('annonce le dossard quand la semaine suivante en porte un', () => {
    const suiv = semaine(7, addDays(LUNDI, 7), [s({ day: 6, type: 'course', dist: 10, title: '10 km Hoka' })])
    expect(mental(suiv)).toContain('10 km Hoka')
  })

  it('explique la décharge', () => {
    const suiv = semaine(7, addDays(LUNDI, 7), [s({ day: 0, type: 'long', dist: 18 })], true)
    expect(mental(suiv)).toContain('décharge')
  })

  it('parle de patience sur une semaine de volume', () => {
    const suiv = semaine(7, addDays(LUNDI, 7), [s({ day: 0, type: 'long', dist: 26 })])
    expect(mental(suiv)).toContain('aucun progrès')
  })

  it('bascule sur le 10 km quand il approche', () => {
    const b = bilanSemaine({
      semaine: w, seances: vecue(w, [0, 1, 3, 5]), pain: {}, charge: {}, now: DIMANCHE,
      faits: faits({ echeances: { dixKm: 20, marathon: 190 } }),
    })
    expect(b.mental).toContain('10 km est dans 20 jours')
  })
})

describe('ce que change la semaine suivante', () => {
  it('annonce la longue, la qualité et son dosage', () => {
    const suiv = semaine(7, addDays(LUNDI, 7), [
      s({ day: 0, type: 'long', dist: 26, title: 'Sortie longue de 26 km' }),
      s({ day: 3, type: 'tempo', dist: 13, title: 'Seuil 3 x 10 min', seuilMin: 30, qualite: 'seuil' }),
    ])
    const b = bilanSemaine({
      semaine: w, seances: vecue(w, [0, 1, 3, 5]), pain: {}, charge: {}, now: DIMANCHE, faits: faits(),
      suivante: { semaine: suiv, seances: vecue(suiv, []) },
    })
    expect(b.suivante.join(' ')).toContain('Sortie longue de 26 km, contre 24 km cette semaine')
    expect(b.suivante.join(' ')).toContain('30 minutes cumulées au seuil')
  })

  it('explique une sortie longue tenue par le palier', () => {
    const suiv = semaine(7, addDays(LUNDI, 7), [s({ day: 0, type: 'long', dist: 26, title: 'Sortie longue de 26 km' })])
    const plafonnee: SeanceBilan = {
      s: { ...suiv.sessions[0], dist: 24, adapted: 'Palier tenu · Raideur du lendemain à 4' },
      typePlan: 'long', day: addDays(LUNDI, 7), faite: false, rpe: null, douleur: null,
      reference: suiv.sessions[0],
    }
    const b = bilanSemaine({
      semaine: w, seances: vecue(w, [0, 1, 3, 5]), pain: {}, charge: {}, now: DIMANCHE, faits: faits(),
      suivante: { semaine: suiv, seances: [plafonnee] },
    })
    expect(b.suivante[0]).toBe('Sortie longue tenue à 24 km au lieu de 26 km : raideur du lendemain à 4.')
  })
})
