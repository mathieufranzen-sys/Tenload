import { describe, expect, it } from 'vitest'
import planJson from '../data/plan.json'
import { sessionLoad } from './load'
import type { Plan, Session, SessionType } from '../data/types'
import {
  alertesAjoutees,
  appliquerEcart,
  cleEcart,
  indexerEcarts,
  seancesAvecEcarts,
  titreQualite,
  verifierContraintes,
  type EcartRow,
} from './overrides'

const plan = planJson as unknown as Plan

/** Séance minimale, pour composer des semaines de test lisibles. */
const seance = (day: number, type: SessionType, extra: Partial<Session> = {}): Session => ({
  day,
  type,
  title: type,
  cat: type,
  note: '',
  ...extra,
})

describe('appliquerEcart', () => {
  it('ne mute pas la séance d’origine', () => {
    const s = seance(0, 'long', { dist: 26 })
    appliquerEcart(s, { dist: 18, day: 3 })
    expect(s.dist).toBe(26)
    expect(s.day).toBe(0)
  })

  it('marque une séance sautée sans la faire disparaître', () => {
    const out = appliquerEcart(seance(0, 'long', { dist: 26 }), { skipped: true })
    expect(out.saute).toBe(true)
    expect(out.type).toBe('long')
    expect(out.dist).toBe(26)
    expect(out.ecart).toContain('non faite')
  })

  it('efface le kilométrage et la structure quand la discipline change', () => {
    const s = seance(0, 'long', { dist: 26, struct: [{ km: 26, zone: 'ef' }] })
    const out = appliquerEcart(s, { type: 'velo' })
    expect(out.type).toBe('velo')
    expect(out.cat).toBe('Vélo')
    // Une sortie longue devenue vélo ne doit pas afficher « Vélo · 26 km ».
    expect(out.dist).toBeUndefined()
    expect(out.struct).toBeNull()
  })

  it('efface les exercices quand un renfo devient autre chose', () => {
    const s = seance(3, 'muscu-bas', { ex: [['Stanish', '3 x 10', '']] })
    expect(appliquerEcart(s, { type: 'repos' }).ex).toBeNull()
  })

  it('déplace la séance en changeant son jour', () => {
    const out = appliquerEcart(seance(5, 'tempo'), { day: 3 })
    expect(out.day).toBe(3)
    // Le badge rappelle le jour d'ORIGINE, pas le jour d'arrivée.
    expect(out.ecart).toContain('initialement samedi')
    expect(out.ecart).not.toContain('jeudi')
  })

  it('remplace la distance et la durée par les valeurs réelles', () => {
    const out = appliquerEcart(seance(0, 'long', { dist: 26 }), { dist: 18, durMin: 95 })
    expect(out.dist).toBe(18)
    expect(out.dur).toEqual([95, 95])
  })

  it('cumule plusieurs changements dans un seul libellé', () => {
    const out = appliquerEcart(seance(5, 'inter', { cat: 'Intervalles' }), { type: 'velo', day: 4 })
    expect(out.ecart).toContain('initialement intervalles')
    expect(out.ecart).toContain('initialement samedi')
  })

  it('rappelle la distance d’origine, pas la distance réelle', () => {
    const out = appliquerEcart(seance(0, 'long', { dist: 26 }), { dist: 18 })
    expect(out.dist).toBe(18)
    expect(out.ecart).toContain('initialement 26 km')
  })
})

describe('cleEcart et indexerEcarts', () => {
  it('indexe sur le jour d’origine, pas sur le jour d’arrivée', () => {
    const e: EcartRow = { week: 3, day_index: 5, slot: 0, patch: { day: 4 }, reason: null }
    const idx = indexerEcarts([e])
    // La clé doit rester celle du samedi d'origine : c'est elle qui relie
    // l'écart et le ressenti déjà enregistrés à la séance du plan.
    expect(idx.get(cleEcart(3, 5, 0))).toBe(e)
    expect(idx.get(cleEcart(3, 4, 0))).toBeUndefined()
  })
})

describe('seancesAvecEcarts', () => {
  it('laisse la semaine intacte quand il n’y a aucun écart', () => {
    const w = plan.weeks[10]
    expect(seancesAvecEcarts(w, new Map())).toEqual(w.sessions)
  })

  it('n’applique l’écart qu’à la séance visée', () => {
    const w = plan.weeks[10]
    const cible = w.sessions[0]
    const out = seancesAvecEcarts(
      w,
      indexerEcarts([
        { week: w.n, day_index: cible.day, slot: 0, patch: { skipped: true }, reason: null },
      ]),
    )
    expect(out[0].saute).toBe(true)
    expect(out.filter((s) => s.saute)).toHaveLength(1)
  })
})

describe('verifierContraintes', () => {
  it('ne dit rien sur le plan de référence', () => {
    // Les 35 semaines sont déjà validées par check_plan.py : si ce test casse,
    // c'est le contrôle qui a tort, pas le plan.
    //
    // Deux exceptions, les mêmes que dans check_plan.py : les semaines du
    // 20 km de Paris et du 10 km Hoka avancent leur séance de qualité au
    // mercredi, ce qui est un écart nommé et daté à la contrainte 2.
    const QUALITE_MERCREDI = new Set([9, 14])
    for (const w of plan.weeks) {
      const attendu = QUALITE_MERCREDI.has(w.n) ? [2] : []
      expect(verifierContraintes(w.sessions).map((a) => a.contrainte), `semaine ${w.n}`).toEqual(
        attendu,
      )
    }
  })

  it('C4 — accepte que le repos jambes tombe un autre jour que le dimanche', () => {
    // Semaine de course : le dimanche porte la course, le samedi porte le repos.
    const a = verifierContraintes([
      seance(0, 'long'),
      seance(2, 'escalade'),
      seance(5, 'repos'),
      seance(6, 'course'),
    ])
    expect(a.map((x) => x.contrainte)).not.toContain(4)
  })

  it('C4 — signale une semaine sans aucun jour de repos jambes', () => {
    const a = verifierContraintes(
      [0, 1, 2, 3, 4, 5, 6].map((d) => seance(d, d === 2 ? 'escalade' : 'velo')),
    )
    expect(a.map((x) => x.contrainte)).toContain(4)
  })

  it('C2 — signale une course le mercredi', () => {
    const a = verifierContraintes([seance(2, 'ef'), seance(2, 'escalade')])
    expect(a.map((x) => x.contrainte)).toContain(2)
  })

  it('C2 — signale un renfo haut du corps le mercredi', () => {
    const a = verifierContraintes([seance(2, 'muscu-haut'), seance(2, 'escalade')])
    expect(a.map((x) => x.contrainte)).toContain(2)
  })

  it('C3 — signale une qualité accolée à la sortie longue', () => {
    const a = verifierContraintes([seance(0, 'long'), seance(1, 'tempo')])
    expect(a.map((x) => x.contrainte)).toContain(3)
  })

  it('C3 — signale un renfo bas accolé à la sortie longue', () => {
    const a = verifierContraintes([seance(0, 'long'), seance(1, 'muscu-bas')])
    expect(a.map((x) => x.contrainte)).toContain(3)
  })


  it('C6 — tolère la paire lundi-mardi', () => {
    const a = verifierContraintes([seance(0, 'long'), seance(1, 'ef')])
    expect(a.map((x) => x.contrainte)).not.toContain(6)
  })

  it('C6 — signale deux courses consécutives ailleurs', () => {
    const a = verifierContraintes([seance(4, 'ef'), seance(5, 'tempo')])
    expect(a.map((x) => x.contrainte)).toContain(6)
  })

  it('une séance sautée ne déclenche aucune alerte', () => {
    const a = verifierContraintes([seance(2, 'ef', { saute: true }), seance(2, 'escalade')])
    expect(a).toEqual([])
  })
})

describe('alertesAjoutees', () => {
  it('ne renvoie que ce que l’écart introduit', () => {
    // Le mercredi porte déjà une course avant l'écart : seule la nouvelle
    // infraction du dimanche doit remonter. La semaine est pleine par ailleurs,
    // sinon le repos jambes se reporterait simplement sur un autre jour.
    const pleine = [0, 1, 3, 4, 5].map((d) => seance(d, 'velo'))
    const avant = [...pleine, seance(2, 'ef'), seance(6, 'repos')]
    const apres = [...pleine, seance(2, 'ef'), seance(6, 'velo')]
    const a = alertesAjoutees(avant, apres)
    expect(a).toHaveLength(1)
    expect(a[0].contrainte).toBe(4)
  })

  const s = (extra: Partial<Session>): Session => ({
    day: 0,
    type: 'ef',
    title: '',
    cat: '',
    note: '',
    ...extra,
  })

  describe('la contrainte 2 vise la séance d’escalade, pas le mercredi', () => {
    it('signale un renfo haut posé SUR l’escalade', () => {
      const a = verifierContraintes([s({ day: 2, type: 'escalade' }), s({ day: 2, type: 'muscu-haut' })])
      expect(a.map((x) => x.contrainte)).toContain(2)
    })

    it('signale aussi l’escalade posée SUR le renfo haut', () => {
      // Le cas qui manquait : la même collision, dans l'autre sens. Codée sur
      // le mercredi, la règle ne voyait que le premier.
      const a = verifierContraintes([s({ day: 1, type: 'muscu-haut' }), s({ day: 1, type: 'escalade' })])
      expect(a.map((x) => x.contrainte)).toContain(2)
    })

    it('suit l’escalade quand elle change de jour', () => {
      // Escalade au jeudi, course au jeudi : la règle doit viser le jeudi.
      const a = verifierContraintes([s({ day: 3, type: 'escalade' }), s({ day: 3, type: 'ef' })])
      expect(a.map((x) => x.texte).join(' ')).toContain('jeudi')
    })

    it('ne dit rien d’un mercredi sans escalade', () => {
      expect(verifierContraintes([s({ day: 2, type: 'muscu-haut' })])).toEqual([])
    })
  })

  describe('la contrainte 4 protège le jour de repos', () => {
    it('signale toute séance posée dessus, même sans les jambes', () => {
      const a = verifierContraintes([s({ day: 6, type: 'repos' }), s({ day: 6, type: 'muscu-haut' })])
      expect(a.map((x) => x.contrainte)).toContain(4)
      expect(a.map((x) => x.texte).join(' ')).toContain('jour de repos')
    })

    it('signale aussi une séance de jambes', () => {
      const a = verifierContraintes([s({ day: 6, type: 'repos' }), s({ day: 6, type: 'velo' })])
      expect(a.filter((x) => x.contrainte === 4).length).toBeGreaterThan(0)
    })

    it('laisse le jour de repos tranquille quand il l’est', () => {
      expect(verifierContraintes([s({ day: 6, type: 'repos' })])).toEqual([])
    })
  })

  describe('deux séances de course le même jour', () => {
    it('sont signalées', () => {
      const a = verifierContraintes([
        s({ day: 3, type: 'ef', dist: 7 }),
        s({ day: 3, type: 'tempo', dist: 9 }),
      ])
      expect(a.map((x) => x.contrainte)).toContain(6)
      expect(a.map((x) => x.texte).join(' ')).toContain('même jour')
    })

    it('une seule course ne l’est pas', () => {
      expect(verifierContraintes([s({ day: 3, type: 'ef' }), s({ day: 3, type: 'muscu-bas' })])).toEqual([])
    })
  })

  describe('la contrainte 3 couvre aussi le jour de la sortie longue', () => {
    it('signale une qualité posée le jour même', () => {
      const a = verifierContraintes([s({ day: 0, type: 'long', dist: 24 }), s({ day: 0, type: 'tempo' })])
      expect(a.map((x) => x.texte).join(' ')).toContain('le jour même')
    })
  })

  it('ne dit rien quand l’écart ne casse rien', () => {
    const w = plan.weeks[10]
    const apres = seancesAvecEcarts(
      w,
      indexerEcarts([
        { week: w.n, day_index: w.sessions[0].day, slot: 0, patch: { skipped: true }, reason: null },
      ]),
    )
    expect(alertesAjoutees(w.sessions, apres)).toEqual([])
  })

  it('signale un déplacement de la qualité du samedi vers le mardi', () => {
    const w = plan.weeks[10]
    const qualite = w.sessions.findIndex((s) => s.day === 5 && ['inter', 'tempo'].includes(s.type))
    if (qualite === -1) return
    const s = w.sessions[qualite]
    const slot = w.sessions.filter((x) => x.day === s.day).indexOf(s)
    const apres = seancesAvecEcarts(
      w,
      indexerEcarts([{ week: w.n, day_index: s.day, slot, patch: { day: 1 }, reason: null }]),
    )
    // Mardi est le lendemain de la sortie longue : contrainte 3.
    expect(alertesAjoutees(w.sessions, apres).map((x) => x.contrainte)).toContain(3)
  })
})

describe('une séance de qualité composée à la main', () => {
  const longue = plan.weeks.flatMap((w) => w.sessions).find((s) => s.type === 'long')!

  it('porte le titre qu’un plan écrirait', () => {
    expect(titreQualite({ reps: 5, km: 1, zone: 'vo2' })).toBe('5 x 1 km en VO2max')
    expect(titreQualite({ reps: 8, km: 0.4, zone: 'vo2' })).toBe('8 x 400 m en VO2max')
    expect(titreQualite({ reps: 3, km: 1.5, zone: 'seuil' })).toBe('3 x 1,5 km au seuil')
    expect(titreQualite({ reps: 1, km: 8, zone: 'am' })).toBe('8 km à allure marathon')
  })

  it('pose de vrais segments, pas seulement un titre', () => {
    // C'est `struct` que lit le coût tendineux : une séance dont le modèle
    // ignorerait la zone coûterait le prix d'une sortie facile.
    const v = appliquerEcart(longue, { qualite: { reps: 5, km: 1, zone: 'vo2' } })
    expect(v.struct).toEqual([
      { km: 2.5, zone: 'ef' },
      { km: 5, zone: 'vo2' },
      { km: 2, zone: 'recup' },
    ])
    expect(v.dist).toBe(9.5)
  })

  it('coûte le prix de sa zone, pas celui d’une sortie facile', () => {
    const facile = appliquerEcart(longue, { qualite: { reps: 5, km: 1, zone: 'am' } })
    const dure = appliquerEcart(longue, { qualite: { reps: 5, km: 1, zone: 'vo2' } })
    expect(sessionLoad(dure)).toBeGreaterThan(sessionLoad(facile))
  })

  it('devient un intervalle en VO2, un tempo ailleurs', () => {
    expect(appliquerEcart(longue, { qualite: { reps: 5, km: 1, zone: 'vo2' } }).type).toBe('inter')
    expect(appliquerEcart(longue, { qualite: { reps: 2, km: 3, zone: 'seuil' } }).type).toBe('tempo')
  })

  it('garde la trace de ce que la séance était', () => {
    const v = appliquerEcart(longue, { qualite: { reps: 5, km: 1, zone: 'vo2' } })
    expect(v.ecart).toContain('initialement')
  })

  it('le contrôle des contraintes la traite comme de la vitesse', () => {
    // Contrainte 3 : ni vitesse ni renfo bas accolés à la sortie longue.
    const sl = longue
    const composee = appliquerEcart(
      { ...longue, day: sl.day + 1 },
      { qualite: { reps: 5, km: 1, zone: 'vo2' } },
    )
    const alertes = verifierContraintes([sl, composee])
    expect(alertes.some((a) => a.contrainte === 3)).toBe(true)
  })

  it('remplace entièrement un changement de discipline', () => {
    const v = appliquerEcart(longue, { type: 'velo', qualite: { reps: 4, km: 1, zone: 'seuil' } })
    expect(v.type).toBe('tempo')
    expect(v.title).toBe('4 x 1 km au seuil')
  })
})
