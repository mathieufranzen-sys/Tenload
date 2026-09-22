/**
 * Le chrono d'une course, et le recalage de la forme qui en découle.
 *
 * Arbitré par Mathieu le 16 septembre 2026 : la fin du bloc A était trop tôt
 * pour refaire le test de 3 km, le 10 km du 15 novembre est le bon moment. Une
 * course à fond vaut mieux qu'un test : même effort maximal, mais sur une
 * durée plus proche de ce qu'on prépare, et sans séance à ajouter au plan.
 *
 * Deux temps, parce que la forme projetée recalcule toute l'app : on voit
 * d'abord ce que le chrono donnerait, on l'applique ensuite.
 */
import { BoutonAction } from './BoutonAction'
import { useState } from 'react'
import type { Session } from '../data/types'
import { MARATHON_KM, chronoPlausible, formatDuration, formatPace, projeterMarathon } from '../lib/paces'

/**
 * Seules les courses qui disent quelque chose de l'endurance recalent : 10 km
 * et plus. Le marathon, lui, est l'aboutissement, pas une mesure pour la suite.
 */
export const recalageSurCourse = (s: Session): boolean =>
  s.type === 'course' && s.dist != null && s.dist >= 10 && s.dist < 40

/** `h:mm:ss` ou `mm:ss`, les deux-points posés tout seuls : le clavier numérique n'en a pas. */
export function formaterChronoLong(brut: string): string {
  const c = brut.replace(/\D/g, '').slice(0, 6)
  if (c.length <= 2) return c
  if (c.length <= 4) return `${c.slice(0, -2)}:${c.slice(-2)}`
  return `${c.slice(0, -4)}:${c.slice(-4, -2)}:${c.slice(-2)}`
}

export function lireChrono(texte: string): number | null {
  const parts = texte.split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n)) || parts.length < 2 || parts.length > 3) return null
  const [h, m, s] = parts.length === 3 ? parts : [0, ...parts]
  if (m > 59 || s > 59) return null
  return h * 3600 + m * 60 + s
}

const versTexte = (sec: number): string => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mmss = `${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`
  return h ? `${h}:${mmss}` : mmss
}

interface Props {
  km: number
  chronoSaisi: number | null
  formeActuelle: number
  disabled: boolean
  onValider: (chronoSecondes: number, allure: number) => void
}

export function ChronoCourse({ km, chronoSaisi, formeActuelle, disabled, onValider }: Props) {
  const [saisie, setSaisie] = useState(chronoSaisi != null ? versTexte(chronoSaisi) : '')
  const [applique, setApplique] = useState(false)

  const secondes = lireChrono(saisie)
  const valide = secondes != null && chronoPlausible(km, secondes)
  const allure = valide ? projeterMarathon(km, secondes!) : null
  const ecart = allure != null ? allure - formeActuelle : null

  return (
    <div className="carte" style={{ padding: '16px 16px' }}>
      <input
        type="text"
        inputMode="numeric"
        placeholder={km >= 20 ? '1:30:40' : '40:12'}
        value={saisie}
        disabled={disabled}
        onChange={(e) => {
          setSaisie(formaterChronoLong(e.target.value))
          setApplique(false)
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: 'var(--surface-2)',
          border: `1px solid ${saisie && !valide ? 'var(--c-erreur)' : 'var(--border-2)'}`,
          borderRadius: 'var(--pill)',
          padding: '14px 20px',
          fontSize: 24,
          fontFamily: 'var(--font-display)',
          color: 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
        }}
      />

      {!saisie || !valide ? (
        <p style={{ color: saisie ? 'var(--c-erreur)' : 'var(--ink-3)', fontSize: 12.5, fontWeight: 600, margin: '8px 2px 0' }}>
          {saisie ? 'Chrono hors plage plausible pour cette distance' : `Ton temps officiel sur ${formatDistance(km)}, en ${km >= 20 ? 'h:mm:ss' : 'mm:ss'}`}
        </p>
      ) : (
        <>
          <p style={{ fontSize: 14.5, lineHeight: 1.5, margin: '12px 2px 4px' }}>
            Soit {formatPace(secondes! / km)}/km. Forme projetée à <b>{formatPace(allure!)}/km</b>, soit{' '}
            <b>{formatDuration(Math.round((allure! * MARATHON_KM) / 60))}</b> au marathon.
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 2px 14px' }}>
            {ecart === 0
              ? 'Exactement ta forme projetée actuelle : la course confirme le test.'
              : `${Math.abs(ecart!)} s/km ${ecart! < 0 ? 'plus vite' : 'plus lent'} que ta forme projetée actuelle (${formatPace(formeActuelle)}/km). Les allures d'entraînement ne bougent pas : elles restent ancrées sur l'objectif.`}
          </p>
          <BoutonAction
            icone="check"
            disabled={disabled || applique}
            onClick={() => {
              onValider(secondes!, allure!)
              setApplique(true)
            }}
          >
            {applique ? 'Forme recalée sur ce chrono' : 'Recaler ma forme sur ce chrono'}
          </BoutonAction>
        </>
      )}
    </div>
  )
}

const formatDistance = (km: number): string => (Number.isInteger(km) ? `${km} km` : `${String(km).replace('.', ',')} km`)
