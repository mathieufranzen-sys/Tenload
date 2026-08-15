import { describe, expect, it } from 'vitest'
import planJson from '../data/plan.json'
import type { Plan, Session, SessionType } from '../data/types'
import {
  alertesAjoutees,
  appliquerEcart,
  cleEcart,
  indexerEcarts,
  seancesAvecEcarts,
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
    for (const w of plan.weeks) {
      expect(verifierContraintes(w.sessions), `semaine ${w.n}`).toEqual([])
    }
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

  it('C4 — signale une charge jambes le dimanche', () => {
    const a = verifierContraintes([seance(6, 'velo')])
    expect(a.map((x) => x.contrainte)).toContain(4)
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
    // infraction du dimanche doit remonter.
    const avant = [seance(2, 'ef'), seance(6, 'repos')]
    const apres = [seance(2, 'ef'), seance(6, 'velo')]
    const a = alertesAjoutees(avant, apres)
    expect(a).toHaveLength(1)
    expect(a[0].contrainte).toBe(4)
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
