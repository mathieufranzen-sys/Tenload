/**
 * Tests de l'indice de charge du tendon.
 *
 * Ces tests verrouillent les décisions produites avec Mathieu. Si tu changes une
 * constante du modèle et qu'un test casse, c'est probablement le modèle qui a
 * tort, pas le test — relis d'abord la section « L'indice » du CLAUDE.md.
 */
import { describe, expect, it } from 'vitest'
import {
  bandOf,
  indexSeries,
  painScore,
  painTrend,
  shiftDay,
  tendonIndex,
  type LoadMap,
  type PainMap,
} from './tendonIndex'

/**
 * Charge de fond des six semaines précédant le plan, reprise du profil réel de
 * Mathieu en juillet : environ 45 km de course par semaine plus deux vélos.
 * Sans cet historique, la charge chronique est trop basse pour que le rapport
 * aigu/chronique ait un sens — c'est ce que gère `confidence`.
 */
function background(until: string, days = 45): LoadMap {
  const out: LoadMap = {}
  for (let k = 1; k <= days; k++) {
    const d = shiftDay(until, -k)
    const dow = new Date(`${d}T12:00:00Z`).getUTCDay() // 0 = dimanche
    out[d] = [0, 22, 7, 6, 15, 4, 12][dow]
  }
  return out
}

/** Semaine 1 du plan, charge nominale en kilomètres-équivalents. */
const WEEK1: LoadMap = {
  ...background('2026-08-09'),
  '2026-08-09': 28.8, // les 25 km de la veille du plan
  '2026-08-10': 4.0, // vélo de récupération
  '2026-08-11': 7.0, // EF 7 km + renfo haut
  '2026-08-12': 6.5, // escalade
  '2026-08-13': 16.5, // muscu bas + vélo
  '2026-08-14': 4.0, // vélo récup
  '2026-08-15': 11.0, // reprise 2 x 2 km au seuil
  '2026-08-16': 0, // repos
}

const DAYS = [
  '2026-08-10','2026-08-11','2026-08-12','2026-08-13','2026-08-14','2026-08-15','2026-08-16',
]

/** Douleur constante sur toute la semaine. */
const flat = (v: number): PainMap =>
  Object.fromEntries(DAYS.map((d) => [d, { wake: v, effort: v, evening: v }]))

const series = (load: LoadMap, pain: PainMap) =>
  indexSeries('2026-08-10', '2026-08-16', load, pain).map((r) => r.idx)

const bands = (load: LoadMap, pain: PainMap) =>
  indexSeries('2026-08-10', '2026-08-16', load, pain).map((r) => bandOf(r.idx).key)

describe('shiftDay', () => {
  it('décale sans se faire piéger par les changements de mois', () => {
    expect(shiftDay('2026-08-31', 1)).toBe('2026-09-01')
    expect(shiftDay('2027-03-01', -1)).toBe('2027-02-28')
    expect(shiftDay('2026-10-25', -1)).toBe('2026-10-24') // passage à l'heure d'hiver
  })
})

describe('painScore', () => {
  it('pondère le réveil du jour et la réaction retardée de la veille', () => {
    const p: PainMap = {
      '2026-08-10': { effort: 6, evening: 6 },
      '2026-08-11': { wake: 0 },
    }
    // pondéré = (0*.45 + 6*.35 + 6*.20) / 1 = 3,3 ; pic sur 72 h = 6
    // score = .55*3,3 + .45*6 = 4,515
    expect(painScore('2026-08-11', p).score).toBeCloseTo(4.515, 2)
  })

  it("ne dilue pas un pic isolé dans une moyenne", () => {
    const isole: PainMap = { '2026-08-10': { wake: 0, effort: 0, evening: 5 } }
    const { score } = painScore('2026-08-10', isole)
    expect(score).toBeGreaterThan(2.2) // un 5 isolé reste un signal
  })

  it("reporte la dernière valeur connue en la faisant décroître quand rien n'est saisi", () => {
    const p: PainMap = { '2026-08-10': { wake: 4 } }
    const r2 = painScore('2026-08-12', p)
    expect(r2.stale).toBe(true)
    expect(r2.score).toBeCloseTo(4 * 0.5, 5) // deux jours plus tard : moitié
    expect(painScore('2026-08-20', p).score).toBeNull() // au-delà, plus rien
  })
})

describe('painTrend', () => {
  it('ne retient que les hausses', () => {
    const up: PainMap = {
      '2026-08-10': { wake: 1 },
      '2026-08-11': { wake: 2 },
      '2026-08-12': { wake: 3 },
      '2026-08-13': { wake: 4 },
    }
    expect(painTrend('2026-08-13', up)).toBeCloseTo(1, 5)
    const down: PainMap = {
      '2026-08-10': { wake: 4 },
      '2026-08-11': { wake: 3 },
      '2026-08-12': { wake: 2 },
      '2026-08-13': { wake: 1 },
    }
    expect(painTrend('2026-08-13', down)).toBe(0)
  })
})

describe('bandes', () => {
  it('découpe aux seuils décidés avec Mathieu', () => {
    expect(bandOf(0).key).toBe('vert')
    expect(bandOf(29).key).toBe('vert')
    expect(bandOf(30).key).toBe('jaune')
    expect(bandOf(49).key).toBe('jaune')
    expect(bandOf(50).key).toBe('orange') // plus de tempo ni d'intervalles
    expect(bandOf(64).key).toBe('orange')
    expect(bandOf(65).key).toBe('rouge') // plus de course du tout
    expect(bandOf(79).key).toBe('rouge')
    expect(bandOf(80).key).toBe('noir')
    expect(bandOf(100).key).toBe('noir')
  })
})

describe('une douleur de fond ne doit pas déclencher de fausse alerte', () => {
  it('reste en vert ou jaune jusqu’à 2/10 constant', () => {
    for (const v of [0, 1, 2]) {
      const b = bands(WEEK1, flat(v))
      expect(b.every((k) => k === 'vert' || k === 'jaune'), `douleur ${v}`).toBe(true)
    }
  })

  it('commence à basculer à 3/10 constant', () => {
    expect(Math.max(...series(WEEK1, flat(3)))).toBeGreaterThanOrEqual(50)
  })
})

describe('bascules garanties après une séance douloureuse', () => {
  const withPain = (level: number): PainMap => ({
    ...flat(0),
    '2026-08-10': { wake: 0, effort: level, evening: level },
  })

  it('3/10 laisse le plan nominal', () => {
    expect(Math.max(...series(WEEK1, withPain(3)))).toBeLessThan(50)
  })

  it('4/10 impose au moins l’orange, comme demandé', () => {
    const s = series(WEEK1, withPain(4))
    expect(Math.max(...s)).toBeGreaterThanOrEqual(50)
    expect(bandOf(s[0]).key).toBe('orange')
  })

  it('6/10 impose au moins le rouge : plus de course', () => {
    expect(bandOf(series(WEEK1, withPain(6))[0]).key).toBe('rouge')
  })

  it('8/10 impose le noir : repos complet', () => {
    expect(bandOf(series(WEEK1, withPain(8))[0]).key).toBe('noir')
  })

  it('la sévérité est monotone : plus de douleur ne peut pas donner moins d’indice', () => {
    const peaks = [2, 4, 6, 8, 10].map((v) => Math.max(...series(WEEK1, withPain(v))))
    for (let i = 1; i < peaks.length; i++) expect(peaks[i]).toBeGreaterThanOrEqual(peaks[i - 1])
  })
})

describe('mémoire d’épisode', () => {
  it('ne repasse pas au vert dès le lendemain d’un pic, même douleur retombée', () => {
    const pain: PainMap = {
      '2026-08-10': { wake: 1, effort: 7, evening: 7 },
      '2026-08-11': { wake: 4, effort: 0, evening: 3 },
      '2026-08-12': { wake: 2, effort: 0, evening: 1 },
      '2026-08-13': { wake: 0, effort: 0, evening: 0 },
      '2026-08-14': { wake: 0, effort: 0, evening: 0 },
      '2026-08-15': { wake: 0, effort: 0, evening: 0 },
      '2026-08-16': { wake: 0, effort: 0, evening: 0 },
    }
    // repos complet à partir du 11
    const load: LoadMap = { ...background('2026-08-09'), '2026-08-09': 28.8, '2026-08-10': 4 }
    const s = series(load, pain)
    expect(bandOf(s[0]).key === 'rouge' || bandOf(s[0]).key === 'orange').toBe(true)
    expect(s[2]).toBeGreaterThan(30) // encore sensibilisé deux jours après
    expect(s[6]).toBeLessThan(30) // mais redescendu dans le vert au bout d'une semaine
    // la décroissance est monotone après le pic
    for (let i = 2; i < s.length; i++) expect(s[i]).toBeLessThanOrEqual(s[i - 1])
  })
})

describe('charge seule, sans aucune douleur', () => {
  it('réagit à un pic de volume sans pour autant tout arrêter', () => {
    const spike: LoadMap = { ...WEEK1, '2026-08-10': 46 }
    const s = series(spike, flat(0))
    expect(Math.max(...s)).toBeGreaterThan(Math.max(...series(WEEK1, flat(0))))
    expect(bandOf(Math.max(...s)).key).not.toBe('rouge')
  })

  it('un vrai jour de repos fait baisser l’indice', () => {
    const r = tendonIndex('2026-08-17', { ...WEEK1 }, {})
    expect(r.credits).toBeGreaterThanOrEqual(5)
  })
})

describe('démarrage à froid', () => {
  it("ne s'emballe pas quand l'historique de charge est trop court", () => {
    const court: LoadMap = { '2026-08-09': 28.8, '2026-08-10': 4 }
    const r = tendonIndex('2026-08-10', court, {})
    expect(r.confidence).toBeLessThan(1)
    expect(r.ratio + r.freshness).toBeLessThanOrEqual(26)
  })

  it('reprend la main dès qu’il y a assez de jours connus', () => {
    const r = tendonIndex('2026-08-10', WEEK1, {})
    expect(r.confidence).toBe(1)
  })
})

describe('les gestes protecteurs récompensent l’observance', () => {
  it('le protocole excentrique de la veille fait baisser l’indice', () => {
    const sans = tendonIndex('2026-08-14', WEEK1, { '2026-08-13': { wake: 1 } })
    const avec = tendonIndex('2026-08-14', WEEK1, {
      '2026-08-13': { wake: 1, eccentric: true },
    })
    expect(avec.idx).toBeLessThan(sans.idx)
    expect(avec.credits - sans.credits).toBe(6)
  })

  it('le glaçage est saisi mais ne pèse plus sur le crédit', () => {
    const sans = tendonIndex('2026-08-14', WEEK1, { '2026-08-13': { wake: 1 } })
    const avec = tendonIndex('2026-08-14', WEEK1, { '2026-08-13': { wake: 1, icing: true } })
    expect(avec.credits).toBe(sans.credits)
  })

  it('bien s’hydrater la veille fait aussi baisser l’indice', () => {
    const sans = tendonIndex('2026-08-14', WEEK1, { '2026-08-13': { wake: 1 } })
    const avec = tendonIndex('2026-08-14', WEEK1, { '2026-08-13': { wake: 1, hydrated: true } })
    expect(avec.idx).toBeLessThan(sans.idx)
    expect(avec.credits - sans.credits).toBe(2)
  })
})

describe('calibration sur les données réelles', () => {
  it('reste dans une plage plausible sur un mois de charge régulière', () => {
    // Charge type de Mathieu en juillet : environ 45 km de course par semaine
    // répartis sur 4 sorties, plus deux vélos.
    const load: LoadMap = {}
    for (let k = 0; k < 40; k++) {
      const d = shiftDay('2026-08-09', -k)
      const dow = new Date(`${d}T12:00:00Z`).getUTCDay()
      load[d] = [0, 22, 7, 6, 15, 4, 12][dow] // dim..sam
    }
    const pain: PainMap = {}
    for (let k = 0; k < 40; k++) {
      pain[shiftDay('2026-08-09', -k)] = { wake: 1, effort: 0.5, evening: 1.5 }
    }
    const s = indexSeries(shiftDay('2026-08-09', -30), '2026-08-09', load, pain).map(
      (r) => r.idx,
    )
    const median = [...s].sort((a, b) => a - b)[Math.floor(s.length / 2)]
    expect(median).toBeGreaterThan(10)
    expect(median).toBeLessThan(50)
    expect(Math.max(...s)).toBeLessThan(80)
  })
})

describe('douleur inconnue', () => {
  const jour = '2026-09-20'

  it('signale l’absence dès que le report est épuisé', () => {
    // Dernière saisie il y a cinq jours : painScore ne reporte plus rien.
    const pain: PainMap = { [shiftDay(jour, -5)]: { wake: 3 } }
    const b = tendonIndex(jour, {}, pain)
    expect(b.painInconnue).toBe(true)
    expect(b.painScore).toBeNull()
    expect(b.joursSansDouleur).toBe(5)
  })

  it('bascule au quatrième jour, pas au cinquième', () => {
    // Au quatrième jour le report valait exactement zéro : une mesure nulle
    // en apparence, une absence de donnée en réalité. C'est cet état qui
    // affichait « tout est autorisé » en vert sur un carnet muet.
    const pain: PainMap = { [shiftDay(jour, -4)]: { wake: 6 } }
    const b = tendonIndex(jour, {}, pain)
    expect(b.painInconnue).toBe(true)
    expect(b.painScore).toBeNull()
  })

  it('reporte encore au troisième jour, en décroissance', () => {
    const pain: PainMap = { [shiftDay(jour, -3)]: { wake: 6 } }
    const b = tendonIndex(jour, {}, pain)
    expect(b.painInconnue).toBe(false)
    expect(b.stale).toBe(true)
    expect(b.painScore).toBeCloseTo(1.5, 5) // 6 x (1 − 3/4)
  })

  it('ne signale rien tant que le report tient', () => {
    const pain: PainMap = { [shiftDay(jour, -2)]: { wake: 3 } }
    const b = tendonIndex(jour, {}, pain)
    expect(b.painInconnue).toBe(false)
    expect(b.stale).toBe(true)
  })

  it('ne signale rien le jour d’une saisie', () => {
    const b = tendonIndex(jour, {}, { [jour]: { wake: 1 } })
    expect(b.painInconnue).toBe(false)
    expect(b.joursSansDouleur).toBe(0)
  })

  it('reste vrai quand le carnet est entièrement vide', () => {
    const b = tendonIndex(jour, {}, {})
    expect(b.painInconnue).toBe(true)
    expect(b.joursSansDouleur).toBeNull()
  })

  it('n’altère pas le calcul : c’est un drapeau, pas un terme', () => {
    // Le même indice qu'avant l'ajout du drapeau. Si ce test casse, c'est que
    // la composante douleur a bougé, ce qui n'était pas l'intention.
    const load: LoadMap = {}
    for (let k = 0; k < 28; k++) load[shiftDay(jour, -k)] = 8
    const b = tendonIndex(jour, load, {})
    expect(b.pain).toBe(0)
    expect(b.idx).toBe(Math.max(0, b.ratio + b.freshness + b.monotony - b.credits))
  })
})
