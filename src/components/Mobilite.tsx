/**
 * La mobilité dans Suivi : la série, le record, et la page
 * des exercices (17 octobre 2026).
 *
 * Les exercices vivent ici et pas dans le Programme : Mathieu ne veut pas
 * d'une séance quotidienne de plus dans son plan. La page se coche au fil
 * des exercices, pour soi, et un seul bouton écrit le geste du carnet : la
 * série ne lit que lui, une saisie et une seule source.
 */
import { useState } from 'react'
import { useJournal } from '../hooks/DataProvider'
import type { DailyLogRow } from '../lib/buildPain'
import { EXERCICES_MOBILITE, joursMobilite, serieMobilite, type ZoneMobilite } from '../lib/mobilite'
import { BoutonAction } from './BoutonAction'
import { Icon } from './Icon'

/**
 * Huit semaines, un carré par jour, deux semaines par ligne : le même dessin
 * que l'ouverture du volume (choisi par Mathieu le 18 octobre 2026). Une
 * série se lit mieux en carrés qu'en chiffre, et un trou se voit comme un
 * trou. Aujourd'hui, pas encore fait, reste en pointillés : la journée n'est
 * pas finie.
 */
const PAR_LIGNE = 14
const W = 320
const ECART = 3
const COTE = (W - (PAR_LIGNE - 1) * ECART) / PAR_LIGNE

export function CarteMobilite({ now, logs }: { now: string; logs: DailyLogRow[] }) {
  const s = serieMobilite(logs, now)
  const jours = joursMobilite(logs, now)
  const lignes = Math.ceil(jours.length / PAR_LIGNE)
  const H = lignes * COTE + (lignes - 1) * ECART

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="chiffre" style={{ fontSize: 'var(--fs-c-l)', lineHeight: 1 }}>
          {s.enCours}
        </span>
        <span style={{ fontSize: 'var(--fs-texte)', color: 'var(--accent)' }}>
          {s.enCours > 1 ? 'jours d’affilée' : 'jour d’affilée'}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', marginTop: 14 }} role="img" aria-label={`Mobilité sur huit semaines : ${s.sur28} jours sur les 28 derniers`}>
        {jours.map((j, i) => {
          const x = (i % PAR_LIGNE) * (COTE + ECART)
          const y = Math.floor(i / PAR_LIGNE) * (COTE + ECART)
          return j.fait ? (
            <rect key={j.day} x={x} y={y} width={COTE} height={COTE} rx={3} fill="var(--chart-1)" />
          ) : (
            <rect
              key={j.day}
              x={x + 0.75}
              y={y + 0.75}
              width={COTE - 1.5}
              height={COTE - 1.5}
              rx={3}
              fill="none"
              stroke="var(--border-2)"
              strokeWidth={1.5}
              strokeDasharray={j.day === now ? '3 2' : undefined}
            />
          )
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 10, fontSize: 'var(--fs-detail)', color: 'var(--sur-ink-3)' }}>
        <span>Record {s.record} jour{s.record > 1 ? 's' : ''}</span>
        <span>{s.sur28} jour{s.sur28 > 1 ? 's' : ''} sur les 28 derniers</span>
      </div>
    </div>
  )
}

const ZONES: ZoneMobilite[] = ['Cheville et pied', 'Hanche', 'Genou', 'Dos']

/** Sans carnet branché (instantanés de démonstration), la page se lit sans rien écrire. */
export function PageMobilite({ now, journalActif }: { now: string; journalActif: boolean }) {
  const [coches, setCoches] = useState<Set<string>>(new Set())
  const basculer = (id: string) =>
    setCoches((c) => {
      const n = new Set(c)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <div style={{ paddingBottom: 30 }}>
      <p style={{ margin: '0 2px 22px', fontSize: 'var(--fs-texte)', lineHeight: 1.5, color: 'var(--sur-ink-2)' }}>
        Une dizaine de minutes, un jour sans course ou après la séance. Tiens les étirements 30 à 60 s :
        c&apos;est le statique qui gagne le plus d&apos;amplitude. Rien ne doit faire mal.
      </p>

      {ZONES.map((zone) => (
        <section key={zone} style={{ marginBottom: 22 }}>
          <h3 className="display" style={{ margin: '0 2px 10px', fontSize: 'var(--fs-t-carte)', fontWeight: 400 }}>
            {zone}
          </h3>
          <div className="carte" style={{ padding: '4px 16px' }}>
            {EXERCICES_MOBILITE.filter((e) => e.zone === zone).map((e, i) => {
              const coche = coches.has(e.id)
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={coche}
                  disabled={Boolean(e.pause)}
                  onClick={() => basculer(e.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 12,
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 0',
                    color: 'var(--ink)',
                    background: 'transparent',
                    borderTop: i ? '1px solid var(--border)' : undefined,
                    opacity: e.pause ? 0.55 : 1,
                    cursor: e.pause ? 'default' : 'pointer',
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 'var(--fs-body)', fontWeight: 600, textDecoration: coche ? 'line-through' : undefined }}>
                      {e.nom}
                    </span>
                    <span style={{ display: 'block', fontSize: 'var(--fs-meta)', marginTop: 2, color: 'var(--accent)' }}>{e.dose}</span>
                    <span style={{ display: 'block', fontSize: 'var(--fs-meta)', lineHeight: 1.45, marginTop: 4, color: 'var(--sur-ink-2)' }}>
                      {e.pause ?? e.consigne}
                    </span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 2 }}>
                    {!e.pause && (
                      <span
                        aria-hidden
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          border: coche ? 'none' : '1.5px solid var(--border-2)',
                          background: coche ? 'var(--neon)' : 'transparent',
                        }}
                      >
                        {coche && <Icon name="check" size={14} />}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {journalActif && <NoterMobilite now={now} />}
    </div>
  )
}

function NoterMobilite({ now }: { now: string }) {
  const { ligne, enregistrerLog } = useJournal()
  if (ligne(now)?.stretching)
    return (
      <p style={{ margin: '4px 2px 0', fontSize: 'var(--fs-texte)' }}>
        Mobilité notée aujourd&apos;hui.{' '}
        <button
          type="button"
          onClick={() => enregistrerLog(now, { stretching: false })}
          style={{ background: 'transparent', color: 'var(--sur-ink-2)', textDecoration: 'underline', textUnderlineOffset: 3, fontSize: 'inherit', padding: 0 }}
        >
          Retirer
        </button>
      </p>
    )
  return (
    <BoutonAction icone="check" onClick={() => enregistrerLog(now, { stretching: true })}>
      Noter la mobilité du jour
    </BoutonAction>
  )
}
