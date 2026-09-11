import { describe, expect, it } from 'vitest'
import type { FeedbackRow } from './buildPain'
import { addDays } from './dates'
import {
  HAUSSE_TOLEREE,
  arrangerPlan,
  baseRaideur,
  appliquerPalierSpecifique,
  palierProchaineLongue,
  palierProchaineSpecifique,
  verdictDerniereLongue,
  type SeanceArrangee,
} from './palier'
import type { PainMap } from './tendonIndex'
import type { Session, Week } from '../data/types'
import { indexerEcarts, type EcartRow } from './overrides'

const NOW = '2026-09-16'

/** Longue faite le 7, longue prévue le 14 puis le 21. */
const SEANCES: SeanceArrangee[] = [
  { week: 1, jourOrigine: 0, slot: 0, day: '2026-09-07', type: 'long', dist: 24, saute: false },
  { week: 2, jourOrigine: 0, slot: 0, day: '2026-09-14', type: 'long', dist: 26, saute: false },
  { week: 3, jourOrigine: 0, slot: 0, day: '2026-09-21', type: 'long', dist: 28, saute: false },
]

const note = (extra: Partial<FeedbackRow> = {}): FeedbackRow => ({
  week: 1,
  day_index: 0,
  slot: 0,
  day: '2026-09-07',
  session_type: 'long',
  pain: 2,
  rpe: 7,
  ...extra,
})

/** Sept jours de raideur à `base` avant la longue du 7, puis son lendemain. */
const carnet = (base: number, lendemain: number | null): PainMap => {
  const p: PainMap = {}
  for (let k = 1; k <= 7; k++) {
    p[addDays('2026-09-07', -k)] = { wake: base, effort: null, evening: null }
  }
  if (lendemain != null) p['2026-09-08'] = { wake: lendemain, effort: null, evening: null }
  return p
}

describe('baseRaideur', () => {
  it('moyenne les sept jours qui précèdent', () => {
    expect(baseRaideur('2026-09-07', carnet(1, null))).toBe(1)
  })

  it('refuse de conclure sous trois relevés', () => {
    const p: PainMap = { '2026-09-06': { wake: 1, effort: null, evening: null } }
    expect(baseRaideur('2026-09-07', p)).toBeNull()
  })
})

describe('verdictDerniereLongue', () => {
  it('rend null tant qu’aucune longue n’est notée', () => {
    expect(verdictDerniereLongue(SEANCES, [], carnet(1, 1), NOW)).toBeNull()
  })

  it('ne retient qu’une longue passée', () => {
    // Une note sur la longue du 21 ne doit pas compter le 16.
    const f = note({ week: 3, day: '2026-09-21' })
    expect(verdictDerniereLongue(SEANCES, [f], carnet(1, 1), NOW)).toBeNull()
  })

  it('conclut que le tendon a encaissé quand le lendemain est calme', () => {
    const v = verdictDerniereLongue(SEANCES, [note({ pain: 2 })], carnet(1, 1), NOW)!
    expect(v.encaisse).toBe(true)
    expect(v.raison).toBeNull()
    expect(v.km).toBe(24)
  })

  it('tolère une douleur de 5/10 si le lendemain est calme', () => {
    // C'est la règle des 24 h : la douleur pendant l'effort n'est pas un
    // verdict, la raideur du lendemain en est un.
    const v = verdictDerniereLongue(SEANCES, [note({ pain: 5 })], carnet(1, 1), NOW)!
    expect(v.encaisse).toBe(true)
  })

  it('bloque à partir de 6/10 pendant la séance, lendemain calme ou non', () => {
    const v = verdictDerniereLongue(SEANCES, [note({ pain: 6 })], carnet(1, 0), NOW)!
    expect(v.encaisse).toBe(false)
    expect(v.raison).toContain('pendant la sortie longue')
  })

  it('bloque quand la raideur du lendemain n’est pas saisie', () => {
    // On ne monte pas le volume sur une absence de données : c'est la même
    // règle que painInconnue.
    const v = verdictDerniereLongue(SEANCES, [note({ pain: 1 })], carnet(1, null), NOW)!
    expect(v.encaisse).toBe(false)
    expect(v.raison).toContain('non saisie')
  })

  it('bloque sur une raideur du lendemain à 4/10 ou plus', () => {
    const v = verdictDerniereLongue(SEANCES, [note({ pain: 1 })], carnet(3, 4), NOW)!
    expect(v.encaisse).toBe(false)
    expect(v.raison).toContain('au réveil le lendemain')
  })

  it('bloque sur une hausse nette par rapport à la base, même sous 4', () => {
    const v = verdictDerniereLongue(SEANCES, [note({ pain: 1 })], carnet(0.5, 0.5 + HAUSSE_TOLEREE), NOW)!
    expect(v.encaisse).toBe(false)
    expect(v.raison).toContain('montée de')
  })

  it('laisse passer une hausse en deçà de la tolérance', () => {
    const v = verdictDerniereLongue(SEANCES, [note({ pain: 1 })], carnet(1, 2), NOW)!
    expect(v.encaisse).toBe(true)
  })

  it('retient la distance notée plutôt que la distance prévue', () => {
    const v = verdictDerniereLongue(SEANCES, [note({ distance_km: 22 })], carnet(1, 1), NOW)!
    expect(v.km).toBe(22)
  })
})

describe('palierProchaineLongue', () => {
  it('ne plafonne rien quand le tendon a encaissé', () => {
    expect(palierProchaineLongue(SEANCES, [note({ pain: 2 })], carnet(1, 1), NOW)).toBeNull()
  })

  it('plafonne la prochaine longue à la distance de la précédente', () => {
    const p = palierProchaineLongue(SEANCES, [note({ pain: 1 })], carnet(3, 5), NOW)!
    expect(p.jour).toBe('2026-09-21')
    expect(p.km).toBe(24)
  })

  it('ne plafonne que la prochaine, pas toute la suite du plan', () => {
    const p = palierProchaineLongue(SEANCES, [note({ pain: 1 })], carnet(3, 5), NOW)!
    expect(p.jour).toBe('2026-09-21')
    // La longue du 28 n'est pas concernée : elle se rejugera sur celle du 21.
    expect(p.jour).not.toBe('2026-09-28')
  })

  it('ne plafonne pas une longue déjà plus courte que le palier', () => {
    const courtes: SeanceArrangee[] = [
      SEANCES[0],
      { ...SEANCES[2], dist: 20 },
    ]
    expect(palierProchaineLongue(courtes, [note({ pain: 1 })], carnet(3, 5), NOW)).toBeNull()
  })

  it('saute une longue annulée pour plafonner la suivante', () => {
    const avecSaut: SeanceArrangee[] = [
      SEANCES[0],
      { ...SEANCES[2], day: '2026-09-21', saute: true },
      { week: 4, jourOrigine: 0, slot: 0, day: '2026-09-28', type: 'long', dist: 30, saute: false },
    ]
    const p = palierProchaineLongue(avecSaut, [note({ pain: 1 })], carnet(3, 5), NOW)!
    expect(p.jour).toBe('2026-09-28')
  })
})

describe('arrangerPlan', () => {
  const s = (extra: Partial<Session>): Session => ({
    day: 0,
    type: 'ef',
    title: '',
    cat: '',
    note: '',
    ...extra,
  })
  const weeks: Week[] = [
    {
      n: 1,
      bloc: 'A',
      blocName: '',
      monday: '2026-09-07',
      deload: false,
      sl: 24,
      efKm: 7,
      sessions: [s({ day: 0, type: 'long', dist: 24 }), s({ day: 1, type: 'ef', dist: 7 })],
    },
  ]

  it('donne la date réelle de chaque séance, écart compris', () => {
    const ecarts = indexerEcarts([
      { week: 1, day_index: 0, slot: 0, patch: { day: 2 }, reason: null } as EcartRow,
    ])
    const out = arrangerPlan(weeks, ecarts)
    const longue = out.find((x) => x.type === 'long')!
    expect(longue.day).toBe('2026-09-09')
    expect(longue.jourOrigine).toBe(0)
  })

  it('trie par date, pas par ordre de déclaration', () => {
    const ecarts = indexerEcarts([
      { week: 1, day_index: 0, slot: 0, patch: { day: 4 }, reason: null } as EcartRow,
    ])
    const out = arrangerPlan(weeks, ecarts)
    expect(out.map((x) => x.type)).toEqual(['ef', 'long'])
  })
})

describe('le palier de la séance spécifique du jeudi', () => {
  /** Deux jeudis spécifiques, le second plus long que le premier. */
  const seances = (): SeanceArrangee[] => [
    {
      week: 11, jourOrigine: 3, slot: 0, day: '2026-10-22', type: 'tempo', dist: 7,
      saute: false, specifique: true,
      source: { day: 3, type: 'tempo', title: '3 x 1000 m allure 10 km', cat: 'Tempo',
        dist: 7, main: [['3 x 1000 m', 'seuil']], note: '', specifique: true } as unknown as Session,
    },
    {
      week: 12, jourOrigine: 3, slot: 0, day: '2026-10-29', type: 'tempo', dist: 8,
      saute: false, specifique: true,
      source: { day: 3, type: 'tempo', title: '4 x 1000 m allure 10 km', cat: 'Tempo',
        dist: 8, main: [['4 x 1000 m', 'seuil']], note: '', specifique: true } as unknown as Session,
    },
  ]
  const notee = (pain: number): FeedbackRow[] => [
    { week: 11, day_index: 3, slot: 0, day: '2026-10-22', session_type: 'tempo', pain, rpe: 7 } as FeedbackRow,
  ]
  /** Carnet calme sur la base, avec la raideur du lendemain au choix. */
  const carnet = (lendemain: number | null): PainMap => {
    const p: PainMap = {}
    for (let k = 1; k <= 8; k++) p[addDays('2026-10-22', -k)] = { wake: 1 }
    if (lendemain != null) p['2026-10-23'] = { wake: lendemain }
    return p
  }

  it('ne plafonne rien quand la séance est passée', () => {
    expect(palierProchaineSpecifique(seances(), notee(3), carnet(1), '2026-10-26')).toBeNull()
  })

  it('répète la précédente quand le lendemain est raide', () => {
    const p = palierProchaineSpecifique(seances(), notee(3), carnet(5), '2026-10-26')
    expect(p).not.toBeNull()
    expect(p!.jour).toBe('2026-10-29')
    expect(p!.modele.title).toBe('3 x 1000 m allure 10 km')
    expect(p!.raison).toContain('Raideur')
  })

  it('plafonne aussi quand la raideur du lendemain n’est pas saisie', () => {
    // On ne dégrade pas sur une absence d'information, on refuse de monter.
    const p = palierProchaineSpecifique(seances(), notee(3), carnet(null), '2026-10-26')
    expect(p).not.toBeNull()
    expect(p!.raison).toContain('non saisie')
  })

  it('la séance répétée porte le contenu de la précédente, pas son kilométrage seul', () => {
    const p = palierProchaineSpecifique(seances(), notee(3), carnet(5), '2026-10-26')!
    const vecue = appliquerPalierSpecifique(seances()[1].source!, p)
    expect(vecue.title).toBe('3 x 1000 m allure 10 km')
    expect(vecue.dist).toBe(7)
    expect(vecue.main).toEqual([['3 x 1000 m', 'seuil']])
    expect(vecue.adapted).toContain('Palier tenu')
  })

  it('ne touche pas la sortie longue, et réciproquement', () => {
    // Les deux familles se suivent séparément : une longue douloureuse ne
    // plafonne pas la séance du jeudi, qui n'a rien à voir avec elle.
    const avecLongue: SeanceArrangee[] = [
      ...seances(),
      { week: 11, jourOrigine: 0, slot: 0, day: '2026-10-19', type: 'long', dist: 28, saute: false },
    ]
    expect(palierProchaineSpecifique(avecLongue, notee(3), carnet(1), '2026-10-26')).toBeNull()
  })
})
