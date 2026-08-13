/**
 * La file d'attente doit tenir trois promesses : ne jamais produire de doublon,
 * ne jamais perdre un champ déjà saisi, et ne jamais oublier une écriture qui
 * n'est pas passée.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleJour,
  cleSeance,
  empiler,
  enAttente,
  fileActuelle,
  purger,
  vider,
  type Ecriture,
} from './offlineQueue'

const ecriture = (cle: string, valeurs: Record<string, unknown>, maj = 1): Ecriture => ({
  table: 'daily_logs',
  cle,
  valeurs,
  maj,
})

beforeEach(() => {
  purger()
})

describe('empiler', () => {
  it('empile deux lignes distinctes', () => {
    empiler(ecriture(cleJour('2026-08-11'), { pain_evening: 2 }))
    empiler(ecriture(cleJour('2026-08-12'), { pain_evening: 3 }))
    expect(enAttente()).toBe(2)
  })

  it('fusionne dix saisies sur la même journée en une seule écriture', () => {
    for (let i = 0; i <= 9; i++) {
      empiler(ecriture(cleJour('2026-08-11'), { pain_evening: i }, i))
    }
    expect(enAttente()).toBe(1)
    expect(fileActuelle()[0].valeurs).toEqual({ pain_evening: 9 })
  })

  it('garde les champs déjà saisis quand on en ajoute un autre', () => {
    empiler(ecriture(cleJour('2026-08-11'), { pain_evening: 4 }, 1))
    empiler(ecriture(cleJour('2026-08-11'), { eccentric: true }, 2))
    expect(fileActuelle()[0].valeurs).toEqual({ pain_evening: 4, eccentric: true })
  })

  it('ne confond pas deux tables de même clé', () => {
    empiler({ table: 'daily_logs', cle: 'x', valeurs: { a: 1 }, maj: 1 })
    empiler({ table: 'session_feedback', cle: 'x', valeurs: { b: 2 }, maj: 1 })
    expect(enAttente()).toBe(2)
  })

  it('conserve la position d’origine lors d’une fusion', () => {
    empiler(ecriture(cleJour('2026-08-10'), { pain_wake: 1 }, 1))
    empiler(ecriture(cleJour('2026-08-11'), { pain_wake: 2 }, 1))
    empiler(ecriture(cleJour('2026-08-10'), { pain_wake: 3 }, 2))
    expect(fileActuelle().map((e) => e.cle)).toEqual(['2026-08-10', '2026-08-11'])
  })
})

describe('vider', () => {
  it('envoie tout et laisse la file vide', async () => {
    empiler(ecriture(cleJour('2026-08-10'), { pain_wake: 1 }))
    empiler(ecriture(cleJour('2026-08-11'), { pain_wake: 2 }))
    const envoi = vi.fn(async () => true)
    const r = await vider(envoi)
    expect(r).toEqual({ envoyees: 2, restantes: 0 })
    expect(envoi).toHaveBeenCalledTimes(2)
  })

  it('rejoue dans l’ordre de saisie', async () => {
    empiler(ecriture(cleJour('2026-08-10'), {}, 1))
    empiler(ecriture(cleJour('2026-08-11'), {}, 1))
    empiler(ecriture(cleJour('2026-08-12'), {}, 1))
    const vus: string[] = []
    await vider(async (e) => {
      vus.push(e.cle)
      return true
    })
    expect(vus).toEqual(['2026-08-10', '2026-08-11', '2026-08-12'])
  })

  it('garde en attente ce qui n’est pas passé, sans perdre l’ordre', async () => {
    empiler(ecriture(cleJour('2026-08-10'), {}, 1))
    empiler(ecriture(cleJour('2026-08-11'), {}, 1))
    empiler(ecriture(cleJour('2026-08-12'), {}, 1))
    const r = await vider(async (e) => e.cle === '2026-08-10')
    expect(r.envoyees).toBe(1)
    expect(fileActuelle().map((e) => e.cle)).toEqual(['2026-08-11', '2026-08-12'])
  })

  it('n’efface rien quand le réseau lève une exception', async () => {
    empiler(ecriture(cleJour('2026-08-11'), { pain_wake: 1 }))
    await vider(async () => {
      throw new Error('offline')
    })
    expect(enAttente()).toBe(1)
  })

  it('ne perd pas une saisie faite pendant l’envoi', async () => {
    empiler(ecriture(cleJour('2026-08-11'), { pain_wake: 1 }, 1))
    await vider(async () => {
      // Le curseur bouge encore pendant que la requête est en vol.
      empiler(ecriture(cleJour('2026-08-11'), { pain_evening: 5 }, 2))
      return true
    })
    expect(enAttente()).toBe(1)
    expect(fileActuelle()[0].valeurs).toEqual({ pain_wake: 1, pain_evening: 5 })
  })

  it('reste inerte sur une file vide', async () => {
    const envoi = vi.fn(async () => true)
    const r = await vider(envoi)
    expect(r).toEqual({ envoyees: 0, restantes: 0 })
    expect(envoi).not.toHaveBeenCalled()
  })
})

describe('clés', () => {
  it('distingue deux séances du même jour', () => {
    expect(cleSeance(3, 1, 0)).not.toBe(cleSeance(3, 1, 1))
  })
})
