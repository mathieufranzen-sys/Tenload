/**
 * La carte « Forme projetée » de l'écran Objectif, d'après la maquette de
 * Mathieu du 22 septembre 2026.
 *
 * Le marathon projeté en grand et ce qu'il reste à reprendre ; une règle qui
 * va de l'objectif + 10 min (à gauche) à l'objectif − 5 min (à droite), avec
 * la forme en curseur et l'objectif en repère ; la tendance des quatre
 * dernières semaines. Sous trois séances notées sur 28 jours, le ressenti ne
 * compte plus et la forme revient au test : la carte passe alors en gris,
 * parce qu'elle n'affiche plus une lecture de la semaine.
 */
import { formatDuration } from '../lib/paces'

export interface PointTendance {
  /** Marathon projeté, en minutes. */
  minutes: number
  /** Le même, en secondes : l'arrondi à la minute effaçait les progrès. */
  secondes: number
}

const court = (min: number) => formatDuration(min).replace(' min', '')

/** « 42 s », « 1 min 24 » : un écart de chrono se lit en durée. */
const formatEcartCourt = (s: number): string => {
  const r = Math.round(s)
  if (r < 60) return `${r} s`
  const m = Math.floor(r / 60)
  const reste = r % 60
  return reste ? `${m} min ${String(reste).padStart(2, '0')}` : `${m} min`
}

export function CarteForme({
  minutes,
  objectif,
  tendance,
  lue,
  seances,
}: {
  /** Marathon projeté aujourd'hui, en minutes. */
  minutes: number
  /** Marathon visé, en minutes. */
  objectif: number
  /** Les quatre derniers points, du plus ancien à aujourd'hui. */
  tendance: PointTendance[]
  /** Assez de séances notées pour que le ressenti compte. */
  lue: boolean
  /** Séances notées que la projection lit sur 28 jours. */
  seances: number
}) {
  const gauche = objectif + 10
  const droite = objectif - 5
  const pos = (m: number) => Math.max(0, Math.min(1, (gauche - m) / (gauche - droite))) * 100
  const aReprendre = minutes - objectif
  const ecartTendance =
    tendance.length > 1 ? tendance[tendance.length - 1].secondes - tendance[0].secondes : 0
  const teinte = lue ? 'var(--ink)' : 'var(--ink-3)'

  // La tendance, en petit : plus vite = plus haut.
  const W = 150
  const H = 54
  const mins = tendance.map((p) => p.minutes)
  const lo = Math.min(...mins)
  const hi = Math.max(...mins)
  const px = (i: number) => 6 + (i * (W - 12)) / Math.max(1, tendance.length - 1)
  const py = (m: number) => (hi === lo ? H / 2 : 8 + ((m - lo) / (hi - lo)) * (H - 16))
  const chemin = tendance.map((p, i) => `${i ? 'L' : 'M'}${px(i)} ${py(p.minutes)}`).join(' ')

  return (
    <section className="carte" style={{ padding: '20px 20px 22px', marginTop: 20, opacity: lue ? 1 : 0.85 }}>
      <p className="etiquette">Forme projetée</p>

      <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px 12px', marginTop: 10 }}>
        <span className="chiffre" style={{ fontSize: 'var(--fs-c-2xl)', lineHeight: 1, color: teinte }}>
          {court(minutes)}
        </span>
        <span style={{ fontSize: 'var(--fs-lead)', color: 'var(--ink-2)' }}>
          {aReprendre > 0 ? `soit ${aReprendre} min à reprendre` : aReprendre === 0 ? "pile sur l'objectif" : `${-aReprendre} min sous l'objectif`}
        </span>
      </div>

      <div style={{ position: 'relative', margin: '28px 4px 0', height: 44 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-detail)', color: 'var(--ink-3)' }}>
          <span>{court(gauche)}</span>
          <span>{court(droite)}</span>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 24, height: 8, borderRadius: 4, background: 'var(--surface-3)' }} />
        <div
          style={{
            position: 'absolute',
            top: 24,
            height: 8,
            left: `${Math.min(pos(minutes), pos(objectif))}%`,
            width: `${Math.abs(pos(objectif) - pos(minutes))}%`,
            borderRadius: 4,
            background: lue ? 'linear-gradient(90deg, var(--neon), var(--accent-2))' : 'var(--border-2)',
          }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 18,
            left: `calc(${pos(objectif)}% - 1.5px)`,
            width: 3,
            height: 20,
            borderRadius: 2,
            background: 'var(--ink)',
          }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 14,
            left: `calc(${pos(minutes)}% - 14px)`,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: lue ? 'var(--neon)' : 'var(--surface-2)',
            border: `3px solid ${lue ? 'var(--ink)' : 'var(--ink-3)'}`,
          }}
        />
      </div>
      <div style={{ position: 'relative', height: 20, margin: '4px 4px 0', fontSize: 'var(--fs-detail)' }}>
        <span style={{ position: 'absolute', left: `${pos(minutes)}%`, transform: 'translateX(-50%)', color: teinte, whiteSpace: 'nowrap' }}>
          {court(minutes)}
        </span>
        <span
          style={{
            position: 'absolute',
            left: `${pos(objectif)}%`,
            transform: 'translateX(-50%)',
            color: 'var(--accent-2)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            // Les deux libellés se chevauchent quand la forme touche
            // l'objectif : celui de l'objectif passe alors dessous.
            top: Math.abs(pos(minutes) - pos(objectif)) < 22 ? 18 : 0,
          }}
        >
          Objectif {court(objectif)}
        </span>
      </div>

      {tendance.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 22 }}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden style={{ flex: 'none' }}>
            <path d={chemin} fill="none" stroke={lue ? 'var(--accent-2)' : 'var(--ink-3)'} strokeWidth={2} strokeLinejoin="round" />
            {tendance.map((p, i) => (
              <circle
                key={i}
                cx={px(i)}
                cy={py(p.minutes)}
                r={i === tendance.length - 1 ? 5 : 3.5}
                fill={i === tendance.length - 1 ? (lue ? 'var(--neon)' : 'var(--surface-2)') : lue ? 'var(--accent-2)' : 'var(--ink-3)'}
                stroke={i === tendance.length - 1 ? 'var(--ink)' : 'none'}
                strokeWidth={1.5}
              />
            ))}
          </svg>
          {/* Le mouvement sur quatre semaines, en secondes : la suite des
              chronos arrondis à la minute (« 3 h 21 → 3 h 20 → 3 h 20 »)
              ne disait rien (retour du 22 septembre). */}
          <div style={{ minWidth: 0 }}>
            <div className="chiffre" style={{ fontSize: 'var(--fs-c-l)', lineHeight: 1, color: teinte }}>
              {ecartTendance === 0 ? 'Stable' : `${ecartTendance < 0 ? '−' : '+'}${formatEcartCourt(Math.abs(ecartTendance))}`}
            </div>
            <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--ink-2)', marginTop: 5, lineHeight: 1.35 }}>
              en 4 semaines, sur {seances} séance{seances > 1 ? 's' : ''} notée{seances > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

    </section>
  )
}
