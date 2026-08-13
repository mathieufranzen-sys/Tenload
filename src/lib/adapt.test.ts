import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { adapt, applyFx, fxForDate, weekSessions, type Fx } from './adapt'
import type { LoadMap, PainMap } from './tendonIndex'
import type { Session, Week } from '../data/types'
import type { FeedbackRow } from './buildPain'

const NOW = '2026-09-01'

const seance = (extra: Partial<Session>): Session => ({
  day: 0,
  type: 'ef',
  title: 'Endurance facile',
  cat: 'Course',
  note: '',
  ...extra,
})

const FX_ORANGE: Fx = {
  slCut: 0.2,
  qualityToBike: true,
  cancelQuality: false,
  tuesdayToBike: false,
  runStop: false,
  legStop: false,
  lightLegs: true,
  idx: 55,
  band: { key: 'orange', max: 64, name: 'Orange', color: '#ec835a', headline: '', detail: '' },
}
const FX_ROUGE: Fx = {
  slCut: 0,
  qualityToBike: false,
  cancelQuality: true,
  tuesdayToBike: true,
  runStop: true,
  legStop: false,
  lightLegs: true,
  idx: 70,
  band: { key: 'rouge', max: 79, name: 'Rouge', color: '#d03b3b', headline: '', detail: '' },
}
const FX_NOIR: Fx = {
  slCut: 0,
  qualityToBike: false,
  cancelQuality: true,
  tuesdayToBike: true,
  runStop: true,
  legStop: true,
  lightLegs: false,
  idx: 85,
  band: { key: 'noir', max: 100, name: 'Noir', color: '#8B1A1A', headline: '', detail: '' },
}
const FX_AUCUN: Fx = {
  slCut: 0,
  qualityToBike: false,
  cancelQuality: false,
  tuesdayToBike: false,
  runStop: false,
  legStop: false,
  lightLegs: false,
  idx: 10,
  band: { key: 'vert', max: 29, name: 'Vert', color: '#0ca30c', headline: '', detail: '' },
}

describe('fxForDate', () => {
  const byDate = { [NOW]: { idx: 55 } as never, [addDays(NOW, 5)]: { idx: 70 } as never }

  it('ne renvoie aucun effet dans le passé', () => {
    expect(fxForDate(addDays(NOW, -1), NOW, byDate).band).toBeNull()
  })

  it('ne renvoie aucun effet au-delà de dix jours', () => {
    expect(fxForDate(addDays(NOW, 11), NOW, byDate).band).toBeNull()
  })

  it('lit la bande projetée du jour demandé, pas celle du jour courant', () => {
    expect(fxForDate(addDays(NOW, 5), NOW, byDate).band?.key).toBe('rouge')
    expect(fxForDate(NOW, NOW, byDate).band?.key).toBe('orange')
  })

  it('vert et jaune ne portent aucun effet', () => {
    const fx = fxForDate(NOW, NOW, { [NOW]: { idx: 10 } as never })
    expect(fx).toMatchObject({ slCut: 0, runStop: false, legStop: false, qualityToBike: false })
  })
})

describe('applyFx', () => {
  it('orange raccourcit la sortie longue de 20 %', () => {
    const s = seance({ type: 'long', dist: 25, title: 'Sortie longue' })
    const r = applyFx(s, FX_ORANGE)
    expect(r.dist).toBe(20)
    expect(r.struct).toEqual([{ km: 20, zone: 'ef' }])
    expect(r.adapted).toContain('20 %')
  })

  it('orange bascule la qualité sur du vélo Z3, pas Z2', () => {
    const r = applyFx(seance({ type: 'tempo' }), FX_ORANGE)
    expect(r.type).toBe('velo')
    expect(r.title).toContain('Z3')
  })

  it('orange allège le renfo bas sans le supprimer', () => {
    const r = applyFx(seance({ type: 'muscu-bas', ex: [['Squat', '3x10', '']] }), FX_ORANGE)
    expect(r.type).toBe('muscu-bas')
    expect(r.ex?.[0][0]).toBe('Stanish unilatéral')
  })

  it('rouge arrête la course et bascule sur du vélo Z2, sans garder le kilométrage', () => {
    const r = applyFx(seance({ type: 'ef', dist: 10 }), FX_ROUGE)
    expect(r.type).toBe('velo')
    expect(r.dist).toBeUndefined()
    expect(r.title).toContain('Z2')
  })

  it('rouge annule la qualité complètement (Z2, pas Z3)', () => {
    const r = applyFx(seance({ type: 'inter' }), FX_ROUGE)
    expect(r.title).toContain('Z2')
  })

  it('rouge et noir arrêtent la course tous les jours, mardi compris : runStop l’emporte sur tuesdayToBike', () => {
    const r = applyFx(seance({ type: 'ef', day: 1, dist: 10 }), FX_ROUGE)
    expect(r.type).toBe('velo')
    expect(r.title).toContain('la course')
  })

  it('tuesdayToBike seul (sans runStop) donne le message spécifique du mardi', () => {
    // Combinaison qu'aucune bande ne produit aujourd'hui via fxForDate — runStop
    // est toujours vrai en même temps que tuesdayToBike — mais applyFx doit
    // rester correct si un jour une bande intermédiaire l'isole.
    const fx: Fx = { ...FX_AUCUN, tuesdayToBike: true }
    const r = applyFx(seance({ type: 'ef', day: 1, dist: 10 }), fx)
    expect(r.type).toBe('velo')
    expect(r.title).toContain('EF')
    expect(r.dist).toBeUndefined()
  })

  it('tuesdayToBike ne touche pas l’EF d’un autre jour que le mardi', () => {
    const fx: Fx = { ...FX_AUCUN, tuesdayToBike: true }
    const r = applyFx(seance({ type: 'ef', day: 4 }), fx)
    expect(r.type).toBe('ef')
  })

  it('noir impose repos complet sur toute séance jambes', () => {
    const r = applyFx(seance({ type: 'long', dist: 25 }), FX_NOIR)
    expect(r.type).toBe('repos')
    expect(r.dist).toBeUndefined()
    expect(r.dur).toBeNull()
  })

  it('noir ne touche pas le renfo haut du corps', () => {
    const r = applyFx(seance({ type: 'muscu-haut' }), FX_NOIR)
    expect(r.type).toBe('muscu-haut')
  })

  it('aucun effet ne change rien à la séance', () => {
    const s = seance({ type: 'long', dist: 25 })
    expect(applyFx(s, FX_AUCUN)).toEqual(s)
  })

  it('ne mute jamais la séance d’origine', () => {
    const s = seance({ type: 'long', dist: 25 })
    applyFx(s, FX_ORANGE)
    expect(s.dist).toBe(25)
    expect(s.adapted).toBeUndefined()
  })
})

describe('weekSessions', () => {
  it('applique un effet différent à chaque jour selon son propre indice projeté', () => {
    const week: Week = {
      n: 1,
      bloc: 'A',
      blocName: '',
      monday: NOW,
      deload: false,
      sl: 25,
      efKm: 8,
      sessions: [
        seance({ day: 0, type: 'long', dist: 25 }),
        seance({ day: 3, type: 'tempo' }),
      ],
    }
    const byDate = {
      [NOW]: { idx: 55 } as never,
      [addDays(NOW, 3)]: { idx: 10 } as never,
    }
    const [lundi, jeudi] = weekSessions(week, NOW, byDate)
    expect(lundi.dist).toBe(20) // orange
    expect(jeudi.type).toBe('tempo') // vert, inchangé
  })
})

describe('adapt', () => {
  const load: LoadMap = {}
  const pain: PainMap = {}

  it('bande verte : aucune règle IDX, niveau 0', () => {
    const r = adapt(load, pain, [], NOW)
    expect(r.level).toBe(0)
    expect(r.rules.find((x) => x.id === 'IDX')).toBeUndefined()
  })

  it('ALLURES se déclenche sur deux qualités à 9+ sans douleur', () => {
    const feedback: FeedbackRow[] = [
      { week: 1, day_index: 5, slot: 0, day: NOW, session_type: 'tempo', pain: 1, rpe: 9 },
      {
        week: 1,
        day_index: 5,
        slot: 0,
        day: addDays(NOW, -7),
        session_type: 'inter',
        pain: 2,
        rpe: 10,
      },
    ]
    const r = adapt(load, pain, feedback, NOW)
    expect(r.rules.some((x) => x.id === 'ALLURES')).toBe(true)
  })

  it('ALLURES ne se déclenche pas si une douleur dépasse 4', () => {
    const feedback: FeedbackRow[] = [
      { week: 1, day_index: 5, slot: 0, day: NOW, session_type: 'tempo', pain: 5, rpe: 9 },
      {
        week: 1,
        day_index: 5,
        slot: 0,
        day: addDays(NOW, -7),
        session_type: 'inter',
        pain: 2,
        rpe: 10,
      },
    ]
    const r = adapt(load, pain, feedback, NOW)
    expect(r.rules.some((x) => x.id === 'ALLURES')).toBe(false)
  })

  it('compte le nombre de ressentis enregistrés dans n', () => {
    const feedback: FeedbackRow[] = [
      { week: 1, day_index: 0, slot: 0, day: NOW, session_type: 'ef', pain: 1, rpe: 4 },
    ]
    expect(adapt(load, pain, feedback, NOW).n).toBe(1)
  })
})
