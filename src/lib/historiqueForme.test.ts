import { describe, expect, it } from 'vitest'
import { ancresDeForme, historiqueForme } from './historiqueForme'

const NOW = '2026-10-18'
const ancres = ancresDeForme(
  { day: '2026-08-08', secondes: 722 },
  [
    { nom: '20 km de Paris', day: '2026-10-11', km: 20, chronoS: 5009 },
    { nom: '10 km Hoka', day: '2026-11-15', km: 10, chronoS: null },
  ],
  NOW,
)

describe('l’historique de la forme', () => {
  it('pose une ancre par mesure, jamais une course sans chrono ni à venir', () => {
    expect(ancres.map((a) => a.source)).toEqual(['Test de 3 km', '20 km de Paris'])
    expect(ancres[0].allure).toBe(289)
    expect(ancres[1].allure).toBeLessThan(270)
  })

  it('chaque date garde l’ancre de son jour : rien avant le test, une marche au 20 km', () => {
    const dates = ['2026-07-27', '2026-09-07', '2026-10-11', NOW]
    const p = historiqueForme(ancres, [], dates, [], 264)
    expect(p[0].allure).toBeNull()
    expect(p[1].allure).toBe(289)
    expect(p[2]).toMatchObject({ allure: ancres[1].allure, ancre: { source: '20 km de Paris' } })
    expect(p[3].allure).toBe(264)
  })
})
