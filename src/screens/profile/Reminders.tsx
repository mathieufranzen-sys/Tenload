/**
 * Les rappels du carnet : activer, désactiver, et dire honnêtement quand ça
 * ne peut pas marcher.
 *
 * Sur iPhone, une notification web n'existe que si la PWA est installée sur
 * l'écran d'accueil. Depuis un onglet Safari, l'abonnement est accepté puis
 * rien n'arrive jamais. L'écran le dit avant de proposer le bouton, plutôt
 * que de laisser croire à une panne.
 */
import { BoutonAction } from '../../components/BoutonAction'
import { useEffect, useState } from 'react'
import {
  activerRappels,
  desactiverRappels,
  cleConfiguree,
  estInstallee,
  etatRappels,
  type EtatRappels,
} from '../../lib/push'

interface Props {
  /** Absent en mode instantanés et en démo : rien à abonner alors. */
  userId?: string
}

const HORAIRES = [
  { heure: '08:00', titre: 'Raideur au réveil', detail: 'Avant de poser le pied par terre' },
  {
    heure: '23:00',
    titre: 'Point du soir',
    detail: 'Effort perçu, douleur à l’effort, douleur de fin de journée',
  },
]

export function Reminders({ userId }: Props) {
  const [etat, setEtat] = useState<EtatRappels | null>(null)
  const [occupe, setOccupe] = useState(false)
  const installee = estInstallee()

  useEffect(() => {
    let vivant = true
    etatRappels().then((e) => vivant && setEtat(e))
    return () => {
      vivant = false
    }
  }, [])

  async function basculer() {
    if (!userId) return
    setOccupe(true)
    // `activerRappels` doit partir du geste de l'utilisateur : iOS refuse
    // `requestPermission` autrement, et sans erreur exploitable.
    setEtat(etat === 'actif' ? await desactiverRappels() : await activerRappels(userId))
    setOccupe(false)
  }

  return (
    <>
      <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px 17px', marginBottom: 14 }}>
        <b style={{ fontSize: 'var(--fs-body)' }}>Deux rappels par jour</b>
        <p style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-texte)', lineHeight: 1.5, margin: '6px 0 14px' }}>
          Le carnet ne vaut que s'il est tenu. La raideur au réveil pèse 45 % de la part douleur, et
          au bout de trois jours sans saisie l'indice cesse de mesurer quoi que ce soit et bloque
          toute hausse de volume.
        </p>

        <div>
          {HORAIRES.map((h, i) => (
            <div
              key={h.heure}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 14,
                padding: '12px 0',
                borderTop: i === 0 ? '1px solid var(--border)' : '1px solid var(--border)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--fs-lead)',
                  fontWeight: 700,
                  letterSpacing: '-.4px',
                  fontVariantNumeric: 'tabular-nums',
                  flex: 'none',
                  minWidth: 54,
                }}
              >
                {h.heure}
              </span>
              <span style={{ minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 'var(--fs-texte)', fontWeight: 600 }}>{h.titre}</b>
                <span style={{ display: 'block', color: 'var(--ink-2)', fontSize: 'var(--fs-detail)', lineHeight: 1.35, marginTop: 1 }}>
                  {h.detail}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Le silence est la moitié du dispositif : un rappel qui redemande ce
            qui est déjà saisi se fait couper en trois jours, et emporte avec
            lui celui qui servait. */}
        <p style={{ color: 'var(--ink-3)', fontSize: 'var(--fs-detail)', lineHeight: 1.45, margin: '12px 0 0' }}>
          Rien n'est envoyé si la saisie est déjà faite. Le dimanche, seul le point du soir part :
          c'est ton repos jambes, il n'y a pas de séance à noter.
        </p>
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius)', padding: '16px 17px', marginBottom: 14 }}>
        {!installee && (
          <p style={{ color: 'var(--warning)', fontSize: 'var(--fs-meta)', lineHeight: 1.45, margin: '0 0 12px', fontWeight: 500 }}>
            Tu ouvres Tenload dans un onglet. Sur iPhone, les notifications ne partent que vers
            l'app installée sur l'écran d'accueil : ouvre-la depuis son icône avant d'activer.
          </p>
        )}

        {etat === 'indisponible' ? (
          <p style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-meta)', lineHeight: 1.5, margin: 0 }}>
            {!cleConfiguree()
              ? "La clé d'envoi manque à cette version de l'app : ajoute VITE_VAPID_PUBLIC_KEY aux variables de Netlify, puis redéploie."
              : !installee
                ? "Sur iPhone, les notifications ne marchent que depuis l'app installée : Safari, Partager, « Sur l'écran d'accueil », puis rouvre-la depuis l'icône."
                : 'Ce navigateur ne sait pas recevoir de notifications.'}
          </p>
        ) : etat === 'refuse' ? (
          <p style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-meta)', lineHeight: 1.5, margin: 0 }}>
            Les notifications sont bloquées pour Tenload. Il faut les réautoriser dans les réglages
            de ton téléphone : une fois refusée, la permission ne peut plus être redemandée depuis
            l'app.
          </p>
        ) : (
          <>
            {/* Activer est l'action principale, au dessin commun des boutons
                d'action ; désactiver reste un bouton en contour. */}
            {etat === 'actif' ? (
              <button
                onClick={basculer}
                disabled={occupe}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 'var(--pill)',
                  background: 'var(--surface-2)',
                  color: 'var(--ink)',
                  border: '1px solid var(--border-2)',
                  fontSize: 'var(--fs-texte)',
                  fontWeight: 600,
                  opacity: occupe ? 0.6 : 1,
                }}
              >
                Désactiver les rappels
              </button>
            ) : (
              <BoutonAction icone="check" onClick={basculer} disabled={occupe || !userId || etat === null}>
                {etat === null ? '…' : 'Activer les rappels'}
              </BoutonAction>
            )}
            {etat === 'actif' && (
              <p style={{ color: 'var(--ink-2)', fontSize: 'var(--fs-detail)', lineHeight: 1.45, margin: '10px 0 0' }}>
                Cet appareil est abonné. Chaque appareil s'abonne séparément.
              </p>
            )}
            {!userId && (
              <p style={{ color: 'var(--ink-3)', fontSize: 'var(--fs-detail)', lineHeight: 1.45, margin: '10px 0 0' }}>
                Indisponible en démonstration : il n'y a pas de compte à qui envoyer.
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}
