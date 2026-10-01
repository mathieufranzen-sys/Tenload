/**
 * Les sources du calcul de la charge (`/calcul.html`, en dev).
 *
 * Demandé par Mathieu le 1er octobre 2026 : chaque valeur du calcul, d'où
 * elle vient, et ce qui n'a pas de source. Les zones rouges ont été
 * confrontées à la littérature ; quand une source a été trouvée, la page
 * montre la valeur d'avant et la nouvelle côte à côte.
 *
 * Les valeurs sont appliquées depuis le 1er octobre 2026, sauf celles
 * marquées `nonApplique` (sommeil, alcool). La colonne « Depuis » lit ses
 * coûts dans `tendonIndex.ts` : elle ne peut pas mentir sur le modèle.
 *
 * En bas, la batterie de scénarios (`batterie.ts`) et ses résultats figés
 * pour chaque version du calcul (`batterie-resultats.json`).
 *
 * Pas de React ici : une page d'outil, comme le banc.
 */
import '../styles/global.css'
import './calcul.css'
import {
  ECHELLE_DOULEUR,
  EMBALLEMENT_DEPART,
  JOURNEE_REGULIERE,
  KM_COST,
  LONGUE_SEUIL_KM,
  MIN_COST,
  SURCOUT_FIN_DE_LONGUE,
  VELO_Z3,
} from '../lib/tendonIndex'
import { SCENARIOS, type Resultat } from './batterie'
import resultats from './batterie-resultats.json'
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
  /** Proposé mais pas appliqué au calcul : en attente d'une décision. */
  nonApplique?: boolean
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
  jospt: { nom: 'Martin et al., recommandation JOSPT 2018' },
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
  // Sources postérieures à 2010, cherchées le 1er octobre 2026 pour doubler
  // celles d'avant : une source ancienne n'est pas fausse, mais une plus
  // récente dit si elle tient encore.
  cpg2024: {
    nom: 'Recommandation JOSPT 2024, 3e révision : mise en charge aussi lourde que toléré, 3 fois par semaine',
    url: 'https://www.jospt.org/doi/10.2519/jospt.2024.0302',
  },
  corrigan: {
    nom: 'Corrigan et al. 2022, SJMSS : la douleur en courant ne suit pas la force sur le tendon',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9972464/',
  },
  cook2016: {
    nom: 'Cook, Rio, Purdam et Docking 2016, BJSM : le modèle du continuum revisité',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27127294/',
  },
  dick: {
    nom: 'Dick, Arnold et Wakeling 2016, J Biomech : 920 N à 115 W, 1 510 N à 370 W sur le vélo',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5074891/',
  },
  trail: {
    nom: 'IJERPH 2020 : 25 traileurs sur 52 semaines, la monotonie monte avant les blessures',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7312824/',
  },
  eau2019: {
    nom: 'Sci Rep 2019 : moins d’eau, tissu plus raide, mesuré sur pièce d’autopsie',
    url: 'https://www.nature.com/articles/s41598-019-44306-z',
  },
  lutteurs: {
    nom: 'BJSM, 67 lutteurs NCAA sur 7 saisons : +11 % de risque de blessure par % de poids perdu en se déshydratant',
    url: 'https://www.med.wisc.edu/news/college-wrestling-injury-study',
  },
  vanDerVlist2019: {
    nom: 'van der Vlist et al. 2019, BJSM : facteurs de risque de la tendinopathie d’Achille',
    url: 'https://pubmed.ncbi.nlm.nih.gov/30718234/',
  },
  milewski: {
    nom: 'Milewski et al. 2014, J Pediatr Orthop : moins de 8 h de sommeil, 1,7 fois plus de blessures',
    url: 'https://www.researchgate.net/publication/263971781',
  },
  dobrosielski: {
    nom: 'Dobrosielski et al. 2021, revue de 12 cohortes : lien sommeil et blessure limité chez l’adulte',
    url: 'https://pubmed.ncbi.nlm.nih.gov/34099605/',
  },
} satisfies Record<string, Source>

const SECTIONS: Section[] = [
  {
    titre: 'Charge d’une journée',
    intro: 'En kilomètres-équivalents : 1 km d’endurance vaut 1 point.',
    lignes: [
      {
        element: 'Course, coût au kilomètre selon l’allure',
        actuel: 'Récup 0,9 · EF 1 · AM 1,35 · semi 1,45 · seuil 1,6 · VO2 2,1',
        statut: 'origine',
        propose: `Récup ${n(KM_COST.recup)} · EF ${n(KM_COST.ef)} · AM ${n(KM_COST.am)} · semi ${n(KM_COST.semi)} · seuil ${n(KM_COST.seuil)} · VO2 ${n(KM_COST.vo2)}`,
        statutPropose: 'inspire',
        pourquoi:
          'Au kilomètre, la charge cumulée du tendon baisse quand on accélère : moins d’appuis, chacun plus fort. Le dommage cumulé, qui pondère les appuis forts, reste stable ou monte peu, et la hausse n’est pas significative pour le tendon d’Achille chez Van Hooren. Un fractionné ne vaut donc pas deux fois l’endurance. Le sens et l’ordre de grandeur viennent des sources, les valeurs exactes restent une estimation.',
        sources: [S.firminger, S.vanHooren, S.baggaley],
      },
      {
        element: 'Sortie longue',
        actuel: '1,15 par km, dès le premier',
        statut: 'origine',
        propose: `${n(KM_COST.long)} jusqu’à ${LONGUE_SEUIL_KM} km, ${n(KM_COST.long + SURCOUT_FIN_DE_LONGUE)} par km au-delà`,
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
        actuel: '0,10 par minute',
        statut: 'origine',
        propose: `${n(MIN_COST.velo)} par minute en Z2, ${n(VELO_Z3)} en Z3`,
        statutPropose: 'inspire',
        pourquoi:
          'Sur ergocycle, le tendon porte environ 1,1 fois le poids du corps en moyenne, et la force monte avec la puissance : +64 % entre 115 et 370 W. C’est quatre à six fois moins que la course au pic. Ton carnet reste la seule mesure qui donne un coût au vélo : tes deux pics du soir suivaient du Z3. D’où un vélo facile moins cher et un Z3 inchangé. Touche une décision à ne pas défaire : le vélo reste non neutre.',
        sources: [S.dick, S.ericson, S.carnet],
      },
      {
        element: 'Renfo bas',
        actuel: '0,08 par minute',
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
        propose: `Compte dès ${n(EMBALLEMENT_DEPART)}, plein à ${n(EMBALLEMENT_DEPART + 0.5)}`,
        statutPropose: 'inspire',
        pourquoi:
          'Gabbett place le risque le plus bas entre 0,8 et 1,3 : y donner des points contredit la source. Chez 435 coureurs loisirs, un rapport élevé ne prédisait pas plus de blessures. Impellizzeri conteste sa valeur prédictive. Le seuil de 1,3 vient des sources, le plein à 1,8 est un choix.',
        sources: [S.gabbett, S.hollandais, S.impellizzeri],
      },
      {
        element: 'Fraîcheur (20 points)',
        actuel: 'Veille + 0,55 × avant-veille, plein à 2,6 fois la charge habituelle',
        statut: 'origine',
        propose: `Ne compte que l’excès au-delà de ${n(JOURNEE_REGULIERE)} fois la charge habituelle`,
        statutPropose: 'inspire',
        pourquoi:
          'La fenêtre de 48 h suit le collagène, en perte nette 24 à 36 h après une charge. Le 2,6 a été calibré sur ton été Strava, à presque deux activités par jour : avec quatre courses par semaine, une séance ordinaire remplissait le terme. Aucune source ne chiffre l’échelle ; 1,55 est la valeur d’une journée régulière, veille plus 55 % de l’avant-veille.',
        sources: [S.magnusson, S.carnet],
      },
      {
        element: 'Douleur, pondération',
        actuel: 'Réveil 45 %, soir de la veille 35 %, effort de la veille 20 %',
        statut: 'inspire',
        pourquoi:
          'La réponse du lendemain matin compte le plus. Chez des coureurs en reprise, la douleur pendant la course ne suivait pas la force sur le tendon : c’est le réveil qui dit l’état du tendon, ce qui justifie son poids. Les poids exacts sont de l’app.',
        sources: [S.silbernagel2007, S.corrigan, S.cpg2024],
      },
      {
        element: 'Douleur, pic sur 72 h',
        actuel: '55 % du mélange, 45 % du maximum',
        statut: 'origine',
        pourquoi: 'Aucune source trouvée. Choix pour qu’un pic isolé ne soit pas dilué.',
      },
      {
        element: 'Douleur, conversion',
        actuel: '85 × (score / 10) puissance 1,15 : une douleur de 3 vaut 21 points',
        statut: 'origine',
        propose: `${ECHELLE_DOULEUR} × (score / 10) puissance 1,15, plafonné à 85 : une douleur de 3 vaut 31 points, le jaune à elle seule`,
        statutPropose: 'inspire',
        pourquoi:
          'La convexité est calibrée sur ton carnet : une réponse linéaire alarmait sur ta gêne de fond à 1 ou 2. Sans le bruit de la charge, un tendon à 3 tous les matins tombait en vert : au-dessus de 2, il n’est pas revenu au calme, d’où le jaune dès 3 (arbitré le 1er octobre). Le facteur exact reste un choix.',
        sources: [S.carnet, S.silbernagelCrossley],
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
          'Le modèle de surveillance de la douleur compare d’une semaine à l’autre, pas sur quatre jours. La recommandation JOSPT 2024 le reprend. Le +1 reste un choix.',
        sources: [S.silbernagel2007, S.cpg2024],
      },
      {
        element: 'Monotonie (8 points)',
        actuel: 'Moyenne / écart-type sur 7 jours, de 1,3 à 2,5',
        statut: 'inspire',
        propose: 'Compte dès 2, plein à 2,5',
        statutPropose: 'inspire',
        pourquoi: 'Foster situe le problème au-dessus de 2. Chez des traileurs suivis un an, la monotonie montait dans les semaines avant une blessure. Ton plan, avec son dimanche vide, reste en dessous.',
        sources: [S.trail, S.foster],
      },
      {
        element: 'Excentrique la veille',
        actuel: '−6',
        statut: 'inspire',
        pourquoi:
          'La mise en charge lourde est le traitement, sur des semaines. Le lendemain d’une séance, le collagène est plutôt en perte nette : le −6 récompense l’observance, pas un effet mécanique du jour. Décision à ne pas défaire.',
        sources: [S.cpg2024, S.beyer, S.magnusson],
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
        sources: [S.deformation, S.cpg2024, S.silbernagel2007],
      },
      {
        element: 'Hydratation ≥ 2 L',
        actuel: '−2',
        statut: 'origine',
        propose: '−2, inchangé',
        statutPropose: 'inspire',
        pourquoi:
          'Preuve indirecte seulement. Un tendon qui perd de l’eau devient plus raide, mesuré sur pièce de laboratoire. Des lutteurs qui se déshydratent pour la pesée se blessent davantage, mais par une perte de 5 à 7 % du poids, pas par un jour à 1,5 L. Aucune étude ne montre que boire 2 L protège un tendon d’Achille. Le −2 tient comme un geste d’observance, au même titre que l’excentrique.',
        sources: [S.eau2019, S.lutteurs, S.hydratation],
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
        pourquoi: 'Le tendon réactif peut revenir à sa structure si la charge baisse, mais aucune source ne chiffre la durée de cette phase.',
        sources: [S.cook2016, S.cook],
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
        pourquoi: 'Ajouter ou retirer de la charge est ce qui fait avancer ou reculer le tendon sur le continuum ; l’intensité sort en premier. Le −20 % est de l’app.',
        sources: [S.cook2016, S.cook],
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
    titre: 'Facteurs de vie, pas encore saisis',
    intro: 'Proposés par Mathieu le 1er octobre 2026. Ni l’un ni l’autre n’entre dans le calcul : la saisie attend une décision.',
    lignes: [
      {
        element: 'Alcool',
        actuel: 'Non saisi',
        statut: 'origine',
        propose: 'Saisi dans le carnet, lu par les patterns, hors de l’indice',
        statutPropose: 'inspire',
        nonApplique: true,
        pourquoi:
          'Une consommation modérée fait partie des neuf facteurs de risque de la tendinopathie d’Achille, avec un niveau de preuve limité. Trop faible pour chiffrer des points, assez pour chercher le lien dans TON carnet.',
        sources: [S.vanDerVlist2019],
      },
      {
        element: 'Sommeil',
        actuel: 'Non saisi',
        statut: 'origine',
        propose: 'Saisi dans le carnet, lu par les patterns, hors de l’indice',
        statutPropose: 'inspire',
        nonApplique: true,
        pourquoi:
          'Moins de 8 h de sommeil : 1,7 fois plus de blessures chez des adolescents. Chez l’adulte, la revue de douze cohortes trouve un lien limité. Rien de propre au tendon d’Achille.',
        sources: [S.milewski, S.dobrosielski],
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
        element: 'Douleur de fond',
        actuel: 'Aucune règle : seul un relevé à 4 ouvrait un épisode',
        statut: 'origine',
        propose: 'Trois matins de suite qui ne sont pas calmes : une alerte, l’intensité attend trois matins calmes',
        statutPropose: 'inspire',
        pourquoi:
          'Un tendon à 3 tous les matins recevait le plan entier. La source demande 2 ou moins avant de reprendre la course et les sauts ; l’app garde la course et retire l’intensité, comme après une alerte. Les trois matins sont un choix.',
        sources: [S.silbernagelCrossley, S.cook2016],
      },
      {
        element: 'Reprise après un épisode',
        actuel: 'Alerte 0/3, crise 2/7, noir 3/14 matins calmes (course/intensité)',
        statut: 'inspire',
        pourquoi: 'Les sources donnent le critère et l’ordre, pas le nombre de matins.',
        sources: [S.cook2016, S.silbernagelCrossley],
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

/** Une source d'avant 2010 se signale : elle a été doublée par une plus récente quand il y en avait une. */
const ancienne = (s: Source) => {
  const an = Number(s.nom.match(/\b(19|20)\d{2}\b/)?.[0])
  return an > 0 && an < 2010
}

const lien = (s: Source) =>
  (s.url
    ? `<a href="${echapper(s.url)}" target="_blank" rel="noreferrer">${echapper(s.nom)}</a>`
    : echapper(s.nom)) + (ancienne(s) ? ' <span class="ancienne">avant 2010</span>' : '')

const applique = (l: Ligne) => l.propose != null && !l.nonApplique && !l.propose.endsWith('inchangé') && l.propose !== l.actuel
const statutDepuis = (l: Ligne) => (l.nonApplique ? l.statut : (l.statutPropose ?? l.statut))

function compter(statut: (l: Ligne) => Statut): Record<Statut, number> {
  const c: Record<Statut, number> = { ref: 0, inspire: 0, origine: 0 }
  for (const sec of SECTIONS) for (const l of sec.lignes) c[statut(l)]++
  return c
}

function ligne(l: Ligne): string {
  const depuis =
    l.propose == null
      ? '<span class="vide">Inchangé</span>'
      : l.nonApplique
        ? `<span class="vide">Proposé, pas appliqué : ${echapper(l.propose)}</span>`
        : `${echapper(l.propose)}<div class="sous">${pastille(statutDepuis(l))}</div>`
  return `
    <tr class="${applique(l) ? 'change' : ''}">
      <th scope="row">${echapper(l.element)}</th>
      <td>${echapper(l.actuel)}<div class="sous">${pastille(l.statut)}</div></td>
      <td>${depuis}</td>
      <td>
        <p>${echapper(l.pourquoi)}</p>
        ${l.sources?.length ? `<ul class="sources">${l.sources.map((s) => `<li>${lien(s)}</li>`).join('')}</ul>` : ''}
      </td>
    </tr>`
}

function rendre() {
  const avant = compter((l) => l.statut)
  const apres = compter(statutDepuis)
  const changes = SECTIONS.flatMap((s) => s.lignes).filter(applique)
  const racine = document.getElementById('calcul')!
  racine.innerHTML = `
    <header class="calcul-tete">
      <h1>Sources du calcul</h1>
      <p>Chaque valeur du calcul de la charge, sa source, et ce qui n’en a pas. Les valeurs surlignées ont changé le 1er octobre 2026 ; la colonne « Depuis » est lue dans le modèle. En bas, la batterie de scénarios passée sur les deux versions.</p>
      <div class="legende">
        <span>${pastille('ref')} la valeur vient de la source</span>
        <span>${pastille('inspire')} la source donne le principe, la valeur est un choix</span>
        <span>${pastille('origine')} ni principe ni valeur sourcés : calibré sur tes données ou arbitré</span>
      </div>
      <div class="bilan">
        <div><b>${avant.origine} → ${apres.origine}</b><span>d’origine</span></div>
        <div><b>${avant.inspire} → ${apres.inspire}</b><span>inspirés</span></div>
        <div><b>${avant.ref} → ${apres.ref}</b><span>référence</span></div>
        <div><b>${changes.length}</b><span>valeurs changées</span></div>
      </div>
    </header>
    ${SECTIONS.map(
      (s) => `
      <section class="calcul-section">
        <h2>${echapper(s.titre)}</h2>
        ${s.intro ? `<p class="intro">${echapper(s.intro)}</p>` : ''}
        <div class="table-defile">
          <table>
            <thead><tr><th>Élément</th><th>Avant le 1er octobre</th><th>Depuis le 1er octobre</th><th>Pourquoi, et la source</th></tr></thead>
            <tbody>${s.lignes.map(ligne).join('')}</tbody>
          </table>
        </div>
      </section>`,
    ).join('')}
    ${batterie()}
  `
}

// ─────────────────────────────────────────────────────────── batterie

/** Les versions du calcul, de la plus ancienne à l'actuelle. */
const VERSIONS: Array<{ cle: string; titre: string }> = [
  { cle: 'avant', titre: 'Calcul d’origine' },
  { cle: 'apres', titre: 'Recalage sur les sources' },
  { cle: 'option3', titre: 'Plus la douleur sous 4' },
]
const figes = resultats as Record<string, Record<string, Resultat>>

const cellule = (r?: Resultat) =>
  r
    ? `<span class="verdict verdict-${r.ok ? 'ok' : 'non'}">${r.ok ? 'Tenu' : 'Raté'}</span><div>${echapper(r.valeur)}</div>`
    : '<span class="vide">Pas passé</span>'

function batterie(): string {
  const totaux = VERSIONS.map((v) => {
    const rs = Object.values(figes[v.cle] ?? {})
    return `<div><b>${rs.filter((r) => r.ok).length} / ${SCENARIOS.length}</b><span>${v.titre.toLowerCase()}</span></div>`
  }).join('')
  const cobayes = [...new Set(SCENARIOS.map((s) => s.cobaye))]
  return `
    <section class="calcul-section">
      <h2>Batterie de scénarios</h2>
      <p class="intro">Passée par le vrai moteur du laboratoire. Le coureur simulé fait ce que l’app lui prescrit, jour après jour. Pour la repasser : <code>npx vite-node src/labo/batterie-cli.ts &lt;version&gt;</code>.</p>
      <div class="bilan bilan-3">${totaux}</div>
      ${cobayes
        .map(
          (c) => `
        <h3>${echapper(c)}</h3>
        <div class="table-defile">
          <table class="table-batterie">
            <thead><tr><th>Scénario</th><th>Hypothèse</th><th>Attente</th>${VERSIONS.map((v) => `<th>${v.titre}</th>`).join('')}</tr></thead>
            <tbody>${SCENARIOS.filter((s) => s.cobaye === c)
              .map((s) => {
                const r = VERSIONS.map((v) => figes[v.cle]?.[s.code])
                // Ce que la version actuelle change par rapport à la précédente.
                const [avant, actuel] = r.slice(-2)
                const bascule = avant && actuel && avant.ok !== actuel.ok
                return `
              <tr class="${bascule ? (actuel!.ok ? 'gagne' : 'perd') : ''}">
                <th scope="row"><span class="code">${s.code}</span> ${echapper(s.titre)}</th>
                <td><p>${echapper(s.hypothese)}</p></td>
                <td><p>${echapper(s.attente)}</p></td>
                ${r.map((x) => `<td>${cellule(x)}</td>`).join('')}
              </tr>`
              })
              .join('')}</tbody>
          </table>
        </div>`,
        )
        .join('')}
    </section>`
}

rendre()
