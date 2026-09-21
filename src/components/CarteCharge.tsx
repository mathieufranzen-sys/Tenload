/**
 * La carte de tête de l'écran Aujourd'hui : la charge du tendon.
 *
 * Refonte du 21 septembre 2026, d'après la maquette. La gélule verticale
 * remplace l'arc : elle se remplit comme un tube, du bas vers le haut, et ses
 * quatre graduations sont les seuils des bandes. Le chiffre est en serif, à
 * côté, avec la bande en toutes lettres et le mouvement depuis la veille.
 *
 * Quand la douleur n'est plus saisie, la carte passe en pointillés et dit
 * « je ne sais pas » : c'est la même règle qu'avant, un indice bas obtenu par
 * absence de mesure n'est pas un indice bas.
 */
import type { Band, BandKey, IndexBreakdown } from '../lib/tendonIndex'
import { BANDS } from '../lib/tendonIndex'
import { ENCRE_BANDE, TEINTE_BANDE } from '../lib/teintes'
import { Icon } from './Icon'

/** Les seuils des bandes, pour les graduations de la gélule. */
const SEUILS = [30, 50, 65, 80]

const LIBELLE_PLAGE: Record<BandKey, string> = {
  vert: '0–29',
  jaune: '30–49',
  orange: '50–64',
  rouge: '65–79',
  noir: '80+',
}

export function CarteCharge({
  detail,
  bande,
  ecartVeille,
  onCalcul,
}: {
  detail: IndexBreakdown
  bande: Band
  /** Mouvement depuis la veille, en points. Absent quand la veille est inconnue. */
  ecartVeille: number | null
  onCalcul: () => void
}) {
  const inconnu = detail.painInconnue
  const teinte = TEINTE_BANDE[bande.key]

  return (
    <section
      className={inconnu ? undefined : 'carte-braise'}
      style={{
        padding: '18px 18px 16px',
        borderRadius: 'var(--radius-lg)',
        ...(inconnu
          ? { border: '1.5px dashed var(--border-2)', background: 'color-mix(in srgb, var(--ink) 3%, transparent)' }
          : null),
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onCalcul}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 'var(--pill)',
            border: `1px ${inconnu ? 'dashed' : 'solid'} var(--border-2)`,
            fontSize: 14,
            color: 'var(--ink)',
          }}
        >
          <Icon name="capsule" size={15} style={{ color: 'var(--accent)' }} />
          charge tendon
        </button>
        <span style={{ fontSize: 13, color: 'var(--accent)', textAlign: 'right' }}>
          {inconnu ? 'non calculé' : detail.stale ? 'sur une estimation' : 'indice du jour'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 18 }}>
        <Gelule valeur={inconnu ? null : detail.idx} teinte={teinte} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {inconnu ? (
            <>
              <div className="display" style={{ fontSize: 44, lineHeight: 1 }}>
                je ne sais pas
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--sur-ink-2)' }}>
                Aucune douleur saisie depuis {detail.joursSansDouleur ?? 'plus de 60'} jours.
                L'indice n'est pas bas : il est inconnu. La charge mécanique, elle, est connue :{' '}
                {Math.round(detail.ratio + detail.freshness + detail.monotony)} points sur 58.
              </p>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="chiffre" style={{ fontSize: 96, lineHeight: 0.9 }}>
                  {detail.idx}
                </span>
                <span style={{ fontSize: 17, color: 'var(--accent)' }}>/ 100</span>
              </div>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 12,
                  padding: '6px 13px',
                  borderRadius: 'var(--pill)',
                  background: teinte,
                  color: ENCRE_BANDE[bande.key],
                  border: bande.key === 'noir' ? '1px solid var(--border-2)' : undefined,
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.25,
                }}
              >
                {bande.name.toLowerCase()} · {bande.headline.toLowerCase()}
              </span>
              {ecartVeille != null && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 10,
                    fontSize: 14,
                    color: 'var(--accent)',
                  }}
                >
                  {ecartVeille !== 0 && (
                    <span aria-hidden style={{ fontSize: 15 }}>
                      {ecartVeille > 0 ? '↑' : '↓'}
                    </span>
                  )}
                  {ecartVeille === 0
                    ? 'comme hier'
                    : `${Math.abs(ecartVeille)} point${Math.abs(ecartVeille) > 1 ? 's' : ''} depuis hier`}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!inconnu && (
        <div style={{ display: 'flex', gap: 5, marginTop: 18 }} aria-label="Les cinq bandes">
          {BANDS.map((b) => {
            const courante = b.key === bande.key
            return (
              <span
                key={b.key}
                aria-current={courante || undefined}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '7px 0',
                  borderRadius: 'var(--pill)',
                  fontSize: 12,
                  fontWeight: courante ? 700 : 500,
                  background: courante ? TEINTE_BANDE[b.key] : 'transparent',
                  color: courante ? ENCRE_BANDE[b.key] : 'var(--sur-ink-3)',
                  // Le contour de chaque plage prend sa bande, en sourdine :
                  // la rangée se lit comme une échelle avant d'être lue.
                  border: `1px solid ${courante ? 'transparent' : `${TEINTE_BANDE[b.key]}44`}`,
                }}
              >
                {LIBELLE_PLAGE[b.key]}
              </span>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** La gélule : un tube qui se remplit du bas, gradué aux seuils des bandes. */
function Gelule({ valeur, teinte }: { valeur: number | null; teinte: string }) {
  const H = 196
  const W = 84
  return (
    <div
      aria-hidden
      style={{
        position: 'relative',
        width: W,
        height: H,
        flex: 'none',
        borderRadius: W / 2,
        overflow: 'hidden',
        background: valeur == null ? 'transparent' : 'color-mix(in srgb, var(--ink) 7%, transparent)',
        border: valeur == null ? '1.5px dashed var(--border-2)' : '1px solid color-mix(in srgb, var(--ink) 12%, transparent)',
      }}
    >
      {valeur == null ? (
        <span
          className="display"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: 44,
            color: 'var(--sur-ink-3)',
          }}
        >
          ?
        </span>
      ) : (
        <>
          <span
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              // Un plancher de la largeur du tube : à 4 sur 100, le remplissage
              // ne doit pas devenir un trait qu'on prend pour un bord.
              height: Math.max(W * 0.55, (valeur / 100) * H),
              background: `linear-gradient(180deg, ${teinte}, ${teinte}cc)`,
              borderRadius: `${W / 2}px ${W / 2}px 0 0`,
              transition: 'height .5s var(--ease-out)',
            }}
          />
          {SEUILS.map((s) => (
            <span
              key={s}
              style={{
                position: 'absolute',
                left: 12,
                right: 12,
                bottom: (s / 100) * H,
                height: 1,
                background: 'color-mix(in srgb, var(--ink) 18%, transparent)',
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}
