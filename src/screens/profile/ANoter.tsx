/**
 * Les séances qui attendent leur ressenti, et le chemin pour y aller.
 *
 * Le décompte « 3 en retard » de l'écran Suivi disait qu'il manquait quelque
 * chose sans dire quoi : il fallait remonter le calendrier à la main pour
 * retrouver les journées trouées. Or ces trous ne sont pas un détail de
 * comptage, ce sont eux qui font tomber `chargeInconnue` et qui plafonnent la
 * confiance de l'indice. Cette liste est donc un écran de réparation, pas un
 * tableau de bord.
 *
 * Groupée par jour, du plus récent au plus ancien : une séance d'hier se note
 * encore de mémoire, une séance d'il y a trois semaines ne se note plus
 * honnêtement.
 */
import type { SeanceANoter } from '../../lib/aNoter'
import { DAYS_LONG, weekdayIndex } from '../../lib/dates'
import { Icon } from '../../components/Icon'
import { MarqueSeance } from '../../components/MarqueSeance'

/** « 17 août », sans répéter le jour de la semaine que le titre porte déjà. */
const jourEtMois = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00Z`)
  return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`
}

const MOIS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin',
              'juil', 'août', 'sept', 'oct', 'nov', 'déc']

export function ANoter({
  seances,
  onOuvrir,
}: {
  seances: SeanceANoter[]
  /** Ouvre la feuille de séance, là où se saisissent les deux curseurs. */
  onOuvrir?: (x: SeanceANoter) => void
}) {
  if (seances.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 8px' }}>
        <Icon name="check" size={30} style={{ color: 'var(--good)', strokeWidth: 2.2 }} />
        <p style={{ fontSize: 'var(--fs-texte)', fontWeight: 650, margin: '14px 0 6px', letterSpacing: '-.3px' }}>
          Tout est noté
        </p>
        <p style={{ fontSize: 'var(--fs-detail)', color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
          Chaque journée du plan porte son ressenti. L'indice mesure au lieu de supposer.
        </p>
      </div>
    )
  }

  const enRetard = seances.filter((x) => x.enRetard).length
  const jours: string[] = []
  for (const s of seances) if (!jours.includes(s.day)) jours.push(s.day)

  return (
    <div>
      <p style={{ fontSize: 'var(--fs-meta)', color: 'var(--ink-2)', lineHeight: 1.55, margin: '0 0 20px' }}>
        {enRetard > 0
          ? `${enRetard} séance${enRetard > 1 ? 's' : ''} des jours passés ${enRetard > 1 ? 'attendent leurs' : 'attend ses'} deux curseurs.`
          : 'Rien en retard : il ne reste que la journée en cours.'}{' '}
        Tant qu'une séance n'est pas notée, sa journée ne compte pas dans la charge et l'indice suppose
        au lieu de mesurer. C'est toujours dans le sens rassurant, qui est le seul dangereux.
      </p>

      {jours.map((jour) => (
        <section key={jour} style={{ marginBottom: 18 }}>
          <h3
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              fontSize: 'var(--fs-meta)',
              fontWeight: 500,
              color: 'var(--accent)',
              margin: '0 0 9px 2px',
            }}
          >
            {DAYS_LONG[weekdayIndex(jour)]} {jourEtMois(jour)}
            {!seances.find((x) => x.day === jour)?.enRetard && (
              <span
                style={{
                  fontSize: 'var(--fs-micro)',
                  fontWeight: 800,
                  letterSpacing: '.9px',
                  padding: '3px 8px',
                  borderRadius: 'var(--pill)',
                  background: 'color-mix(in srgb, var(--neon) 22%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--neon-2) 45%, transparent)',
                  color: 'var(--good)',
                }}
              >
                aujourd'hui
              </span>
            )}
          </h3>

          {seances
            .filter((x) => x.day === jour)
            .map((x) => (
              <button
                key={`${x.semaineOrigine}-${x.jourOrigine}-${x.slot}`}
                onClick={onOuvrir && (() => onOuvrir(x))}
                className="glass"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  textAlign: 'left',
                  color: 'inherit',
                  borderRadius: 16,
                  padding: '12px 13px',
                  marginBottom: 8,
                  cursor: onOuvrir ? 'pointer' : 'default',
                }}
              >
                <MarqueSeance type={x.type} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-texte)', fontWeight: 620, letterSpacing: '-.25px' }}>
                  {x.titre}
                </span>
                {onOuvrir && (
                  <Icon
                    name="chevronRight"
                    size={17}
                    style={{ color: 'var(--sur-ink-3)', flex: 'none', strokeWidth: 1.7 }}
                  />
                )}
              </button>
            ))}
        </section>
      ))}
    </div>
  )
}
