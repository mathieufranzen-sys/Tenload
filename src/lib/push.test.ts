import { describe, expect, it } from 'vitest'
import { aplatir, base64UrlVersOctets } from './push'

describe('base64UrlVersOctets', () => {
  it('décode un base64url sans rembourrage', () => {
    // « Tenload » en base64 vaut VGVubG9hZA== : deux caractères de
    // rembourrage, que base64url omet.
    expect(Array.from(base64UrlVersOctets('VGVubG9hZA'))).toEqual(
      Array.from(new TextEncoder().encode('Tenload')),
    )
  })

  it('traduit les deux caractères propres à base64url', () => {
    // 0xFB 0xFF donne « +/8 » en base64 ordinaire, « -_8 » en base64url.
    expect(Array.from(base64UrlVersOctets('-_8'))).toEqual([0xfb, 0xff])
  })

  it('rend autant d’octets qu’une clé VAPID en compte', () => {
    // Une clé publique VAPID fait 65 octets, soit 87 caractères base64url.
    const cle = 'B' + 'a'.repeat(86)
    expect(base64UrlVersOctets(cle)).toHaveLength(65)
  })
})

describe('aplatir', () => {
  const sub = (json: unknown) => ({ toJSON: () => json }) as unknown as PushSubscription

  it('met les clés à plat', () => {
    expect(
      aplatir(sub({ endpoint: 'https://push.example/x', keys: { p256dh: 'PP', auth: 'AA' } })),
    ).toEqual({ endpoint: 'https://push.example/x', p256dh: 'PP', auth: 'AA' })
  })

  it('refuse un abonnement incomplet plutôt que d’écrire une ligne inutilisable', () => {
    // Sans p256dh, le chiffrement du message est impossible : la ligne serait
    // en base et chaque envoi échouerait en silence.
    expect(aplatir(sub({ endpoint: 'https://push.example/x', keys: { auth: 'AA' } }))).toBeNull()
    expect(aplatir(sub({ keys: { p256dh: 'PP', auth: 'AA' } }))).toBeNull()
  })
})
