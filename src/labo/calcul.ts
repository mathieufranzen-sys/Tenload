/**
 * Les sources du calcul de la charge (`/calcul.html`, en dev).
 *
 * Demandé par Mathieu le 1er octobre 2026 : chaque valeur du calcul, d'où
 * elle vient, et ce qui n'a pas de source. Les zones rouges ont été
 * confrontées à la littérature ; quand une source a été trouvée, la page
 * montre la valeur actuelle et la valeur proposée côte à côte.
 *
 * Les coûts actuels sont lus dans `tendonIndex.ts` : la colonne « Actuel »
 * ne peut pas mentir sur le modèle. Les propositions ne sont PAS appliquées,
 * c'est à Mathieu de les arbitrer une par une.
 *
 * Pas de React ici : une page d'outil, comme le banc.
 */
import '../styles/global.css'
import './calcul.css'
import { KM_COST, MIN_COST } from '../lib/tendonIndex'
import { formatNumber } from '../lib/dates'

type Statut = 'ref' | 'inspire' | 'origine'

interface Source {
  nom: string
  url?: string
}

interface Ligne {
  element: string
  actuel: string
  statut: Statut
  /** Absent : la recherche n'a rien trouvé qui change la valeur. */
  propose?: string
  statutPropose?: Statut
  pourquoi: string
  sources?: Source[]
}

interface Section {
  titre: string
  intro?: string
  lignes: Ligne[]
}

const n = (v: number) => formatNumber(v, 2).replace(/(,\d)0$/, '$1')

const S = {
  silbernagel2007: { nom: 'Silbernagel et al. 2007, AJSM' },
  silbernagelCrossley: { nom: 'Silbernagel et Crossley 2015, JOSPT', url: 'https://www.jospt.org/doi/10.2519/jospt.2015.5885' },
  magnusson: { nom: 'Magnusson, Langberg et Kjær 2010, Nat Rev Rheumatol' },
  cook: { nom: 'Cook et Purdam 2009, BJSM' },
  beyer: { nom: 'Beyer et al. 2015, AJSM' },
  jospt: { nom: 'Martin et al., recommandation JOSPT 2018, révisée 2024' },
  gabbett: { nom: 'Gabbett 2016, BJSM' },
  williams: { nom: 'Williams et al. 2017, BJSM' },
  murray: { nom: 'Murray et al. 2017, BJSM' },
  impellizzeri: { nom: 'Impellizzeri et al. 2020, IJSPP' },
  frandsen: { nom: 'Frandsen et al. 2025, BJSM' },
  nielsen: { nom: 'Nielsen et al. 2014, JOSPT' },
  bohm: { nom: 'Bohm, Mersmann et Arampatzis 2015, Sports Med Open' },
  firminger: {
    nom: 'Firminger et al. 2020, MSSE : charge et dommage cumulés selon la vitesse',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31985576/',
  },
  vanHooren: {
    nom: 'Van Hooren, van Rengs et Meijer 2024, SJMSS : vitesse, pente et cadence',
    url: 'https://pubmed.ncbi.nlm.nih.gov/38389144/',
  },
  baggaley: {
    nom: 'Baggaley et Edwards 2017, MSSE (résumé) : impulsion pondérée selon la vitesse',
    url: 'https://www.researchgate.net/publication/318097855',
  },
  semi: {
    nom: 'Frontiers in Public Health 2026 : charge du tendon le long d’un semi-marathon',
    url: 'https://pubmed.ncbi.nlm.nih.gov/41647743/',
  },
  jsams: {
    nom: 'J Sci Med Sport 2026 : forces du tendon sur 30 min chez des coureurs tendinopathiques',
    url: 'https://www.sciencedirect.com/science/article/pii/S1440244026003233',
  },
  demangeot: {
    nom: 'Demangeot et al. 2023, SJMSS : revue systématique des charges du tendon d’Achille',
    url: 'https://onlinelibrary.wiley.com/doi/abs/10.1111/sms.14242',
  },
  ericson: {
    nom: 'Ericson et al. 1985 : forces à la cheville sur ergocycle',
    url: 'https://pubmed.ncbi.nlm.nih.gov/4076940',
  },
  heelRaise: {
    nom: 'Achilles Tendon Loading During Heel-Raising and -Lowering Exercises',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5343533/',
  },
  deformation: {
    nom: 'Revue 2023 des déformations du tendon d’Achille in vivo',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10356630/',
  },
  hollandais: {
    nom: 'Sports Med 2021 : rapport aigu sur chronique chez 435 coureurs néerlandais',
    url: 'https://pubmed.ncbi.nlm.nih.gov/34052983/',
  },
  foster: { nom: 'Foster 1998, MSSE : monotonie et contrainte d’entraînement' },
  hydratation: {
    nom: 'Haut et Haut 1997, J Biomech : hydratation du tendon rotulien, sur pièce de laboratoire',
    url: 'https://pubmed.ncbi.nlm.nih.gov/8970928/',
  },
  carnet: { nom: 'Ton carnet et ton historique Strava, mai à août 2026' },
} satisfies Record<string, Source>

const SECTIONS: Section[] = [
  {
    titre: 'Charge d’une journée',
    intro: 'En kilomètres-équivalents : 1 km d’endurance vaut 1 point.',
    lignes: [
      {
        element: 'Course, coût au kilomètre selon l’allure',
        actuel: `Récup ${n(KM_COST.recup)} · EF ${n(KM_COST.ef)} · AM ${n(KM_COST.am)} · semi ${n(KM_COST.semi)} · seuil ${n(KM_COST.seuil)} · VO2 ${n(KM_COST.vo2)}`,
        statut: 'origine',
        propose: 'Récup 0,95 · EF 1 · AM 1,1 · semi 1,15 · seuil 1,2 · VO2 1,35',
        statutPropose: 'inspire',
        pourquoi:
          'Au kilomètre, la charge cumulée du tendon baisse quand on accélère : moins d’appuis, chacun plus fort. Le dommage cumulé, qui pondère les appuis forts, reste stable ou monte peu, et la hausse n’est pas significative pour le tendon d’Achille chez Van Hooren. Un fractionné ne vaut donc pas deux fois l’endurance. Le sens et l’ordre de grandeur viennent des sources, les valeurs exactes restent une estimation.',
        sources: [S.firminger, S.vanHooren, S.baggaley],
      },
      {
        element: 'Sortie longue',
        actuel: `${n(KM_COST.long)} par km, dès le premier`,
        statut: 'origine',
        propose: '1 jusqu’à 20 km, 1,15 par km au-delà',
        statutPropose: 'inspire',
        pourquoi:
          'La force sur le tendon baisse sur les dix premiers kilomètres et remonte après 20 km, quand la fatigue s’installe. Sur 30 minutes, elle baisse même chez des coureurs en reprise de tendinopathie. Le surcoût ne vaut donc que pour la fin des longues.',
        sources: [S.semi, S.jsams],
      },
      {
        element: 'Marche',
        actuel: '0,5 par km',
        statut: 'origine',
        propose: '0,5 par km, inchangé',
        statutPropose: 'inspire',
        pourquoi:
          'La marche charge le tendon à 2,7 à 3,95 fois le poids du corps, la course à 4,15 à 7,71 : environ la moitié au pic. La valeur tient.',
        sources: [S.demangeot],
      },
      {
        element: 'Vélo',
        actuel: `${n(MIN_COST.velo)} par minute`,
        statut: 'origine',
        propose: '0,05 par minute en Z2, 0,10 en Z3',
        statutPropose: 'inspire',
        pourquoi:
          'Sur ergocycle, le tendon porte environ 1,1 fois le poids du corps en moyenne, et la force monte avec la puissance. C’est quatre à six fois moins que la course au pic. Ton carnet reste la seule mesure qui donne un coût au vélo : tes deux pics du soir suivaient du Z3. D’où un vélo facile moins cher et un Z3 inchangé. Touche une décision à ne pas défaire : le vélo reste non neutre.',
        sources: [S.ericson, S.carnet],
      },
      {
        element: 'Renfo bas',
        actuel: `${n(MIN_COST['muscu-bas'])} par minute`,
        statut: 'origine',
        propose: '0,08 par minute, inchangé',
        statutPropose: 'inspire',
        pourquoi:
          'Selon l’exercice, de 0,41 à 7,3 fois le poids du corps ; la montée sur une jambe charge le plus, assis le moins. Une séance compte environ 150 répétitions, contre plusieurs milliers d’appuis sur 10 km. La valeur tient, la source la situe.',
        sources: [S.demangeot, S.heelRaise, S.beyer, S.magnusson],
      },
      {
        element: 'Escalade',
        actuel: `${n(MIN_COST.escalade)} par minute`,
        statut: 'origine',
        pourquoi: 'Aucune mesure de la charge du tendon d’Achille en escalade trouvée.',
      },
      {
        element: 'Randonnée',
        actuel: `${n(MIN_COST.hike)} par minute`,
        statut: 'origine',
        propose: `${n(MIN_COST.hike)} par minute, inchangé`,
        statutPropose: 'inspire',
        pourquoi: 'À 5 km/h, c’est le coût de la marche ramené à la minute : 0,5 × 5 / 60, soit 0,04. Cohérent.',
        sources: [S.demangeot],
      },
    ],
  },
  {
    titre: 'Charges de référence',
    lignes: [
      {
        element: 'Moyenne exponentielle',
        actuel: 'Pondération qui oublie le passé progressivement, sur 60 jours',
        statut: 'ref',
        pourquoi: 'Plus sensible que les moyennes glissantes.',
        sources: [S.williams, S.murray],
      },
      {
        element: 'Demi-vies',
        actuel: 'Aiguë 3,5 jours, chronique 14 jours',
        statut: 'inspire',
        pourquoi: 'Les sources utilisent l’équivalent de 7 et 28 jours. Les tiennes sont ta décision du 28 septembre.',
        sources: [S.williams],
      },
    ],
  },
  {
    titre: 'Termes de l’indice',
    intro: 'Indice = emballement + fraîcheur + douleur + tendance + monotonie − gestes, puis jamais sous le plancher du jour.',
    lignes: [
      {
        element: 'Emballement (30 points)',
        actuel: 'Compte dès un rapport aigu/chronique de 0,9, plein à 1,6',
        statut: 'inspire',
        propose: 'Compte dès 1,3, plein à 1,8',
        statutPropose: 'inspire',
        pourquoi:
          'Gabbett place le risque le plus bas entre 0,8 et 1,3 : y donner des points contredit la source. Chez 435 coureurs loisirs, un rapport élevé ne prédisait pas plus de blessures. Impellizzeri conteste sa valeur prédictive. Le seuil de 1,3 vient des sources, le plein à 1,8 est un choix.',
        sources: [S.gabbett, S.hollandais, S.impellizzeri],
      },
      {
        element: 'Fraîcheur (20 points)',
        actuel: 'Veille + 0,55 × avant-veille, plein à 2,6 fois la charge habituelle',
        statut: 'origine',
        propose: 'Ne compte que l’excès au-delà de 1,55 fois la charge habituelle',
        statutPropose: 'inspire',
        pourquoi:
          'La fenêtre de 48 h suit le collagène, en perte nette 24 à 36 h après une charge. Le 2,6 a été calibré sur ton été Strava, à presque deux activités par jour : avec quatre courses par semaine, une séance ordinaire remplissait le terme. Aucune source ne chiffre l’échelle ; 1,55 est la valeur d’une journée régulière, veille plus 55 % de l’avant-veille.',
        sources: [S.magnusson, S.carnet],
      },
      {
        element: 'Douleur, pondération',
        actuel: 'Réveil 45 %, soir de la veille 35 %, effort de la veille 20 %',
        statut: 'inspire',
        pourquoi: 'La réponse du lendemain matin compte le plus. Les poids sont de l’app.',
        sources: [S.silbernagel2007],
      },
      {
        element: 'Douleur, pic sur 72 h',
        actuel: '55 % du mélange, 45 % du maximum',
        statut: 'origine',
        pourquoi: 'Aucune source trouvée. Choix pour qu’un pic isolé ne soit pas dilué.',
      },
      {
        element: 'Douleur, conversion',
        actuel: '85 × (score / 10) puissance 1,15',
        statut: 'origine',
        pourquoi: 'Calibré sur ton carnet : une réponse linéaire alarmait sur ta gêne de fond à 1 ou 2.',
        sources: [S.carnet],
      },
      {
        element: 'Douleur, report sans saisie',
        actuel: 'Décroît sur 3 jours, puis « Je ne sais pas »',
        statut: 'origine',
        pourquoi: 'Arbitré : on ne rassure pas sur un silence.',
      },
      {
        element: 'Tendance (6 points)',
        actuel: 'Pente de la raideur au réveil sur 4 jours, pleine à +1,5 par jour',
        statut: 'inspire',
        propose: 'Raideur moyenne de la semaine contre la semaine d’avant, pleine à +1',
        statutPropose: 'inspire',
        pourquoi:
          'Le modèle de surveillance de la douleur compare d’une semaine à l’autre, pas sur quatre jours. Le +1 reste un choix.',
        sources: [S.silbernagel2007],
      },
      {
        element: 'Monotonie (8 points)',
        actuel: 'Moyenne / écart-type sur 7 jours, de 1,3 à 2,5',
        statut: 'inspire',
        propose: 'Compte dès 2, plein à 2,5',
        statutPropose: 'inspire',
        pourquoi: 'Foster situe le problème au-dessus de 2. Ton plan, avec son dimanche vide, reste en dessous.',
        sources: [S.foster],
      },
      {
        element: 'Excentrique la veille',
        actuel: '−6',
        statut: 'inspire',
        pourquoi:
          'La mise en charge lourde est le traitement, sur des semaines. Le lendemain d’une séance, le collagène est plutôt en perte nette : le −6 récompense l’observance, pas un effet mécanique du jour. Décision à ne pas défaire.',
        sources: [S.beyer, S.jospt, S.magnusson],
      },
      {
        element: 'Repos la veille',
        actuel: '−5 si la charge de la veille est sous 2',
        statut: 'inspire',
        pourquoi: 'Le repos laisse le collagène se reconstruire. Le −5 et le seuil de 2 sont de l’app.',
        sources: [S.magnusson],
      },
      {
        element: 'Sauts la veille',
        actuel: '−2',
        statut: 'origine',
        propose: '0',
        statutPropose: 'inspire',
        pourquoi:
          'En sautillant, le tendon s’étire de 8,3 %, contre 5,8 % en courant : c’est une charge, pas une protection. Silbernagel les réintroduit comme une étape de charge progressive.',
        sources: [S.deformation, S.silbernagel2007],
      },
      {
        element: 'Hydratation ≥ 2 L',
        actuel: '−2',
        statut: 'origine',
        propose: '0',
        statutPropose: 'inspire',
        pourquoi:
          'Les seules études trouvées mesurent des tendons plongés dans une solution en laboratoire, pas l’effet de boire. Aucune preuve chez l’humain. La saisie peut rester, comme le glaçage.',
        sources: [S.hydratation],
      },
      {
        element: 'Glaçage',
        actuel: '0',
        statut: 'ref',
        pourquoi: 'Retiré : pas d’effet démontré sur la charge du tendon.',
      },
    ],
  },
  {
    titre: 'Garde-fous',
    lignes: [
      {
        element: 'Plancher, réveil',
        actuel: '≥ 4 → 50, ≥ 5 → 65, ≥ 7 → 80',
        statut: 'origine',
        pourquoi: 'Tes seuils.',
      },
      {
        element: 'Plancher, effort ou soir',
        actuel: '≥ 4 → 50, ≥ 6 → 65, ≥ 8 → 80',
        statut: 'inspire',
        pourquoi: 'Silbernagel tolère 5 pendant l’effort ; ton orange à 4 est volontairement plus strict.',
        sources: [S.silbernagel2007],
      },
      {
        element: 'Durée du plancher',
        actuel: 'Plein le jour même et le lendemain',
        statut: 'ref',
        pourquoi: 'Perte nette de collagène pendant 24 à 36 h.',
        sources: [S.magnusson],
      },
      {
        element: 'Mémoire d’épisode',
        actuel: 'Après un pic au-dessus de 60 : × 0,74 par jour pendant 5 jours',
        statut: 'origine',
        pourquoi: 'Aucune source ne chiffre la durée de la phase réactive.',
        sources: [S.cook],
      },
      {
        element: 'Confiance',
        actuel: 'Moins de 10 jours attestés sur 14 : charge plafonnée',
        statut: 'origine',
        pourquoi: 'Aucune source trouvée.',
      },
      {
        element: 'Charge inconnue',
        actuel: 'Moins de 5 jours attestés sur 7',
        statut: 'origine',
        pourquoi: 'Aucune source trouvée.',
      },
    ],
  },
  {
    titre: 'Bandes',
    lignes: [
      {
        element: 'Vert, jaune',
        actuel: '0-29, 30-49 : rien ne change',
        statut: 'origine',
        pourquoi:
          'Calibré sur ton été (médiane 23). Si les termes mécaniques changent, une semaine saine tombe vers 0-10 : les bornes seraient à revoir sur le nouveau calcul.',
        sources: [S.carnet],
      },
      {
        element: 'Orange',
        actuel: '50-64 : qualité en vélo, longue −20 %',
        statut: 'inspire',
        pourquoi: 'L’intensité sort en premier. Le −20 % est de l’app.',
        sources: [S.cook],
      },
      {
        element: 'Rouge',
        actuel: '65-79 : aucune course',
        statut: 'inspire',
        pourquoi: 'Pas de course tant que la douleur courante dépasse 2.',
        sources: [S.silbernagelCrossley],
      },
      {
        element: 'Noir',
        actuel: '80-100 : repos des jambes, kiné après 3 jours',
        statut: 'origine',
        pourquoi: 'Aucune source trouvée.',
      },
    ],
  },
  {
    titre: 'Règles du plan, hors indice',
    lignes: [
      {
        element: 'Matin calme',
        actuel: 'Réveil ≤ 2 (2,5 si habituel), soir ≤ 2, effort ≤ 3',
        statut: 'inspire',
        pourquoi: 'Le 2 vient de la source, le 2,5 et le 3 sont tes arbitrages.',
        sources: [S.silbernagelCrossley],
      },
      {
        element: 'Reprise après un épisode',
        actuel: 'Alerte 0/3, crise 2/7, noir 3/14 matins calmes (course/intensité)',
        statut: 'inspire',
        pourquoi: 'Les sources donnent le critère et l’ordre, pas le nombre de matins.',
        sources: [S.cook, S.silbernagelCrossley],
      },
      {
        element: 'Remontée du volume',
        actuel: '+15 % par semaine au plus',
        statut: 'inspire',
        pourquoi: 'Le risque monte au-delà de 30 % sur deux semaines. Le 15 est ton choix.',
        sources: [S.nielsen],
      },
      {
        element: 'Plus longue sortie',
        actuel: '≤ +10 % de la plus longue des 30 jours',
        statut: 'ref',
        pourquoi: 'Le signal de risque le plus net, sur 5 200 coureurs.',
        sources: [S.frandsen],
      },
      {
        element: 'Ouverture du volume',
        actuel: '56 jours calmes, 42 réveils notés',
        statut: 'inspire',
        pourquoi: 'Huit semaines pour modifier un tendon adulte. Les 42 relevés sont de l’app.',
        sources: [S.bohm],
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────── rendu

const LIBELLE: Record<Statut, string> = { ref: 'Référence', inspire: 'Inspiré', origine: 'D’origine' }

const echapper = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const pastille = (s: Statut) => `<span class="statut statut-${s}">${LIBELLE[s]}</span>`

const lien = (s: Source) =>
  s.url
    ? `<a href="${echapper(s.url)}" target="_blank" rel="noreferrer">${echapper(s.nom)}</a>`
    : echapper(s.nom)

function compter(statut: (l: Ligne) => Statut): Record<Statut, number> {
  const c: Record<Statut, number> = { ref: 0, inspire: 0, origine: 0 }
  for (const sec of SECTIONS) for (const l of sec.lignes) c[statut(l)]++
  return c
}

function ligne(l: Ligne): string {
  const change = l.propose != null && l.propose !== l.actuel && !l.propose.endsWith('inchangé')
  const statutApres = l.statutPropose ?? l.statut
  return `
    <tr class="${change ? 'change' : ''}">
      <th scope="row">${echapper(l.element)}</th>
      <td>${echapper(l.actuel)}<div class="sous">${pastille(l.statut)}</div></td>
      <td>${
        l.propose != null
          ? `${echapper(l.propose)}<div class="sous">${pastille(statutApres)}</div>`
          : '<span class="vide">Inchangé</span>'
      }</td>
      <td>
        <p>${echapper(l.pourquoi)}</p>
        ${l.sources?.length ? `<ul class="sources">${l.sources.map((s) => `<li>${lien(s)}</li>`).join('')}</ul>` : ''}
      </td>
    </tr>`
}

function rendre() {
  const avant = compter((l) => l.statut)
  const apres = compter((l) => l.statutPropose ?? l.statut)
  const changes = SECTIONS.flatMap((s) => s.lignes).filter(
    (l) => l.propose != null && !l.propose.endsWith('inchangé') && l.propose !== l.actuel,
  )
  const racine = document.getElementById('calcul')!
  racine.innerHTML = `
    <header class="calcul-tete">
      <h1>Sources du calcul</h1>
      <p>Chaque valeur du calcul de la charge, sa source, et ce qui n’en a pas. La colonne « Actuel » est lue dans le modèle ; la colonne « Proposé » n’est pas appliquée.</p>
      <div class="legende">
        <span>${pastille('ref')} la valeur vient de la source</span>
        <span>${pastille('inspire')} la source donne le principe, la valeur est un choix</span>
        <span>${pastille('origine')} ni principe ni valeur sourcés : calibré sur tes données ou arbitré</span>
      </div>
      <div class="bilan">
        <div><b>${avant.origine} → ${apres.origine}</b><span>d’origine</span></div>
        <div><b>${avant.inspire} → ${apres.inspire}</b><span>inspirés</span></div>
        <div><b>${avant.ref} → ${apres.ref}</b><span>référence</span></div>
        <div><b>${changes.length}</b><span>valeurs à arbitrer</span></div>
      </div>
    </header>
    ${SECTIONS.map(
      (s) => `
      <section class="calcul-section">
        <h2>${echapper(s.titre)}</h2>
        ${s.intro ? `<p class="intro">${echapper(s.intro)}</p>` : ''}
        <div class="table-defile">
          <table>
            <thead><tr><th>Élément</th><th>Actuel</th><th>Proposé</th><th>Pourquoi, et la source</th></tr></thead>
            <tbody>${s.lignes.map(ligne).join('')}</tbody>
          </table>
        </div>
      </section>`,
    ).join('')}
  `
}

rendre()
