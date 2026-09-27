/**
 * Un profil du laboratoire, dans son téléphone.
 *
 * C'est l'app entière, en mode démo, sur l'historique d'un des quatre profils
 * (`scenarios.ts`), à une date choisie par le banc d'essai (`labo.html`).
 *
 * Trois choses la distinguent de la démo :
 *
 * 1. **La date est simulée** (`simuler`) : tous les écrans la lisent par
 *    `today()`, et le banc la change pour les quatre profils à la fois.
 * 2. **Les saisies restent**, dans le navigateur, profil par profil. Avancer
 *    d'un jour garde ce qu'on a noté la veille : c'est tout l'objet, jouer sur
 *    les données de demain et voir le programme réagir.
 * 3. **Changer de date remonte l'app** plutôt que de la mettre à jour : les
 *    états qui partent de « aujourd'hui » (le jour affiché, la semaine du
 *    Programme) doivent repartir de la nouvelle date. L'onglet, lui, reste.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { DataProvider, type DonneesDistantes } from '../hooks/DataProvider'
import { CoquilleDemoInterne } from '../App'
import type { Onglet } from '../components/BottomNav'
import { simuler } from '../lib/simulation'
import { ANCRE, construireProfil, profilDe, type CleProfil, type JeuLabo } from './scenarios'
import { PontLabo } from './PontLabo'
import { SOURCE_LABO, cleOnglet, cleSauvegarde } from './messages'


function lire<T>(cle: string): T | null {
  try {
    const brut = localStorage.getItem(cle)
    return brut ? (JSON.parse(brut) as T) : null
  } catch {
    return null
  }
}

function ecrire(cle: string, valeur: unknown) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur))
  } catch {
    // Quota plein : le profil continue en mémoire.
  }
}

const depuisJeu = (jeu: JeuLabo): DonneesDistantes => ({
  // Aucun profil : l'objectif et l'allure sont ceux du plan, identiques pour
  // les quatre. Seule l'histoire du tendon change d'un téléphone à l'autre.
  profil: null,
  logs: jeu.logs,
  feedback: jeu.feedback,
  activites: [],
  ecarts: jeu.ecarts,
  dossards: [],
})

export default function CoquilleLabo({ cle }: { cle: string }) {
  const profil = profilDe(cle)
  const [date, setDate] = useState(() => new URLSearchParams(window.location.search).get('date') ?? ANCRE)
  const jeu = useMemo(() => (profil ? construireProfil(cle as CleProfil) : null), [cle, profil])
  const donnees = useRef<DonneesDistantes | null>(null)
  if (jeu && !donnees.current) donnees.current = lire<DonneesDistantes>(cleSauvegarde(cle)) ?? depuisJeu(jeu)
  const onglet = useRef<Onglet>(lire<Onglet>(cleOnglet(cle)) ?? 'today')

  useEffect(() => {
    const surMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.source !== SOURCE_LABO) return
      if (e.data.type === 'date' && typeof e.data.date === 'string') setDate(e.data.date)
    }
    window.addEventListener('message', surMessage)
    return () => window.removeEventListener('message', surMessage)
  }, [])

  if (!profil || !jeu || !donnees.current)
    return <p style={{ padding: 24 }}>Profil de laboratoire inconnu : « {cle} ».</p>

  // Avant le rendu des écrans : c'est cette date que `today()` rendra.
  simuler(date, `-labo-${cle}`) // donne `cleCoach(cle)` à la mémoire du coach

  return (
    <DataProvider
      key={date}
      userId={`labo-${cle}`}
      demo={donnees.current}
      surChangement={(d) => {
        donnees.current = d
        ecrire(cleSauvegarde(cle), d)
      }}
    >
      <CoquilleDemoInterne
        activities={jeu.activities}
        labo={{
          ongletInitial: onglet.current,
          surOnglet: (o) => {
            onglet.current = o
            ecrire(cleOnglet(cle), o)
          },
          pont: (ctx) => <PontLabo cle={cle} ctx={ctx} />,
        }}
      />
    </DataProvider>
  )
}
