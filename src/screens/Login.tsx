/**
 * Écran de connexion : une adresse, un lien reçu par mail, aucun mot de passe.
 *
 * Il n'apparaît qu'à la première ouverture sur un appareil, la session tient
 * ensuite plusieurs semaines. C'est le seul écran vu avant toute donnée, donc
 * le seul qui ne peut pas piloter son dégradé sur la bande de charge : il est
 * figé sur le vert, la couleur du tendon qui va bien.
 */
import { useState, type FormEvent } from 'react'
import { CODE_MAX, CODE_MIN, codeValide, type Auth } from '../hooks/useAuth'
import { MeshBackground } from '../components/MeshBackground'
import { Icon } from '../components/Icon'

export function Login({ auth }: { auth: Auth }) {
  const [email, setEmail] = useState('')
  const [statut, setStatut] = useState<'saisie' | 'envoi' | 'envoyé'>('saisie')
  const [erreur, setErreur] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [verif, setVerif] = useState(false)

  async function validerCode(e: FormEvent) {
    e.preventDefault()
    const propre = code.replace(/\D/g, '')
    if (!codeValide(propre)) {
      setErreur(`Le code fait entre ${CODE_MIN} et ${CODE_MAX} chiffres.`)
      return
    }
    setVerif(true)
    setErreur(null)
    const err = await auth.verifierCode(email, propre)
    setVerif(false)
    // Pas de setStatut en cas de succès : `onAuthStateChange` bascule l'app
    // toute seule, cet écran disparaît avec.
    if (err) setErreur(err)
  }

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setErreur('Adresse incomplète.')
      return
    }
    setStatut('envoi')
    setErreur(null)
    const err = await auth.envoyerLien(email)
    if (err) {
      setErreur(err)
      setStatut('saisie')
      return
    }
    setStatut('envoyé')
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        maxWidth: 'var(--shell-max)',
        margin: '0 auto',
        overflow: 'hidden',
      }}
    >
      <MeshBackground band="vert" />

      <div
        style={{
          position: 'relative',
          zIndex: 5,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 var(--page-x) 40px',
        }}
      >
        <header style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 46,
              fontWeight: 300,
              letterSpacing: '-2px',
              lineHeight: 1,
            }}
          >
            Tenload
          </h1>
          <p
            style={{
              color: 'var(--sur-ink-2)',
              fontSize: 15,
              fontWeight: 500,
              lineHeight: 1.5,
              margin: '12px 0 0',
              maxWidth: '30ch',
            }}
          >
            Ton plan marathon, piloté par la charge de ton tendon.
          </p>
          <p
            style={{
              color: 'var(--sur-ink-3)',
              fontSize: 13,
              fontWeight: 500,
              margin: '6px 0 0',
            }}
          >
            Paris, 11 avril 2027.
          </p>
        </header>

        {statut === 'envoyé' ? (
          <div className="glass" style={{ borderRadius: 22, padding: '20px 19px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <span style={{ color: '#6ee7b7', display: 'flex' }}>
                <Icon name="check" size={20} />
              </span>
              <b style={{ fontSize: 16.5, fontWeight: 700 }}>Code envoyé</b>
            </div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: '#D6D9DE' }}>
              Va chercher le mail envoyé à {email}, puis recopie ici le code qu'il contient.
            </p>

            {/* Le code plutôt que le lien, et ce n'est pas une commodité : sur
                iOS, une app installée sur l'écran d'accueil a un stockage
                séparé de Safari. Un lien ouvre un navigateur, donc il connecte
                tout sauf l'app d'où part la demande. Le code ne sort jamais
                d'ici. */}
            <form onSubmit={validerCode} style={{ marginTop: 15 }}>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={CODE_MAX}
                autoFocus
                placeholder="······"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_MAX))}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(8,9,11,.34)',
                  border: `1px solid ${erreur ? 'var(--c-inter)' : 'var(--glass-border)'}`,
                  borderRadius: 14,
                  padding: '14px 15px',
                  color: 'var(--ink)',
                  font: 'inherit',
                  fontSize: 26,
                  fontWeight: 600,
                  // Dix chiffres à 10 px d'écart débordent d'un écran de 375 :
                  // l'espacement se resserre dès que le code s'allonge.
                  letterSpacing: code.length > 7 ? '5px' : '10px',
                  textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums',
                  outline: 'none',
                }}
              />
              {erreur && (
                <p style={{ color: '#FF9A9D', fontSize: 12.5, fontWeight: 600, margin: '9px 2px 0' }}>
                  {erreur}
                </p>
              )}
              <button
                type="submit"
                disabled={verif || !codeValide(code)}
                style={{
                  width: '100%',
                  marginTop: 14,
                  background: '#fff',
                  color: '#08090b',
                  borderRadius: 'var(--pill)',
                  padding: 15,
                  font: 'inherit',
                  fontSize: 16,
                  fontWeight: 700,
                  opacity: verif || !codeValide(code) ? 0.55 : 1,
                }}
              >
                {verif ? 'Vérification…' : 'Me connecter'}
              </button>
            </form>

            <p style={{ color: 'var(--sur-ink-3)', fontSize: 12, lineHeight: 1.5, margin: '13px 2px 0' }}>
              Le mail contient aussi un lien, mais si tu as installé Tenload sur ton écran
              d'accueil, c'est le code qu'il faut : le lien ouvrirait Safari, qui est un espace
              séparé de l'app.
            </p>

            <button
              type="button"
              onClick={() => {
                setStatut('saisie')
                setCode('')
                setErreur(null)
              }}
              style={{
                width: '100%',
                marginTop: 12,
                padding: 14,
                borderRadius: 'var(--pill)',
                fontSize: 15.5,
                fontWeight: 700,
                color: 'var(--sur-ink-2)',
                border: '1px solid var(--glass-border)',
              }}
            >
              Utiliser une autre adresse
            </button>
          </div>
        ) : (
          <form onSubmit={soumettre} className="glass" style={{ borderRadius: 22, padding: '20px 19px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '1.3px',
                textTransform: 'uppercase',
                color: 'var(--sur-ink-2)',
                marginBottom: 9,
              }}
            >
              Adresse mail
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom@exemple.fr"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(8,9,11,.34)',
                border: `1px solid ${erreur ? 'var(--c-inter)' : 'var(--glass-border)'}`,
                borderRadius: 14,
                padding: '14px 15px',
                color: 'var(--ink)',
                font: 'inherit',
                fontSize: 16.5,
                fontWeight: 500,
                outline: 'none',
              }}
            />
            {erreur && (
              <p style={{ color: '#FF9A9D', fontSize: 12.5, fontWeight: 600, margin: '9px 2px 0' }}>
                {erreur}
              </p>
            )}
            <button
              type="submit"
              disabled={statut === 'envoi'}
              style={{
                width: '100%',
                marginTop: 14,
                background: '#fff',
                color: '#08090b',
                borderRadius: 'var(--pill)',
                padding: 15,
                font: 'inherit',
                fontSize: 16,
                fontWeight: 700,
                cursor: statut === 'envoi' ? 'default' : 'pointer',
                opacity: statut === 'envoi' ? 0.55 : 1,
                transition: `opacity var(--dur-fast) var(--ease-out)`,
              }}
            >
              {statut === 'envoi' ? 'Envoi…' : 'Recevoir le lien'}
            </button>
            <p
              style={{
                color: 'var(--sur-ink-3)',
                fontSize: 12,
                lineHeight: 1.5,
                margin: '13px 2px 0',
                textAlign: 'center',
              }}
            >
              Aucun mot de passe. Un lien à usage unique, valable une heure.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
