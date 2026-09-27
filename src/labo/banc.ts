/**
 * Le banc d'essai du laboratoire de charge (`/labo.html`, en dev).
 *
 * Quatre téléphones, un calendrier. Le banc ne calcule rien : chaque
 * téléphone est l'app entière dans une iframe (`?labo=<profil>`), et le banc
 * ne fait que trois choses :
 *
 * 1. porter la DATE commune, et la pousser aux quatre à chaque changement ;
 * 2. afficher l'état que chaque téléphone lui renvoie (indice, bande, carnet
 *    et séances du jour), pour qu'on compare d'un coup d'œil ;
 * 3. offrir des commandes rapides — raideur, douleur du soir, excentrique,
 *    séances faites ou sautées — qui passent par les mêmes chemins que l'app.
 *    Le détail (effort perçu d'une séance, gestes) se règle dans l'app.
 *
 * Pas de React ici : une page d'outil, du DOM et des messages.
 */
import '../styles/global.css'
import './banc.css'
import { ANCRE, PROFILS } from './scenarios'
import { ENCRE_BANDE, TEINTE_BANDE } from '../lib/teintes'
import { DAYS_LONG, addDays, daysBetween, formatNumber, weekdayIndex } from '../lib/dates'
import type { BandKey } from '../lib/tendonIndex'
import { CLE_DATE, SOURCE_LABO, cleCoach, cleOnglet, cleSauvegarde, type EtatLabo } from './messages'

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]
const NOM_BANDE: Record<string, string> = { vert: 'Vert', jaune: 'Jaune', orange: 'Orange', rouge: 'Rouge', noir: 'Noir' }
const LARGEUR = 390
const HAUTEUR = 844

const iso = /^\d{4}-\d{2}-\d{2}$/
let date = (() => {
  try {
    const d = localStorage.getItem(CLE_DATE)
    return d && iso.test(d) ? d : ANCRE
  } catch {
    return ANCRE
  }
})()

const dateLongue = (d: string) => {
  const [a, m, j] = d.split('-').map(Number)
  return `${DAYS_LONG[weekdayIndex(d)]} ${j} ${MOIS[m - 1]} ${a}`
}
const relatif = (d: string) => {
  const n = daysBetween(ANCRE, d)
  const ancre = `${Number(ANCRE.slice(8))} ${MOIS[Number(ANCRE.slice(5, 7)) - 1]}`
  return n === 0 ? `Jour de départ des profils, ${ancre}` : `J${n > 0 ? '+' : '−'}${Math.abs(n)} depuis le ${ancre}`
}

/** Les valeurs d'un curseur de douleur : de 0 à 10 par demi-point. */
const VALEURS = Array.from({ length: 21 }, (_, i) => i / 2)

// ─── Structure ──────────────────────────────────────────────────────────────

const racine = document.getElementById('banc')!
racine.innerHTML = `
  <header class="banc-barre">
    <div class="banc-titre">
      <h1 class="display">Laboratoire de charge</h1>
      <p>Quatre histoires de tendon, un seul plan, un seul objectif. Le temps avance pour les quatre à la fois.</p>
    </div>
    <div class="banc-temps">
      <button class="rond" data-pas="-1" aria-label="Jour précédent" title="Jour précédent (←)">‹</button>
      <div class="banc-date">
        <div class="jour display" id="banc-jour"></div>
        <div class="relatif" id="banc-relatif"></div>
      </div>
      <button class="rond" data-pas="1" aria-label="Jour suivant" title="Jour suivant (→)">›</button>
      <input type="date" id="banc-saisie-date" aria-label="Aller à une date" />
      <button class="banc-bouton" data-pas="7">+ 7 jours</button>
      <button class="banc-bouton" id="banc-ancre">Revenir au départ</button>
      <button class="banc-bouton" id="banc-tout">Tout réinitialiser</button>
    </div>
  </header>
  <main class="banc-grille" id="banc-grille"></main>
`

const grille = document.getElementById('banc-grille')!
const iframes = new Map<string, HTMLIFrameElement>()

for (const p of PROFILS) {
  const col = document.createElement('section')
  col.className = 'banc-colonne carte'
  col.dataset.cle = p.cle
  col.innerHTML = `
    <div class="banc-entete">
      <h2 class="display">${p.nom}</h2>
      <p>${p.resume}</p>
    </div>
    <div class="banc-indice" data-role="indice"><span class="banc-vide">Chargement…</span></div>
    <div class="banc-ecran"><iframe title="${p.nom}"></iframe></div>
    <div class="banc-commandes">
      <label class="banc-ligne">Raideur au réveil <select data-champ="reveil"></select></label>
      <label class="banc-ligne">Douleur en fin de journée <select data-champ="soir"></select></label>
      <label class="banc-ligne">Excentrique fait <input type="checkbox" data-champ="excentrique" /></label>
      <div class="banc-seances" data-role="seances"></div>
      <div class="banc-actions">
        <button class="banc-bouton" data-seances="faites">Séances faites</button>
        <button class="banc-bouton" data-seances="sautees">Séances sautées</button>
      </div>
      <button class="banc-lien" data-role="reinit">Réinitialiser ce profil</button>
    </div>
  `
  for (const select of col.querySelectorAll('select')) {
    select.innerHTML =
      `<option value="">—</option>` +
      VALEURS.map((v) => `<option value="${v}">${formatNumber(v)}</option>`).join('')
  }
  grille.appendChild(col)

  const iframe = col.querySelector('iframe')!
  iframes.set(p.cle, iframe)
  charger(p.cle)
}

function charger(cle: string) {
  iframes.get(cle)!.src = `/?labo=${encodeURIComponent(cle)}&date=${date}`
}

// ─── La date commune ────────────────────────────────────────────────────────

function poserDate(nouvelle: string) {
  if (!iso.test(nouvelle)) return
  date = nouvelle
  try {
    localStorage.setItem(CLE_DATE, date)
  } catch {
    // Sans stockage, la date reste en mémoire le temps de la page.
  }
  document.getElementById('banc-jour')!.textContent = dateLongue(date)
  document.getElementById('banc-relatif')!.textContent = relatif(date)
  ;(document.getElementById('banc-saisie-date') as HTMLInputElement).value = date
  for (const iframe of iframes.values()) {
    iframe.contentWindow?.postMessage({ source: SOURCE_LABO, type: 'date', date }, window.location.origin)
  }
}

document.querySelectorAll<HTMLButtonElement>('[data-pas]').forEach((b) =>
  b.addEventListener('click', () => poserDate(addDays(date, Number(b.dataset.pas)))),
)
document.getElementById('banc-saisie-date')!.addEventListener('change', (e) => {
  poserDate((e.target as HTMLInputElement).value)
})
document.getElementById('banc-ancre')!.addEventListener('click', () => poserDate(ANCRE))
document.addEventListener('keydown', (e) => {
  const cible = e.target as HTMLElement
  if (cible.closest('input, select, textarea')) return
  if (e.key === 'ArrowRight') poserDate(addDays(date, 1))
  if (e.key === 'ArrowLeft') poserDate(addDays(date, -1))
})

// ─── Remise à zéro ──────────────────────────────────────────────────────────

function oublier(cle: string) {
  try {
    for (const k of [cleSauvegarde(cle), cleOnglet(cle), cleCoach(cle)]) localStorage.removeItem(k)
  } catch {
    // Rien à oublier.
  }
}

document.getElementById('banc-tout')!.addEventListener('click', () => {
  if (!confirm('Effacer toutes les saisies des quatre profils et revenir au départ ?')) return
  for (const p of PROFILS) oublier(p.cle)
  date = ANCRE
  poserDate(ANCRE)
  for (const p of PROFILS) charger(p.cle)
})

// ─── Commandes rapides ──────────────────────────────────────────────────────

const envoyer = (cle: string, message: Record<string, unknown>) =>
  iframes.get(cle)?.contentWindow?.postMessage({ source: SOURCE_LABO, ...message }, window.location.origin)

grille.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement
  const cle = (el.closest('[data-cle]') as HTMLElement | null)?.dataset.cle
  const champ = el.dataset.champ
  if (!cle || !champ) return
  if (champ === 'excentrique') envoyer(cle, { type: 'excentrique', valeur: (el as HTMLInputElement).checked })
  else envoyer(cle, { type: 'saisie', champ, valeur: el.value === '' ? null : Number(el.value) })
})

grille.addEventListener('click', (e) => {
  const el = e.target as HTMLElement
  const col = el.closest('[data-cle]') as HTMLElement | null
  if (!col) return
  const cle = col.dataset.cle!
  if (el.dataset.seances) envoyer(cle, { type: 'seances', etat: el.dataset.seances })
  if (el.dataset.role === 'reinit') {
    if (!confirm('Effacer les saisies de ce profil ?')) return
    oublier(cle)
    charger(cle)
  }
})

// ─── Ce que les téléphones renvoient ────────────────────────────────────────

window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return
  const m = e.data as EtatLabo
  if (m?.source !== SOURCE_LABO || m.type !== 'etat') return
  const col = grille.querySelector<HTMLElement>(`[data-cle="${m.cle}"]`)
  if (!col) return

  // Un téléphone qui répond à une date périmée est encore en train de
  // remonter : son état arrivera dans un instant.
  if (m.date !== date) return

  const bande = m.bande as BandKey
  const inconnu = m.douleurInconnue
  col.querySelector('[data-role="indice"]')!.innerHTML = inconnu
    ? `<span class="chiffre">?</span><span class="bande" style="background:var(--surface-3)">Je ne sais pas</span>`
    : `<span class="chiffre">${m.idx}</span>
       <span class="bande" style="background:${TEINTE_BANDE[bande]};color:${ENCRE_BANDE[bande]}">${NOM_BANDE[bande] ?? bande}</span>
       ${m.chargeInconnue ? '<span class="alerte">Charge non attestée</span>' : ''}`

  const valeur = (v: number | null) => (v == null ? '' : String(v))
  const reveil = col.querySelector<HTMLSelectElement>('[data-champ="reveil"]')!
  const soir = col.querySelector<HTMLSelectElement>('[data-champ="soir"]')!
  if (document.activeElement !== reveil) reveil.value = valeur(m.reveil)
  if (document.activeElement !== soir) soir.value = valeur(m.soir)
  col.querySelector<HTMLInputElement>('[data-champ="excentrique"]')!.checked = m.excentrique

  const libelle = { afaire: 'À faire', faite: 'Faite', sautee: 'Sautée' }
  col.querySelector('[data-role="seances"]')!.innerHTML = m.seances.length
    ? m.seances
        .map((s) => `<div class="banc-seance"><span>${s.titre}</span><span class="etat ${s.etat}">${libelle[s.etat]}</span></div>`)
        .join('')
    : `<div class="banc-vide">Pas de séance ce jour-là</div>`
})

// ─── Mise à l'échelle ───────────────────────────────────────────────────────

/**
 * Quatre téléphones de 390 × 844 ne tiennent pas côte à côte sur un écran
 * ordinaire : ils sont réduits à la même échelle. Sous la moitié de leur
 * taille ils deviennent illisibles, et le banc passe alors à deux colonnes.
 */
function ajuster() {
  const style = getComputedStyle(grille)
  const largeur = grille.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const ecart = 16
  const marge = 30 // retrait intérieur de la carte, deux côtés
  let colonnes = 4
  let echelle = Math.min(1, ((largeur - ecart * (colonnes - 1)) / colonnes - marge) / LARGEUR)
  if (echelle < 0.5) {
    colonnes = 2
    echelle = Math.min(1, ((largeur - ecart) / colonnes - marge) / LARGEUR)
  }
  grille.style.gridTemplateColumns = `repeat(${colonnes}, minmax(0, 1fr))`
  grille.querySelectorAll<HTMLElement>('.banc-ecran').forEach((ecran) => {
    ecran.style.width = `${LARGEUR * echelle}px`
    ecran.style.height = `${HAUTEUR * echelle}px`
    ecran.style.borderRadius = `${34 * echelle + 6}px`
    ecran.querySelector('iframe')!.style.transform = `scale(${echelle})`
  })
}

window.addEventListener('resize', ajuster)
ajuster()
poserDate(date)
