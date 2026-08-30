/**
 * Le calcul doit rester juste où que soit la séance.
 *
 * Mathieu déplace souvent ses séances. Le moteur raisonnait sur la semaine
 * TYPE — la sortie longue le lundi, l'EF le mardi — au lieu de la semaine
 * réelle. Cette batterie balaie les sept jours pour chaque règle sensible.
 */
import { describe, expect, it } from 'vitest'
import { seancesDeLaSemaine, weekSessions } from './adapt'
import { ciblesPossibles } from '../components/VueCalendrier'
import { addDays } from './dates'
import { indexerEcarts, type EcartRow } from './overrides'
import type { Session, Week } from '../data/types'
import type { IndexBreakdown } from './tendonIndex'

const LUNDI = '2026-09-07'
const JOURS = [0, 1, 2, 3, 4, 5, 6] as const

const seance = (extra: Partial<Session>): Session => ({
  day: 0,
  type: 'ef',
  title: 'Séance',
  cat: 'Course',
  note: '',
  ...extra,
})

/** Une semaine type réduite à ce qui compte ici. */
const semaine = (sessions: Session[]): Week => ({
  n: 3,
  bloc: 'A',
  blocName: '',
  monday: LUNDI,
  deload: false,
  sl: 24,
  efKm: 7,
  sessions,
})

/** Le même indice pour toute la fenêtre : on isole l'effet du placement. */
const indice = (idx: number): Record<string, IndexBreakdown> =>
  Object.fromEntries(
    Array.from({ length: 14 }, (_, k) => [addDays(LUNDI, k - 3), { idx } as never]),
  )

const ecart = (jour: number, patch: Record<string, unknown>): Map<string, EcartRow> =>
  indexerEcarts([{ week: 3, day_index: jour, slot: 0, patch, reason: null } as EcartRow])

describe('la coupe de la sortie longue suit la séance, quel que soit le jour', () => {
  it.each(JOURS)('sortie longue déplacée au jour %i', (jour) => {
    const w = semaine([seance({ day: 0, type: 'long', dist: 24, title: 'Sortie longue de 24 km' })])
    const out = weekSessions(w, addDays(LUNDI, -1), indice(55), ecart(0, { day: jour }))
    expect(out[0].day).toBe(addDays(LUNDI, jour))
    // Orange coupe 20 % où qu'elle soit : 24 → 19.
    expect(out[0].s.dist).toBe(19)
  })
})

describe('le lendemain de la sortie longue se calcule sur la semaine réelle', () => {
  // Une bande rouge pose tuesdayToBike ; mais rouge pose aussi runStop, qui
  // bascule toute course en vélo. On isole donc la règle du lendemain sur
  // l'orange, où seule la coupe s'applique, en vérifiant l'inverse : l'EF
  // n'est PAS touchée par la règle du mardi quand elle n'est pas le lendemain.
  it.each([1, 2, 3, 4, 5])('sortie longue au jour 0, EF déplacée au jour %i', (jour) => {
    const w = semaine([
      seance({ day: 0, type: 'long', dist: 24 }),
      seance({ day: 1, type: 'ef', dist: 7 }),
    ])
    const out = weekSessions(w, addDays(LUNDI, -1), indice(10), ecart(1, { day: jour }))
    const ef = out.find((x) => x.jourOrigine === 1)!
    expect(ef.day).toBe(addDays(LUNDI, jour))
    // Indice vert : rien ne change, où que soit la séance.
    expect(ef.s.type).toBe('ef')
    expect(ef.s.dist).toBe(7)
  })

  it('la sortie longue déplacée au mardi rend le mercredi lendemain, pas le mardi', () => {
    const w = semaine([
      seance({ day: 0, type: 'long', dist: 24 }),
      seance({ day: 1, type: 'ef', dist: 7 }),
      seance({ day: 2, type: 'escalade' }),
    ])
    // La longue passe au mardi, l'EF au mercredi : la disposition de Mathieu.
    const ecarts = indexerEcarts([
      { week: 3, day_index: 0, slot: 0, patch: { day: 1 }, reason: null } as EcartRow,
      { week: 3, day_index: 1, slot: 0, patch: { day: 2 }, reason: null } as EcartRow,
    ])
    const out = weekSessions(w, addDays(LUNDI, -1), indice(70), ecarts)
    const longue = out.find((x) => x.jourOrigine === 0)!
    const ef = out.find((x) => x.jourOrigine === 1)!
    expect(longue.day).toBe(addDays(LUNDI, 1))
    expect(ef.day).toBe(addDays(LUNDI, 2))
    // Rouge : la course s'arrête partout, l'EF devient du vélo quoi qu'il arrive.
    expect(ef.s.type).toBe('velo')
  })
})

describe('une séance déjà notée est figée', () => {
  const cle = '3-0-0'

  it('n’est plus raccourcie par l’indice, quel que soit son jour', () => {
    for (const jour of JOURS) {
      const w = semaine([seance({ day: 0, type: 'long', dist: 24, title: 'Sortie longue de 24 km' })])
      const out = weekSessions(w, addDays(LUNDI, jour), indice(55), ecart(0, { day: jour }), {
        faites: new Set([cle]),
      })
      expect(out[0].s.dist).toBe(24)
      expect(out[0].s.adapted).toBeUndefined()
    }
  })

  it('sans le gel, la même séance se ferait réécrire le jour même', () => {
    // C'est le bug : la séance est faite, notée le soir, et le ressenti qu'on
    // vient d'en saisir la raccourcit rétroactivement.
    const w = semaine([seance({ day: 0, type: 'long', dist: 24 })])
    const out = weekSessions(w, addDays(LUNDI, 1), indice(55), ecart(0, { day: 1 }))
    expect(out[0].s.dist).toBe(19)
  })

  it('le gel ne déborde pas sur les autres séances de la semaine', () => {
    const w = semaine([
      seance({ day: 0, type: 'long', dist: 24 }),
      seance({ day: 5, type: 'tempo' }),
    ])
    const out = weekSessions(w, LUNDI, indice(55), undefined, { faites: new Set([cle]) })
    expect(out[0].s.dist).toBe(24) // figée
    expect(out[1].s.type).toBe('velo') // toujours adaptée
  })
})

describe('le palier plafonne la prochaine longue, où qu’elle soit', () => {
  const palier = { jour: '', km: 24, raison: 'Raideur 5/10 au réveil le lendemain' }

  it.each(JOURS)('longue déplacée au jour %i', (jour) => {
    const w = semaine([seance({ day: 0, type: 'long', dist: 26, title: 'Sortie longue de 26 km' })])
    const out = weekSessions(w, addDays(LUNDI, -1), indice(10), ecart(0, { day: jour }), {
      palier: { ...palier, jour: addDays(LUNDI, jour) },
    })
    expect(out[0].s.dist).toBe(24)
    expect(out[0].s.title).toBe('Sortie longue de 24 km')
    expect(out[0].s.adapted).toContain('Palier tenu')
  })

  it('la coupe de l’indice mord sur la distance déjà plafonnée', () => {
    // Orange après palier : 26 → 24 (palier) → 19 (−20 %), pas 26 → 21.
    const w = semaine([seance({ day: 0, type: 'long', dist: 26 })])
    const out = weekSessions(w, addDays(LUNDI, -1), indice(55), undefined, {
      palier: { ...palier, jour: LUNDI },
    })
    expect(out[0].s.dist).toBe(19)
  })

  it('ne touche pas une séance déjà notée', () => {
    const w = semaine([seance({ day: 0, type: 'long', dist: 26 })])
    const out = weekSessions(w, addDays(LUNDI, -1), indice(10), undefined, {
      faites: new Set(['3-0-0']),
      palier: { ...palier, jour: LUNDI },
    })
    expect(out[0].s.dist).toBe(26)
  })
})

describe('un écart peut franchir la frontière du dimanche', () => {
  const deuxSemaines = (): Week[] => [
    { ...semaine([seance({ day: 4, type: 'velo' })]), n: 3, monday: LUNDI },
    { ...semaine([seance({ day: 3, type: 'muscu-bas' })]), n: 4, monday: addDays(LUNDI, 7) },
  ]

  it('pousse la séance de sept jours par semaine de décalage', () => {
    const [w] = deuxSemaines()
    const out = weekSessions(w, LUNDI, indice(10), ecart(4, { day: 3, semaines: 1 }))
    expect(out[0].day).toBe(addDays(LUNDI, 10))
    // La clé Supabase ne bouge pas : c'est ce qui garde l'écriture rejouable.
    expect(out[0].semaineOrigine).toBe(3)
    expect(out[0].jourOrigine).toBe(4)
  })

  it('la ramène aussi d’une semaine en arrière', () => {
    const [w] = deuxSemaines()
    const out = weekSessions(w, LUNDI, indice(10), ecart(4, { day: 6, semaines: -1 }))
    expect(out[0].day).toBe(addDays(LUNDI, -1))
  })

  it('la semaine d’accueil la voit, la semaine d’origine ne la voit plus', () => {
    const weeks = deuxSemaines()
    const ecarts = ecart(4, { day: 3, semaines: 1 })
    const s3 = seancesDeLaSemaine(weeks, weeks[0], LUNDI, indice(10), ecarts)
    const s4 = seancesDeLaSemaine(weeks, weeks[1], LUNDI, indice(10), ecarts)
    expect(s3.map((x) => x.s.type)).toEqual([])
    expect(s4.map((x) => x.s.type).sort()).toEqual(['muscu-bas', 'velo'])
  })

  it('sans écart, chaque semaine ne voit que la sienne', () => {
    const weeks = deuxSemaines()
    expect(seancesDeLaSemaine(weeks, weeks[0], LUNDI, indice(10)).map((x) => x.s.type)).toEqual([
      'velo',
    ])
  })
})

describe('ciblesPossibles', () => {
  const weeks: Week[] = [
    { ...semaine([seance({ day: 0, type: 'ef', dist: 7 })]), n: 2, monday: addDays(LUNDI, -7) },
    {
      ...semaine([
        seance({ day: 1, type: 'ef', dist: 7 }),
        seance({ day: 2, type: 'escalade' }),
      ]),
      n: 3,
      monday: LUNDI,
    },
    { ...semaine([seance({ day: 0, type: 'long', dist: 24 })]), n: 4, monday: addDays(LUNDI, 7) },
  ]
  const prise = weekSessions(weeks[1], LUNDI, indice(10))[0]

  it('ouvre les trois semaines, et seulement elles', () => {
    const c = ciblesPossibles(weeks, prise)
    expect(c.size).toBe(21)
    expect(c.get(addDays(LUNDI, -7))?.semaines).toBe(-1)
    expect(c.get(LUNDI)?.semaines).toBe(0)
    expect(c.get(addDays(LUNDI, 7))?.semaines).toBe(1)
  })

  it('signale le mercredi d’escalade comme conflit, sans l’interdire', () => {
    const c = ciblesPossibles(weeks, prise)
    const mercredi = c.get(addDays(LUNDI, 2))!
    expect(mercredi.conflits.length).toBeGreaterThan(0)
    expect(mercredi.conflits[0]).toContain('mercredi')
    // La cible existe quand même : on avertit, on ne bloque pas.
    expect(mercredi.jour).toBe(2)
  })

  it('ne signale rien sur un jour libre de la même semaine', () => {
    const c = ciblesPossibles(weeks, prise)
    expect(c.get(addDays(LUNDI, 3))?.conflits).toEqual([])
  })
})

describe('le slot reste le rang dans la journée après déplacement', () => {
  it('deux séances le même jour gardent des slots distincts', () => {
    const w = semaine([
      seance({ day: 1, type: 'ef' }),
      seance({ day: 1, type: 'muscu-haut' }),
      seance({ day: 3, type: 'muscu-bas' }),
    ])
    // On déplace la muscu-bas du jeudi au mardi : elle rejoint deux séances.
    const out = weekSessions(w, LUNDI, indice(10), ecart(3, { day: 1 }))
    expect(out.map((x) => x.slot)).toEqual([0, 1, 0])
    expect(out.map((x) => x.jourOrigine)).toEqual([1, 1, 3])
    expect(out.map((x) => x.day)).toEqual([
      addDays(LUNDI, 1),
      addDays(LUNDI, 1),
      addDays(LUNDI, 1),
    ])
  })
})
