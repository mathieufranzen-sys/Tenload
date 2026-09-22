/**
 * Le vocabulaire du ressenti : un mot par valeur, de 0 à 10.
 *
 * Il vivait dans SessionSheet, donc la feuille de séance savait dire « sensible »
 * mais pas le carnet du jour de l'écran Aujourd'hui, qui n'affichait qu'un
 * nombre sur dix. Deux échelles de douleur dans la même app, l'une nommée et
 * l'autre muette, alors que c'est la même douleur au même tendon.
 */

/** Douleur au tendon. C'est cette échelle qui pilote l'adaptation du plan. */
export const DOULEUR_MOT = [
  'Rien',
  'À peine',
  'Sensible',
  'Gênant',
  'Douloureux',
  'Handicapant',
  'Sévère',
  'Alarmant',
  'Critique',
  'Extrême',
  'Stop',
]

export const DOULEUR_DETAIL = [
  'Rien du tout. Le tendon ne se manifeste pas.',
  'Une présence, pas une douleur. Tout va bien.',
  'Sensible mais silencieux à l’effort. Zone de travail acceptable.',
  'Gêne nette. On surveille, on ne change rien encore.',
  'Douleur. Le plan s’adapte : plateau de la sortie longue, qualité en vélo.',
  'Douleur franche. Plateau et qualité neutralisée.',
  'Trop. Sortie longue réduite de 25 %, qualité annulée.',
  'Trop. Recul net sur la semaine à venir.',
  'Stop. Cinq jours sans course, vélo et haut du corps seulement.',
  'Stop et kiné. On ne discute pas.',
  'Stop et kiné. On ne discute pas.',
]

/** Effort perçu (RPE). Neutre : un 9 sur une séance de qualité est une réussite. */
export const EFFORT_MOT = [
  'Repos',
  'Très léger',
  'Léger',
  'Aisé',
  'Posé',
  'Soutenu',
  'Engagé',
  'Intense',
  'Très intense',
  'Quasi max',
  'Max',
]

/**
 * Le test de la parole, pas un jugement. Les anciennes phrases disaient
 * « Dur », « Tu comptes les répétitions », « Séance réussie de justesse » :
 * elles sonnaient comme un échec et poussaient à noter plus bas que vécu,
 * alors qu'un 9 sur un fractionné est une réussite. Ce qu'on peut dire en
 * courant se vérifie sur le moment, et décrit l'effort vécu plutôt que la
 * séance prévue, qui est exactement l'écart que `forme.ts` mesure.
 */
export const EFFORT_DETAIL = [
  'Aucun effort.',
  'Tu pourrais chanter.',
  'Conversation facile, sans y penser.',
  'Conversation fluide.',
  'Tu parles en phrases complètes.',
  'Phrases complètes, respiration marquée.',
  'Phrases courtes.',
  'Quelques mots à la fois.',
  'Un ou deux mots.',
  'Plus envie de parler.',
  'Aucun mot, tout est dans l’effort.',
]

/** Le rang dans les tables ci-dessus, pour une valeur qui peut être décimale. */
export const rangRessenti = (v: number): number => Math.max(0, Math.min(10, Math.round(v)))

/**
 * La couleur d'une douleur, reprise des cinq bandes de l'indice.
 *
 * Le mapping n'est pas décoratif : ce sont les planchers garantis de
 * `tendonIndex.ts` qui le fixent. Une douleur ≥ 4 impose la bande orange quoi
 * que dise le reste du calcul, ≥ 6 la rouge, ≥ 8 la noire. La jauge annonce
 * donc la bande dans laquelle la journée va tomber, avant même que l'indice
 * soit recalculé.
 *
 *   0-1  vert    aucun plancher
 *   2-3  jaune   aucun plancher non plus, mais on approche
 *   4-5  orange  plancher orange
 *   6-7  rouge   plancher rouge
 *   8-10 carmin  plancher noir
 *
 * Deux teintes par palier, la seconde plus soutenue : la progression reste
 * lisible à l'intérieur d'un même plancher. Le noir de la bande devient un
 * carmin : sur la jauge d'un curseur, un noir se confondrait avec le texte.
 * Teintes de la refonte du 21 septembre 2026, les mêmes que `TEINTE_BANDE`.
 */
export const COULEUR_DOULEUR = [
  '#4fe39a', '#86e27f',
  '#ffe14d', '#ffd23f',
  '#ffac1f', '#ff9500',
  '#ff6a1a', '#ff3b30',
  '#e8173f', '#c40d3c', '#9e0a38',
]
