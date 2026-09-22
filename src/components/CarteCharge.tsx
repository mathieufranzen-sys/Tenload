/**
 * La carte de tête de l'écran Aujourd'hui : la charge du tendon.
 *
 * Fond clair depuis le 22 septembre 2026 : le vert profond est réservé au mot
 * du coach, c'est la seule voix de l'app et elle doit se distinguer.
 *
 * Les compteurs de la semaine, un temps logés sous les bandes, sont partis
 * dans Suivi le 22 septembre 2026 : la carte ne dit plus que la charge.
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

/** Retrait du bouton rond, identique en haut et à droite. */
const COIN = 12

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
    // La carte entière ouvre le détail du calcul : un bouton de plus sous la
    // carte disait la même chose en plus petit (demande du 22 septembre).
    <button
      type="button"
      onClick={onCalcul}
      aria-label="Ouvrir le détail du calcul de l'indice"
      className={inconnu ? undefined : 'carte-bleu-pale'}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        textAlign: 'left',
        color: 'inherit',
        padding: '18px 18px 16px',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        ...(inconnu ? { border: '1.5px dashed var(--border-2)', background: 'transparent' } : null),
      }}
    >
      {/* Le bouton rond dans le coin, à la même distance du haut et du bord
          droit : le même geste que la séance du jour (retour du 22 septembre). */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: COIN,
          right: COIN,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--neon)',
          color: '#142800',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Icon name="arrowUpRight" size={20} />
      </span>
      <div style={{ paddingRight: 64, minHeight: 52 - (18 - COIN), display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p className="etiquette" style={{ fontSize: 'var(--fs-meta)', color: 'var(--ink)', fontWeight: 600 }}>
          Charge du tendon
        </p>
        {(inconnu || detail.stale) && (
          <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-detail)', color: 'var(--accent)' }}>
            {inconnu ? 'Non calculée' : 'Sur une estimation'}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 12 }}>
        <Gelule valeur={inconnu ? null : detail.idx} teinte={teinte} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {inconnu ? (
            <>
              <div className="display" style={{ fontSize: 'var(--fs-t-etat)', lineHeight: 1 }}>
                Je ne sais pas
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 'var(--fs-texte)', lineHeight: 1.5, color: 'var(--sur-ink-2)' }}>
                Aucune douleur saisie depuis {detail.joursSansDouleur ?? 'plus de 60'} jours.
                L'indice n'est pas bas : il est inconnu. La charge mécanique, elle, est connue :{' '}
                {Math.round(detail.ratio + detail.freshness + detail.monotony)} points sur 58.
              </p>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="chiffre" style={{ fontSize: 'var(--fs-c-hero)', lineHeight: 0.9 }}>
                  {detail.idx}
                </span>
                <span style={{ fontSize: 'var(--fs-lead)', color: 'var(--accent)' }}>/ 100</span>
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
                  fontSize: 'var(--fs-meta)',
                  fontWeight: 600,
                  lineHeight: 1.25,
                }}
              >
                {bande.name} · {bande.headline.toLowerCase()}
              </span>
              {ecartVeille != null && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 10,
                    fontSize: 'var(--fs-meta)',
                    color: 'var(--accent)',
                  }}
                >
                  {ecartVeille !== 0 && (
                    <span aria-hidden style={{ fontSize: 'var(--fs-texte)' }}>
                      {ecartVeille > 0 ? '↑' : '↓'}
                    </span>
                  )}
                  {ecartVeille === 0
                    ? 'Comme hier'
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
                  fontSize: 'var(--fs-micro)',
                  fontWeight: courante ? 700 : 500,
                  background: courante ? TEINTE_BANDE[b.key] : '#ffffff',
                  color: courante ? ENCRE_BANDE[b.key] : 'var(--ink-2)',
                  // Le contour de chaque plage prend sa bande, en sourdine :
                  // la rangée se lit comme une échelle avant d'être lue.
                  border: `1px solid ${courante ? 'transparent' : `${TEINTE_BANDE[b.key]}88`}`,
                }}
              >
                {LIBELLE_PLAGE[b.key]}
              </span>
            )
          })}
        </div>
      )}
    </button>
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
        // Un tube blanc sur le bloc bleu pâle (retour du 22 septembre) :
        // le remplissage de la bande s'y lit sans fond qui le teinte.
        background: valeur == null ? 'transparent' : '#ffffff',
        // Filet gris et non bleu (retour du 22 septembre) : le tube reste un
        // objet blanc posé sur le bloc, pas une partie du bloc.
        border: valeur == null ? '1.5px dashed var(--border-2)' : '1px solid #c2c2b8',
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
            fontSize: 'var(--fs-t-etat)',
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
