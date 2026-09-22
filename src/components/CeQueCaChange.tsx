/**
 * « Ce que ça change aujourd'hui » : ce que l'indice fait au plan du jour.
 *
 * Remplace l'ancien bandeau des règles actives (AlertBox, supprimé). Il ne se montrait
 * qu'en cas de règle déclenchée, si bien qu'un jour normal l'écran ne disait
 * jamais que le plan tenait, et encore moins à partir d'où il cesserait de
 * tenir. La carte dit les deux : ce qui s'applique, puis le prochain seuil et
 * ce qu'il déclencherait, avec le texte même des règles (`TEXTE_BANDE`).
 */
import type { AdaptResult } from '../lib/adapt'
import { TEXTE_BANDE } from '../lib/adapt'
import { BANDS, type Band } from '../lib/tendonIndex'
import { TEINTE_BANDE } from '../lib/teintes'

export function CeQueCaChange({
  adapt,
  bande,
  inconnu,
}: {
  adapt: AdaptResult
  bande: Band
  inconnu: boolean
}) {
  const i = BANDS.findIndex((b) => b.key === bande.key)
  const suivante = BANDS[i + 1]
  const seuil = BANDS[i]?.max + 1
  const effetSuivant = suivante ? TEXTE_BANDE[suivante.key] : undefined

  return (
    <section className="carte" style={{ padding: '18px 20px 20px' }}>
      <p className="etiquette">Ce que ça change aujourd'hui</p>

      {adapt.rules.length > 0 ? (
        <>
          {adapt.rules.map((r) => (
            <div key={r.id} style={{ marginTop: 12 }}>
              <p className="display" style={{ margin: 0, fontSize: 21, lineHeight: 1.3 }}>
                {r.title}.
              </p>
              <p style={{ margin: '5px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--sur-ink-2)' }}>
                {r.action}
              </p>
            </div>
          ))}
          <p style={{ margin: '14px 0 0', fontSize: 13.5, color: 'var(--sur-ink-3)' }}>
            Les séances concernées portent un repère dans le programme.
          </p>
        </>
      ) : inconnu ? (
        <>
          <p className="display" style={{ margin: '10px 0 0', fontSize: 21, lineHeight: 1.35 }}>
            Rien. Le plan du jour reste celui qui était écrit.
          </p>
          <Filet />
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--sur-ink-2)' }}>
            Une absence de mesure n'est pas une mesure : l'app n'adapte pas le plan sur un indice
            qu'elle n'a pas, et elle refuse aussi d'y ajouter du volume. Note ta raideur au réveil
            et l'indice redevient lisible.
          </p>
        </>
      ) : (
        <>
          <p className="display" style={{ margin: '10px 0 0', fontSize: 21, lineHeight: 1.35 }}>
            Aucune règle d'adaptation n'est déclenchée. Le plan du jour reste celui qui était écrit.
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--sur-ink-2)' }}>
            {bande.detail}
          </p>
        </>
      )}

      {!inconnu && suivante && effetSuivant && (
        <>
          <Filet />
          <div style={{ display: 'flex', gap: 12 }}>
            <span
              aria-hidden
              style={{
                width: 4,
                flex: 'none',
                borderRadius: 2,
                background: `linear-gradient(180deg, ${TEINTE_BANDE[suivante.key]}, ${TEINTE_BANDE[bande.key]})`,
              }}
            />
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--sur-ink-2)' }}>
              À {seuil}, la bande passe en {suivante.name.toLowerCase()} :{' '}
              {effetSuivant.charAt(0).toLowerCase() + effetSuivant.slice(1)}
            </p>
          </div>
        </>
      )}
    </section>
  )
}

function Filet() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
}
