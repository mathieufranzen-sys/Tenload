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

import {
  HEURE_BILAN,
  ajouterJours,
  messageBilan,
  semaineDuPlan,
} from '../../supabase/functions/rappels/logique'

describe('le bilan du dimanche', () => {
  // Dimanche 20 septembre 2026 : fin de la semaine 6.
  const DIMANCHE = '2026-09-20'
  const releve = (k: number, pain_wake: number | null, eccentric = false) => ({
    day: ajouterJours(DIMANCHE, -k),
    pain_wake,
    eccentric,
  })

  it('part à 20 h, pas avec le point du soir', () => {
    expect(HEURE_BILAN).toBe(20)
  })

  it('situe la date dans le plan', () => {
    expect(semaineDuPlan('2026-08-10')).toBe(1)
    expect(semaineDuPlan(DIMANCHE)).toBe(6)
    expect(semaineDuPlan('2027-04-11')).toBe(35)
    expect(semaineDuPlan('2026-08-09')).toBeNull()
    expect(semaineDuPlan('2027-04-12')).toBeNull()
  })

  it('résume la semaine et compare la raideur à la précédente', () => {
    const releves = [
      releve(0, 1, true), releve(1, 1), releve(2, 1.5, true),
      releve(7, 2), releve(8, 2), releve(9, 2),
    ]
    const m = messageBilan(DIMANCHE, { notees: 5, sautees: 1, releves })!
    expect(m.titre).toBe('Bilan de la semaine 6')
    expect(m.corps).toBe(
      '5 séances notées, 1 sautée. Raideur au réveil à 1,2, contre 2 la semaine d’avant. Excentrique 2 jours sur 7. La charge et la semaine prochaine sont dans l’app.',
    )
    expect(m.tag).toBe('tenload-bilan')
  })

  it('ne donne pas de moyenne sous trois matins', () => {
    const m = messageBilan(DIMANCHE, { notees: 2, sautees: 0, releves: [releve(0, 1), releve(1, 1)] })!
    expect(m.corps).not.toContain('Raideur')
  })

  it('se tait un autre jour que le dimanche', () => {
    expect(messageBilan('2026-09-19', { notees: 5, sautees: 0, releves: [] })).toBeNull()
  })

  it('se tait sur une semaine sans aucune trace', () => {
    expect(messageBilan(DIMANCHE, { notees: 0, sautees: 0, releves: [] })).toBeNull()
  })

  it('se tait hors du plan', () => {
    expect(messageBilan('2027-04-18', { notees: 5, sautees: 0, releves: [] })).toBeNull()
  })
})
