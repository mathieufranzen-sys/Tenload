/**
 * Le profil de la séance, en barres, et son découpage en cartes.
 *
 * Le profil se lit avant les chiffres : la forme de la séance — une longue
 * barre basse, cinq pics, une barre basse — dit ce qu'on va faire plus vite
 * que trois lignes de texte. La largeur suit la durée estimée, la hauteur
 * l'intensité de la zone.
 *
 * Trois couleurs seulement, celles des graphiques de l'app : jaune pour le
 * facile, bleu pour l'effort, rose pour la récupération entre deux tours.
 * C'est le seul endroit de l'écran où la couleur revient, et elle y dit la
 * nature de l'effort, jamais sa gravité — la gravité appartient à la charge
 * du tendon.
 */
import type { Session } from '../data/types'
import { formatPace, zonePace } from '../lib/paces'
import {
  couleurSegment,
  hauteurSegment,
  roleDe,
  type BlocDeroule,
  type PhaseCle,
  type SegmentDeroule,
} from '../lib/deroule'

const H = 96
/** Largeur minimale d'une barre : sans elle, un 200 m disparaît à côté d'un 5 km. */
const MIN_PART = 0.018

interface Barre {
  part: number
  hauteur: number
  couleur: string
}

function barres(blocs: BlocDeroule[]): Barre[] {
  const out: Barre[] = []
  for (const b of blocs) {
    for (let i = 0; i < b.reps; i++) {
      out.push({
        part: b.effort.secondes ?? 60,
        hauteur: hauteurSegment(b.effort, false, b.phase),
        couleur: couleurSegment(b.effort, roleDe(b.effort, false, b.phase)),
      })
      // La dernière récupération d'un bloc n'est pas dessinée : on ne récupère
      // pas d'un tour qui n'aura pas de suivant, la séance enchaîne.
      if (b.recup && i < b.reps - 1) {
        out.push({
          part: b.recup.secondes ?? 30,
          hauteur: hauteurSegment(b.recup, true),
          // La même couleur que la ligne du dessous : la récupération est
          // verte dans les deux (retour du 22 septembre).
          couleur: couleurSegment(b.recup, 'recup'),
        })
      }
    }
  }
  return out
}

export function ProfilSeance({ blocs }: { blocs: BlocDeroule[] }) {
  const bs = barres(blocs)
  if (bs.length < 2) return null

  const total = bs.reduce((a, b) => a + b.part, 0)
  if (total <= 0) return null

  // Le minimum garanti se prend sur le reste, sinon la somme dépasse 1 et la
  // dernière barre sort du cadre.
  const brutes = bs.map((b) => Math.max(MIN_PART, b.part / total))
  const somme = brutes.reduce((a, b) => a + b, 0)
  const parts = brutes.map((p) => p / somme)

  return (
    <div
      role="img"
      aria-label="Profil de la séance"
      style={{
        position: 'relative',
        height: H,
        marginBottom: 20,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 2,
      }}
    >
      {/* Trois filets, comme sur les profils de montre : ils donnent une
          échelle sans qu'on ait à graduer quoi que ce soit. */}
      {[0.25, 0.5, 0.75].map((t) => (
        <span
          key={t}
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: t * H,
            height: 1,
            background: 'var(--chart-grille)',
          }}
        />
      ))}
      {parts.map((p, i) => (
          <span
            key={i}
            style={{
              flex: `${p} 0 0`,
              height: Math.max(6, bs[i].hauteur * H),
              background: bs[i].couleur,
              borderRadius: 3,
              opacity: 0.92,
            }}
          />
      ))}
    </div>
  )
}

const TITRE_PHASE: Record<PhaseCle, string> = {
  wu: 'Échauffement',
  main: 'Corps de séance',
  cd: 'Retour au calme',
}

export function DecoupageSeance({
  session: s,
  blocs,
  marathonPace,
}: {
  session: Session
  blocs: BlocDeroule[]
  marathonPace: number
}) {
  return (
    <div>
      {blocs.map((b, i) => {
        // Le titre de phase ne s'écrit qu'au premier bloc qui l'ouvre : le
        // répéter au-dessus de chaque carte hachait la lecture.
        const ouvre = i === 0 || blocs[i - 1].phase !== b.phase
        const titre =
          b.phase === 'main' && ['race', 'course'].includes(s.type) ? 'Course' : TITRE_PHASE[b.phase]
        return (
          <div key={i} style={{ marginTop: ouvre ? 20 : 10 }}>
            {ouvre && (
              <div
                style={{
                  display: 'inline-block',
                  marginBottom: -9,
                  marginLeft: 14,
                  position: 'relative',
                  zIndex: 2,
                  padding: '3px 11px',
                  borderRadius: 'var(--pill)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: 'var(--fs-detail)',
                  fontWeight: 500,
                  color: 'var(--accent)',
                }}
              >
                {titre}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                border: '1px solid var(--border)',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, padding: '14px 4px 14px 0' }}>
                <Ligne seg={b.effort} recuperation={false} phase={b.phase} marathonPace={marathonPace} />
                {b.recup && (
                  <div style={{ marginTop: 12 }}>
                    <Ligne seg={b.recup} recuperation phase={b.phase} marathonPace={marathonPace} />
                  </div>
                )}
              </div>
              {b.reps > 1 && (
                <div
                  style={{
                    flex: 'none',
                    width: 52,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'color-mix(in srgb, var(--ink) 5%, transparent)',
                    borderLeft: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--fs-c-m)',
                      fontFamily: 'var(--font-display)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <em
                      aria-hidden
                      style={{
                        fontStyle: 'normal',
                        fontSize: 'var(--fs-meta)',
                        fontWeight: 600,
                        color: 'var(--ink-2)',
                      }}
                    >
                      ×
                    </em>
                    {b.reps}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Ligne({
  seg,
  recuperation,
  phase,
  marathonPace,
}: {
  seg: SegmentDeroule
  recuperation: boolean
  phase: PhaseCle
  marathonPace: number
}) {
  const allure = seg.zone ? `${formatPace(zonePace(marathonPace, seg.zone))} /km` : null
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', paddingLeft: 14 }}>
      <span
        aria-hidden
        style={{
          width: 4,
          borderRadius: 2,
          flex: 'none',
          background: couleurSegment(seg, roleDe(seg, recuperation, phase)),
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-meta)', fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.25 }}>
          {seg.libelle}
        </div>
        <div style={{ fontSize: 'var(--fs-lead)', fontWeight: 600, marginTop: 2 }}>
          {seg.quantite}
          {allure && (
            <>
              <em style={{ fontStyle: 'normal', fontWeight: 500, color: 'var(--ink-2)' }}> à </em>
              {allure}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
