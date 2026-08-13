/**
 * Statut et connexion Strava. Remplace la carte "Retour Strava quotidien" de
 * la référence, qui décrivait une tâche planifiée et un connecteur de chat —
 * une mécanique propre au prototype HTML, pas à la vraie app.
 */
import { useState } from 'react'
import { formatDayLong, formatNumber } from '../../lib/dates'
import { dejaConnecte, derniereSync, stravaConfigure, synchroniser, urlAutorisation } from '../../lib/strava'

function formatDepuis(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.round(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  return `le ${formatDayLong(iso.slice(0, 10))}`
}

export function StravaStatus() {
  const [connecte, setConnecte] = useState(dejaConnecte())
  const [sync, setSync] = useState(derniereSync())
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function lancerSynchro() {
    setEnCours(true)
    setMessage(null)
    const r = await synchroniser()
    setEnCours(false)
    if (r.ok) {
      setSync(derniereSync())
      setConnecte(true)
      setMessage(
        r.importees != null ? `${formatNumber(r.importees)} activité${r.importees > 1 ? 's' : ''} importée${r.importees > 1 ? 's' : ''}.` : 'Synchronisé.',
      )
    } else {
      setMessage(r.erreur ?? 'Échec de la synchronisation.')
    }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 17px' }}>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.5, margin: '0 0 14px' }}>
        Une fois branché, tes séances remontent automatiquement dans le carnet de charge : plus
        besoin de les ressaisir à la main.
      </p>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          padding: '5px 10px',
          borderRadius: 'var(--pill)',
          background: connecte ? 'rgba(12,163,12,.16)' : 'rgba(250,178,25,.16)',
          color: connecte ? '#5BE05B' : '#FFD166',
        }}
      >
        {connecte ? 'Connecté sur cet appareil' : 'Pas encore connecté'}
      </div>

      {connecte && (
        <p style={{ color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, margin: '10px 0 0' }}>
          {sync ? `Dernière synchro ${formatDepuis(sync)}` : 'Jamais synchronisé sur cet appareil'}
        </p>
      )}

      {!stravaConfigure ? (
        <p style={{ color: 'var(--ink-3)', fontSize: 12.5, lineHeight: 1.5, margin: '14px 0 0' }}>
          La clé publique Strava n'est pas configurée : voir l'étape 5 du README avant de pouvoir
          te connecter.
        </p>
      ) : (
        <div style={{ marginTop: 14 }}>
          {!connecte ? (
            <a
              href={urlAutorisation()}
              style={{
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                textAlign: 'center',
                padding: 14,
                borderRadius: 'var(--pill)',
                fontWeight: 700,
                fontSize: 15,
                background: '#FC4C02',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              Se connecter avec Strava
            </a>
          ) : (
            <button
              onClick={lancerSynchro}
              disabled={enCours}
              style={{
                display: 'block',
                width: '100%',
                padding: 14,
                borderRadius: 'var(--pill)',
                fontWeight: 700,
                fontSize: 15,
                background: 'var(--surface-2)',
                color: 'var(--ink)',
                border: '1px solid var(--border-2)',
                opacity: enCours ? 0.6 : 1,
              }}
            >
              {enCours ? 'Synchronisation…' : 'Synchroniser maintenant'}
            </button>
          )}
          {message && <p style={{ color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, margin: '10px 0 0' }}>{message}</p>}
        </div>
      )}

    </div>
  )
}
