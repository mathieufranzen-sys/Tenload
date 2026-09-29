import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { etatReprise } from './reprise'
import type { PainMap } from './tendonIndex'

const LUNDI = '2026-09-28'

/** Un carnet calme sur quinze jours, où l'on pose ensuite l'épisode. */
const calme = (): PainMap => {
  const p: PainMap = {}
  for (let k = -14; k <= 14; k++) p[addDays(LUNDI, k)] = { wake: 1, evening: 1 }
  return p
}
const jour = (k: number) => addDays(LUNDI, k)

describe('une alerte retire l’intensité, pas la course', () => {
  // L'exemple de Mathieu : 5 pendant la sortie longue du lundi.
  const pain = calme()
  pain[LUNDI] = { wake: 1, effort: 5, evening: 3 }

  it('le mardi matin n’est pas calme : la veille a fait mal', () => {
    const e = etatReprise(jour(1), pain, jour(1))!
    expect(e.courseSuspendue).toBe(false)
    expect(e.intensiteSuspendue).toBe(true)
    expect(e.calmes).toBe(0)
  })

  it('le jeudi, deux matins calmes sur trois : pas encore de fractionné', () => {
    const e = etatReprise(jour(3), pain, jour(3))!
    expect(e.intensiteSuspendue).toBe(true)
    expect(e.calmes).toBe(2)
  })

  it('le vendredi, troisième matin calme : l’intensité revient', () => {
    expect(etatReprise(jour(4), pain, jour(4))).toBeNull()
  })

  it('pas de jour sans course après une simple alerte : la fréquence reste', () => {
    expect(etatReprise(jour(1), pain, jour(1))!.alterner).toBe(false)
  })
})

describe('une crise suspend la course jusqu’à deux matins calmes', () => {
  const pain = calme()
  pain[LUNDI] = { wake: 6, evening: 4 }
  pain[jour(1)] = { wake: 4, evening: 3 }
  pain[jour(2)] = { wake: 3, evening: 2 }

  it('tant que les réveils ne sont pas revenus, pas de course', () => {
    expect(etatReprise(jour(2), pain, jour(2))!.courseSuspendue).toBe(true)
    expect(etatReprise(jour(3), pain, jour(3))!.courseSuspendue).toBe(true)
  })

  it('au deuxième matin calme, la course revient, en endurance et un jour sur deux', () => {
    const e = etatReprise(jour(4), pain, jour(4))!
    expect(e.courseSuspendue).toBe(false)
    expect(e.intensiteSuspendue).toBe(true)
    expect(e.alterner).toBe(true)
  })

  it('l’intensité attend sept matins calmes', () => {
    // Premier matin calme le jeudi (la veille, fin de journée à 2) : le
    // septième tombe le mercredi suivant.
    expect(etatReprise(jour(8), pain, jour(8))!.intensiteSuspendue).toBe(true)
    expect(etatReprise(jour(9), pain, jour(9))).toBeNull()
  })

  it('plus la douleur dure, plus tard le compteur démarre', () => {
    const longue = { ...pain }
    for (let k = 1; k <= 5; k++) longue[jour(k)] = { wake: 5, evening: 5 }
    expect(etatReprise(jour(7), longue, jour(7))!.courseSuspendue).toBe(true)
    expect(etatReprise(jour(8), longue, jour(8))!.courseSuspendue).toBe(false)
  })
})

describe('ce qu’on savait le matin', () => {
  it('la douleur du soir ne réécrit pas la séance du jour même', () => {
    const pain = calme()
    pain[LUNDI] = { wake: 1, effort: 7, evening: 6 }
    expect(etatReprise(LUNDI, pain, LUNDI)).toBeNull()
    expect(etatReprise(jour(1), pain, LUNDI)!.courseSuspendue).toBe(true)
  })

  it('on ne lève rien sur un réveil non saisi', () => {
    const pain = calme()
    pain[LUNDI] = { wake: 6 }
    pain[jour(1)] = { evening: 1 }
    delete pain[jour(2)]
    // Aujourd'hui sans réveil : la course reste suspendue.
    expect(etatReprise(jour(2), pain, jour(2))!.courseSuspendue).toBe(true)
  })

  it('l’avenir se projette sur des réveils calmes, et le dit', () => {
    const pain = calme()
    pain[LUNDI] = { wake: 6, evening: 2 }
    for (let k = 1; k <= 14; k++) delete pain[jour(k)]
    const e = etatReprise(jour(2), pain, LUNDI)!
    expect(e.courseSuspendue).toBe(false)
    // Du mardi au lundi suivant : sept matins supposés calmes.
    expect(e.levee).toBe(jour(7))
  })
})

describe('un noir demande plus qu’une crise', () => {
  it('trois matins calmes pour courir, quatorze pour l’intensité', () => {
    const pain = calme()
    pain[LUNDI] = { wake: 7 }
    expect(etatReprise(jour(2), pain, jour(2))!.courseSuspendue).toBe(true)
    const e = etatReprise(jour(3), pain, jour(3))!
    expect(e.courseSuspendue).toBe(false)
    expect(e.requis).toBe(14)
  })
})

describe('le réveil calme tient compte de la raideur habituelle', () => {
  /** Une raideur de fond à `fond` sur quatre semaines, puis une crise le lundi. */
  const fondPuisCrise = (fond: number): PainMap => {
    const p: PainMap = {}
    for (let k = -28; k <= 14; k++) p[addDays(LUNDI, k)] = { wake: fond, evening: 2 }
    p[LUNDI] = { wake: 6, evening: 2 }
    return p
  }

  it('une base à 2,5 laisse passer des réveils à 2,5', () => {
    expect(etatReprise(jour(2), fondPuisCrise(2.5), jour(2))!.courseSuspendue).toBe(false)
  })

  it('une base plus haute ne desserre pas au-delà de 2,5', () => {
    expect(etatReprise(jour(2), fondPuisCrise(3), jour(2))!.courseSuspendue).toBe(true)
  })

  it('sans base, le seuil reste à 2', () => {
    const p: PainMap = { [LUNDI]: { wake: 6, evening: 2 } }
    for (let k = 1; k <= 3; k++) p[jour(k)] = { wake: 2.5, evening: 2 }
    expect(etatReprise(jour(3), p, jour(3))!.courseSuspendue).toBe(true)
  })
})
