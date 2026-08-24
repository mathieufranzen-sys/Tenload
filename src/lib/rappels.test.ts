/**
 * La décision des rappels, testée depuis l'app : le code testé vit dans
 * l'Edge Function, mais il est en TypeScript nu justement pour ça.
 */
import { describe, expect, it } from 'vitest'
import {
  enumerer,
  estDimanche,
  manquantsDuSoir,
  messageDuMoment,
  momentParis,
} from '../../supabase/functions/rappels/logique'

describe('momentParis', () => {
  it('lit l’heure de Paris en heure d’été', () => {
    // 23 août : CEST, UTC+2.
    expect(momentParis(new Date('2026-08-23T06:30:00Z'))).toEqual({ heure: 8, jour: '2026-08-23' })
  })

  it('la lit aussi en heure d’hiver', () => {
    // 15 janvier : CET, UTC+1. C'est toute la raison du cron horaire.
    expect(momentParis(new Date('2027-01-15T07:30:00Z'))).toEqual({ heure: 8, jour: '2027-01-15' })
  })

  it('donne le jour de Paris et non celui d’UTC', () => {
    // 22 h 30 UTC un 23 août, c'est déjà le 24 à Paris.
    expect(momentParis(new Date('2026-08-23T22:30:00Z'))).toEqual({ heure: 0, jour: '2026-08-24' })
  })
})

describe('estDimanche', () => {
  it('reconnaît le repos jambes', () => {
    expect(estDimanche('2026-08-23')).toBe(true)
    expect(estDimanche('2026-08-24')).toBe(false)
  })
})

describe('enumerer', () => {
  it('assemble à la française', () => {
    expect(enumerer([])).toBe('')
    expect(enumerer(['a'])).toBe('a')
    expect(enumerer(['a', 'b'])).toBe('a et b')
    expect(enumerer(['a', 'b', 'c'])).toBe('a, b et c')
  })
})

describe('manquantsDuSoir', () => {
  const vide = { pain_wake: null, pain_evening: null }

  it('demande les trois curseurs quand rien n’est saisi', () => {
    expect(manquantsDuSoir(vide, false, true)).toEqual([
      'ton effort perçu',
      'ta douleur à l’effort',
      'ta douleur de fin de journée',
    ])
  })

  it('ne demande pas la séance le dimanche', () => {
    expect(manquantsDuSoir(vide, false, false)).toEqual(['ta douleur de fin de journée'])
  })

  it('se tait quand tout est saisi', () => {
    expect(manquantsDuSoir({ pain_wake: 1, pain_evening: 2 }, true, true)).toEqual([])
  })

  it('compte un zéro comme une mesure', () => {
    // Zéro n'est pas l'absence : redemander une valeur déjà donnée est
    // exactement ce qui fait couper les notifications.
    expect(manquantsDuSoir({ pain_wake: 0, pain_evening: 0 }, true, true)).toEqual([])
  })
})

describe('messageDuMoment', () => {
  const vide = { pain_wake: null, pain_evening: null }

  it('rappelle la raideur à 8 h si elle manque', () => {
    expect(messageDuMoment(8, '2026-08-24', vide, false)?.tag).toBe('tenload-matin')
  })

  it('se tait à 8 h si la raideur est déjà là', () => {
    expect(messageDuMoment(8, '2026-08-24', { pain_wake: 2, pain_evening: null }, false)).toBeNull()
  })

  it('énumère ce qui manque à 23 h', () => {
    const m = messageDuMoment(23, '2026-08-24', vide, false)
    expect(m?.corps).toBe(
      'Il reste ton effort perçu, ta douleur à l’effort et ta douleur de fin de journée.',
    )
  })

  it('ne parle que du soir quand la séance est notée', () => {
    const m = messageDuMoment(23, '2026-08-24', vide, true)
    expect(m?.corps).toBe('Il reste ta douleur de fin de journée.')
  })

  it('se tait à toute autre heure', () => {
    for (const h of [0, 7, 9, 12, 22]) {
      expect(messageDuMoment(h, '2026-08-24', vide, false)).toBeNull()
    }
  })
})
