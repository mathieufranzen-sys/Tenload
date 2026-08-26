import { describe, expect, it } from 'vitest'
import type { FeedbackRow } from './buildPain'
import { addDays } from './dates'
import {
  HAUSSE_TOLEREE,
  arrangerPlan,
  baseRaideur,
  palierProchaineLongue,
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
