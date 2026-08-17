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
  'Très facile',
  'Facile',
  'Confortable',
  'Modéré',
  'Soutenu',
  'Difficile',
  'Dur',
  'Très dur',
  'Presque maximal',
  'Maximal',
]

export const EFFORT_DETAIL = [
  'Aucun effort.',
  'Très facile, tu pourrais recommencer tout de suite.',
  'Facile. Conversation possible sans effort.',
  'Confortable. Le socle de l’endurance.',
  'Modéré. Tu sens le travail sans le subir.',
  'Soutenu. Phrases courtes.',
  'Difficile. Quelques mots seulement.',
  'Dur. Allure de seuil.',
  'Très dur. Tu comptes les répétitions.',
  'Presque maximal. Séance réussie de justesse.',
  'Maximal. Tu n’aurais pas pu faire plus.',
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
 *   2-3  bleu    aucun plancher non plus, mais on approche
 *   4-5  ambre   plancher orange
 *   6-7  corail  plancher rouge
 *   8-10 violet  plancher noir
 *
 * Deux teintes par palier, la seconde plus sombre : la progression reste
 * lisible à l'intérieur d'un même plancher.
 */
export const COULEUR_DOULEUR = [
  '#34d399', '#10b981',
  '#4e8cff', '#2563eb',
  '#f5b32e', '#d97706',
  '#ff5a46', '#dc2626',
  '#a855f7', '#7e22ce', '#581c87',
]
