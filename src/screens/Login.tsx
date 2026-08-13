/**
 * Écran de connexion : une adresse, un lien reçu par mail, aucun mot de passe.
 *
 * Volontairement sobre. Il n'apparaît qu'à la première ouverture sur un
 * appareil, la session tient ensuite plusieurs semaines.
 */
import { useState, type FormEvent } from 'react'
import type { Auth } from '../hooks/useAuth'

export function Login({ auth }: { auth: Auth }) {
  const [email, setEmail] = useState('')
  const [statut, setStatut] = useState<'saisie' | 'envoi' | 'envoyé'>('saisie')
  const [erreur, setErreur] = useState<string | null>(null)

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
        maxWidth: 380,
        margin: '0 auto',
        padding: '18vh var(--page-x) 40px',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 'var(--fs-hero)',
          fontWeight: 800,
          letterSpacing: '-.8px',
        }}
      >
        Tendo
      </h1>
      <p
        style={{
          color: 'var(--ink-2)',
          fontSize: 'var(--fs-meta)',
          lineHeight: 1.5,
          margin: '6px 0 var(--gap-6)',
        }}
      >
        Marathon de Paris, 11 avril 2027.
      </p>

      {statut === 'envoyé' ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-2)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px 15px',
            fontSize: 'var(--fs-meta)',
            lineHeight: 1.55,
            color: 'var(--ink-2)',
          }}
        >
          <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>Lien envoyé.</strong>
          <br />
          Ouvre le mail reçu sur {email} depuis cet appareil. Le lien expire au bout d'une
          heure.
          <br />
          <button
            type="button"
            onClick={() => setStatut('saisie')}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 0 0',
              color: 'var(--ink-3)',
              font: 'inherit',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Utiliser une autre adresse
          </button>
        </div>
      ) : (
        <form onSubmit={soumettre}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: 'var(--fs-micro)',
              fontWeight: 800,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 'var(--gap-2)',
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
              background: 'var(--surface)',
              border: `1px solid ${erreur ? 'var(--c-inter)' : 'var(--border-2)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '13px 14px',
              color: 'var(--ink)',
              font: 'inherit',
              fontSize: 'var(--fs-body)',
              outline: 'none',
            }}
          />
          {erreur && (
            <p style={{ color: 'var(--c-inter)', fontSize: 'var(--fs-micro)', margin: '8px 2px 0' }}>
              {erreur}
            </p>
          )}
          <button
            type="submit"
            disabled={statut === 'envoi'}
            style={{
              width: '100%',
              marginTop: 'var(--gap-4)',
              background: 'var(--ink)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 'var(--pill)',
              padding: '14px',
              font: 'inherit',
              fontSize: 'var(--fs-body)',
              fontWeight: 700,
              cursor: statut === 'envoi' ? 'default' : 'pointer',
              opacity: statut === 'envoi' ? 0.5 : 1,
              transition: `opacity var(--dur-fast) var(--ease-out)`,
            }}
          >
            {statut === 'envoi' ? 'Envoi…' : 'Recevoir le lien'}
          </button>
        </form>
      )}
    </div>
  )
}
