# Tendo — contexte du projet

Plan d'entraînement marathon adaptatif, piloté par un indice de charge du tendon
d'Achille. Application personnelle de **Mathieu Franzen**, UX/UI designer chez
Arneo, qui prépare le **Marathon de Paris du dimanche 11 avril 2027** avec une
tendinopathie du tendon d'Achille en convalescence.

## Comment travailler avec Mathieu

Il est designer, pas développeur backend. Il lit le code, il ne l'écrit pas au
quotidien.

- **Réponds en français, au tutoiement, concis et concret.** Pas de préambule,
  pas de conclusion de politesse, jamais de tiret cadratin.
- **Explique les choix techniques en une phrase**, puis exécute. Il ne veut pas
  d'un cours, il veut comprendre ce qu'il vient de valider.
- **Il va faire beaucoup de retours design.** Attends-toi à des demandes
  précises sur l'espacement, la hiérarchie typographique, les états. Traite-les
  comme des specs, pas comme des suggestions.
- **Avance par étapes numérotées.** Quand il y a une action à faire de son côté
  (créer un compte, coller une clé), dis-le en une ligne et attends.
- Quand une décision produit t'appartient et que tu as un avis, tranche et dis
  pourquoi. Quand c'est un arbitrage qui lui revient, pose la question.

## Ce qui est non négociable

Ces contraintes viennent de son tendon et de son emploi du temps. Elles sont
vérifiées par `reference/check_plan.py` sur les 313 séances du plan. **Aucune
modification du plan ne doit les casser.**

1. **La sortie longue ne s'incrémente jamais de plus de 2 km d'une semaine sur
   l'autre**, y compris pour remonter après une semaine de décharge. C'est ce qui
   coûte le plus de semaines dans la périodisation, et c'est volontaire.
2. **Escalade le mercredi soir** : aucune course et aucun renfo haut du corps ce
   jour-là. Les avant-bras et les épaules travaillent déjà.
3. **Ni séance de vitesse ni renfo bas du corps accolés à la sortie longue.**
   Le lundi porte la sortie longue, donc le renfo bas est le jeudi et la qualité
   le samedi.
4. **Un jour de repos jambes complet par semaine** : le dimanche.
5. **Deux séances de vélo remplacent les petites séances d'endurance** tant que
   le tendon n'est pas guéri. Elles portent le volume aérobie sans impact.
6. **Jamais deux jours de course consécutifs**, sauf la paire lundi-mardi où le
   mardi est une récupération très lente (et qui bascule en vélo si la douleur au
   réveil dépasse 2).

## La semaine type

| Jour | Contenu |
|---|---|
| Lundi | Sortie longue |
| Mardi | Course facile courte de récupération + renfo haut du corps 40 min |
| Mercredi | Escalade, rien d'autre |
| Jeudi | Renfo bas du corps 40 min + vélo Z2 |
| Vendredi | Vélo de récupération |
| Samedi | Séance de qualité |
| Dimanche | Repos jambes complet |

## Le plan

35 semaines, du lundi 10 août 2026 au dimanche 11 avril 2027. Il vit dans
`src/data/plan.json`, généré par `reference/build_plan.py` et validé par
`reference/check_plan.py`. **C'est une donnée de référence, pas une donnée
utilisateur** : elle est versionnée dans le code, pas en base. Seuls les écarts
volontaires vont dans `plan_overrides`.

- **Semaine 1** : amorce sans sortie longue. Mathieu a couru 25 km le dimanche
  9 août ; enchaîner une longue le lendemain sur un tendon convalescent était
  exclu. Première vraie sortie longue le 17 août, à 22 km.
- **Bloc A** (S1-8) réathlétisation, sortie longue 22 → 28 km.
- **Bloc B** (S9-16) base aérobie, 24 → 32 km, volume vers 50 km/semaine. Deux
  courses réelles s'y invitent, voir plus bas.
- **Bloc C** (S17-25) développement, pic à 32 km, **semi-marathon test le
  samedi 30 janvier 2027**.
- **Bloc D** (S26-32) spécifique marathon, allure course en volume.
- **Bloc E** (S33-35) affûtage. Dernière longue de 28 km trois semaines avant.

### Les deux courses d'automne

Deux dossards à dates fixes, tous les deux un **dimanche**, c'est-à-dire le jour
de repos jambes. Ils bousculent leur semaine et la suivante, et ces écarts sont
écrits dans `COURSES` (build_plan.py) puis autorisés **nommément** dans
`EXCEPTIONS` (check_plan.py) : un écart identique ailleurs reste une erreur.

- **20 km de Paris, dimanche 11 octobre 2026** (S9). Record à battre : 1:33:24,
  soit 4:40/km. Le plan le fait courir à allure marathon puis au seuil, ce qui
  donne 1:30:40 sur le papier.
- **10 km Hoka de Paris, dimanche 15 novembre 2026** (S14). Record à battre :
  40:12, soit 4:01/km. L'allure affichée est la cible (3:57), pas la prédiction :
  le test de 3 km du 8 août le situe plutôt vers 41:30, et la note le dit.

**Semaine de course** (S9, S14) : la qualité du samedi passe au **mercredi**,
avec l'escalade. C'est le seul écart à une contrainte non négociable de tout le
plan, décidé par Mathieu pour ces deux semaines. L'EF du mardi devient du vélo,
sans quoi lundi-mardi-mercredi feraient trois jours de course d'affilée ; le
vélo Z2 du jeudi saute pour en garder deux dans la semaine ; le samedi devient
la veille de course et porte le repos jambes à la place du dimanche.

**Semaine d'après** (S10, S15) : lundi repos, la **sortie longue passe au
jeudi**. Le renfo bas remonte au mardi à la place de l'EF, faute de pouvoir
être le mercredi (escalade) ou collé à la longue (contrainte 3). La semaine
n'a donc qu'un vélo. La distance de la sortie longue ne bouge pas : la
contrainte 1 tient, rien ne décale dans les 35 semaines.

Le semi test du 30 janvier est le **point de bascule de l'objectif** : sous
1 h 25 avec douleur restée sous 2, on rouvre le dossier sub-3 ; autour de 1 h 30
on reste sur 3 h 15 ; au-delà de 1 h 35 on recale sur 3 h 25. C'est écrit dans la
note de la séance.

## Les allures

Tout est paramétré par **une seule valeur** : l'allure marathon objectif, en
secondes par kilomètre. Changer l'objectif recalcule l'intégralité des séances.

- Objectif retenu : **3 h 15**, soit **277 s/km = 4:37/km**.
- Forme actuelle projetée : 289 s/km = 4:49/km, soit 3 h 23. L'écart de huit
  minutes est le travail des 35 semaines.
- Les zones sont ancrées sur **l'objectif**, pas sur la forme du jour. C'est
  volontaire : l'allure marathon doit s'installer dans le corps pendant huit
  mois, pas se découvrir en avril.

Écarts par rapport à l'allure marathon (`src/lib/paces.ts`) : récupération +75,
endurance +50, allure marathon 0, seuil −20, intervalles −40, répétitions −55.
Ces valeurs reproduisent les tables de Jack Daniels pour un VDOT autour de 55,
qui est le sien.

**Test de calibrage** : 3 km le 8 août 2026 en **12:02** (4:00/km, meilleur
kilomètre à 3:50, splits 3:59 / 3:55 / 4:05). Le test était bien maximal, voir
la section suivante. Ne pas le refaire avant la fin du bloc A.

### La forme projetée bouge avec le ressenti

`src/lib/forme.ts` (+ 10 tests). Le test de 3 km reste **l'ancre**, mais il se
fait au mieux une fois par bloc : entre deux tests, la forme projetée restait
figée des mois pendant que l'entraînement avançait. L'effort perçu comble ce
trou — à allure donnée, un RPE plus bas que prévu dit qu'on encaisse mieux.

Chaque type de séance a un RPE attendu (endurance 4, sortie longue 7, tempo 8,
intervalles 9, course 8). L'écart moyen sur 28 jours vaut **4 s/km par point**.

Quatre garde-fous, parce qu'un RPE est bruité et qu'aucun ne doit pouvoir
emmener le plan loin de la mesure :

1. **Seules les séances de course comptent.** Le renfo et l'escalade n'ont pas
   d'allure, leur RPE ne dit rien de la vitesse.
2. **Une séance douloureuse est écartée** (douleur ≥ 4). Au-delà, le RPE mesure
   la douleur et plus la condition physique — c'est même l'inverse d'un signal
   de forme.
3. **Trois séances minimum sur 28 jours.** En dessous, une mauvaise journée
   déplacerait la projection à elle seule.
4. **L'écart est borné à ±15 s/km.** Le ressenti nuance le test, il ne le
   remplace pas : au-delà, c'est un nouveau test qu'il faut, pas un calcul.

L'écart appliqué s'affiche en pastille sous la forme projetée, dans Allures :
une valeur qui bouge toute seule sans dire pourquoi ne serait pas lisible.

## Les zones cardiaques — piège corrigé

Une FC max surestimée fait passer de l'endurance pour du tempo. Sur son 3 km
maximal du 8 août, Mathieu plafonnait à **179-180**, avec un plateau de FC
moyenne à 174 pendant huit minutes — on retenait 181.

**Relevé à 183 la semaine du 10 août 2026, puis à 185 le 23 août.** Ce sont des
mesures, elles priment sur l'estimation : `HR_MAX` vaut désormais 185.

Conséquences à garder en tête :

- Sur son test de 3 km, il était à 95-98 % de son maximum : l'effort était bien
  maximal, et le 12:02 est une valeur exploitable. Les allures ne sont pas
  conservatrices, elles sont justes.
- Sur sa sortie de 25 km à 140 de moyenne, il est au **haut de Z2**, pas au
  milieu : il court son endurance un peu trop vite.

**185 est une valeur par défaut, pas une constante.** Elle vit dans
`profiles.hr_max` et se recalibre depuis Profil → Fréquence cardiaque, qui
prévisualise les zones avant d'enregistrer. `HR_MAX` dans `paces.ts` ne sert
plus que de repli quand le profil n'est pas chargé. Le tableau de l'écran
Allures lit la valeur du profil — **changer la constante ne suffit donc pas :
il faut enregistrer la nouvelle valeur depuis l'écran.**

## L'indice de charge du tendon

Le cœur du produit. `src/lib/tendonIndex.ts`, verrouillé par 27 tests dans
`src/lib/tendonIndex.test.ts`. **Si tu changes une constante et qu'un test casse,
c'est probablement le modèle qui a tort, pas le test.**

Six termes s'additionnent, moins ce qui protège :

| Terme | Plafond | Ce qu'il mesure |
|---|---|---|
| Douleur déclarée | 85 | Réveil 45 %, fin de journée 35 %, effort 20 %. Mélange du pondéré (55 %) et du maximum sur 72 h (45 %). |
| Emballement de la charge | 30 | Rapport charge aiguë (demi-vie 3,5 j) sur charge chronique (14 j). |
| Fraîcheur immédiate | 20 | Charge de la veille et de l'avant-veille, rapportée au niveau habituel. |
| Tendance | 6 | Pente de la raideur matinale sur quatre jours. Seule une hausse compte. |
| Monotonie | 8 | Écart-type de la charge sur sept jours (Foster). Une semaine sans jour léger use le tendon. |
| Gestes protecteurs | −15 | Excentrique la veille −6, vraie journée de repos −5, sauts −2, hydratation ≥ 2 L −2. Le glaçage est saisi mais ne pèse plus : pas d'effet démontré sur la charge mécanique du tendon. |

### Trois décisions à ne pas défaire

1. **La réponse à la douleur est convexe** (exposant 1,15). Une gêne de fond à
   2/10 ne doit pas alarmer, un vrai 6 doit tout arrêter. Une réponse linéaire
   déclenchait de fausses alertes sur son quotidien normal (moyenne réelle : 0,8
   au réveil, 1,3 en fin de journée).
2. **Le vélo n'est pas neutre** : 0,10 point par minute. Les deux seuls pics de
   douleur du soir du carnet suivent tous les deux une séance de home trainer en
   Z3, pas une course. La flexion plantaire soutenue compte.
3. **Faire son excentrique fait BAISSER l'indice.** C'est le traitement d'une
   tendinopathie, pas une agression, et ça récompense l'observance.

### Garde-fous

- **Planchers garantis, sur deux échelles.** La raideur au réveil bascule plus
  tôt que la douleur à l'effort, parce que les deux ne disent pas la même chose :
  l'effort mesure le coût de la séance, le réveil mesure l'état du tendon, pris
  à froid. Une seule échelle laissait un 5/10 au réveil en orange, donc
  autorisait encore la course facile.

  | Mesure | Orange | Rouge | Noir |
  |---|---|---|---|
  | Raideur au réveil | ≥ 4 | ≥ 5 | ≥ 7 |
  | Douleur à l'effort ou du soir | ≥ 4 | ≥ 6 | ≥ 8 |

  Ce sont les seuils que Mathieu a posés, ils ne se contournent pas. **Le plancher tient plein le lendemain**,
  sans décroissance, puis relâche au surlendemain. Il valait 92 % dès J+1, ce
  qui était un accident d'arithmétique et non une décision : 50 × 0,92 = 46,
  juste sous le seuil de l'orange, donc le plancher perdait une bande
  exactement le jour où le tendon est le plus fragile. Le bilan net du collagène
  reste négatif pendant 24 à 36 h après une charge importante, c'est cette
  fenêtre que le plancher couvre.
- **Mémoire d'épisode** : après un pic au-dessus de 60, un plancher décroissant
  (facteur 0,74 par jour) tient cinq jours. Un tendon réactif reste fragile même
  quand la douleur est retombée.
- **Confiance** : en dessous de dix jours de charge **attestée sur 14**, la
  contribution mécanique est plafonnée. Sans ça, un historique court fait
  exploser le rapport aigu/chronique pour rien. La fenêtre était de 28 jours et
  « connu » y voulait dire « charge > 0 » : un dimanche de repos comptait comme
  une absence, et surtout l'historique Strava arrêté au 9 août tenait la
  confiance à bout de bras trois semaines après que l'app est devenue la seule
  source. Quatorze jours, c'est la demi-vie de la charge chronique, donc
  l'horizon sur lequel elle se décide.
- **Le coût au kilomètre ne vaut que pour ce qui se court.** Une distance ne
  suffit pas à y basculer : depuis que « Donnée réelle » accepte des kilomètres
  sur le vélo, une sortie de 40 km tombait sur le repli `?? 1` de `RUN_COST` et
  coûtait 40 points au lieu de 4. Dix fois trop, sur la seule discipline que le
  plan utilise justement pour porter du volume sans charger le tendon.

### Les cinq bandes

| Indice | Bande | Ce qui change dans le plan |
|---|---|---|
| 0-29 | Vert | Rien. Sous 15 trois jours de suite, on peut ajouter du volume. |
| 30-49 | Jaune | Rien, plan nominal. |
| 50-64 | Orange | Qualité → vélo Z3, renfo bas allégé, sortie longue −20 %. |
| 65-79 | Rouge | Aucune course. Vélo Z2 et haut du corps. |
| 80-100 | Noir | Repos complet des jambes. Trois jours ici → kiné. |

**Les effets s'appliquent au jour de la séance, d'après l'indice PROJETÉ de ce
jour, dans une fenêtre de dix jours.** Ne jamais appliquer l'état du jour à
l'ensemble des 35 semaines : c'était un bug de la version HTML, tout le plan
apparaissait dénaturé.

### Calibration

Calibré sur 45 jours réels (83 activités Strava croisées avec 16 jours de
carnet) : **médiane 23, maximum 59 le 3 août** — la veille du jour où le carnet
note « entorse cheville gauche après 600 m ». Le modèle ne prédit pas les
entorses, mais il avait vu que la journée arrivait sur un tendon chargé.

## Architecture

```
src/
  data/         plan.json (référence), types.ts, instantanés de seed
  lib/          tendonIndex, adapt, load, buildPain, paces, repartition,
                insights, offlineQueue, dates, overrides, supabase (+ tests)
  hooks/        useAuth, DataProvider (source unique), useFileAttente
  components/   TendonGauge, TendonArc, SessionCard, SessionSheet, charts/…
  screens/      Today, Plan, Track, Paces, Profile (+ profile/…)
  styles/       tokens.css (design system), global.css
supabase/       schema.sql (RLS testé), seed.sql (généré)
reference/      tendo-v3.html (la version portée), scripts Python d'origine
```

- **L'onglet Coach de la référence HTML n'existe plus.** Son contenu utile
  (allures, zones cardiaques, contraintes, structure du plan) est
  devenu l'écran Profil et ses sous-pages ; le reste décrivait une mécanique de
  chat propre au prototype.
- **Strava a été retiré le 23 août 2026.** Il n'avait servi qu'à récupérer
  l'historique : OAuth, synchro, page de statut et fonctions Netlify sont
  supprimés. La table `activities` **reste**, figée sur les 83 activités de mai
  à août — elles portent la charge chronique et la moitié gauche des graphiques
  de Suivi. Plus rien de neuf n'y entre : **à partir du 10 août, l'app est la
  seule source**, par les ressentis de séance et le carnet du jour. Toute
  lecture croise donc les deux : Strava d'abord quand il a la journée, le
  ressenti sinon — jamais les deux, sinon la séance compte double.
- **`DataProvider` est la seule source des données distantes.** Les cinq écrans
  lisent les mêmes lignes au même moment, l'indice croisant journal, activités et
  ressentis : un seul chargement partagé, et `useProfile` / `useLogs` /
  `useFeedback` / `useActivities` ne sont que des sélecteurs dessus.
- **Toutes les écritures sont des upserts sur clé naturelle**, donc idempotentes,
  donc rejouables. C'est ce qui rend `offlineQueue` simple : l'état local change
  tout de suite, la ligne part derrière, un échec réseau reste en file.

- **Vite + React + TypeScript strict.** Styles en variables CSS, pas de Tailwind :
  le design system existe déjà et Mathieu le lit directement.
- **Supabase** pour l'auth (magic link) et les données. RLS sur toutes les
  tables, filtré sur `auth.uid()`.
- **PWA** via `vite-plugin-pwa`. L'app doit s'ouvrir hors ligne : le plan est
  statique, seules les saisies ont besoin du réseau.
- **Le calcul de l'indice reste côté client**, en TypeScript. C'est ce qui permet
  de fonctionner hors ligne. La vue SQL `daily_tendon_load` est un doublon de
  vérification : les deux doivent donner le même résultat (vérifié : 28,77 contre
  28,8 sur le 25 km du 9 août).

## Conventions

- **Français partout** : noms de variables métier, commentaires, libellés,
  messages d'erreur. Le code technique reste en anglais (`useState`, `map`).
- **Les commentaires expliquent pourquoi, pas quoi.** Un commentaire qui
  paraphrase le code est à supprimer. Un commentaire qui explique une constante
  choisie après calibration est à garder.
- **Dates en ISO `YYYY-MM-DD` partout**, jamais d'objet `Date` qui circule.
  `parseDay` cale à midi UTC pour éviter les décalages de jour.
- **Nombres à la française à l'affichage** : `formatNumber` donne 21,1 et non
  21.1, et 22 et non 22,0.
- TypeScript strict, `noUnusedLocals` actif. `npm run build` lance `tsc --noEmit`
  avant Vite : un build qui passe garantit le typage.
- Avant de proposer un changement du modèle : `npm test`.

## Feuille de route

**Le portage est terminé.** Les cinq étapes prévues sont livrées, plus les
écarts volontaires au plan : `npm test` donne 195 tests verts sur 12 fichiers,
`npm run build` passe. Le dépôt est entré dans sa phase de retours design.

Fait :

- [x] Socle Vite + React + TS + PWA, build qui passe
- [x] `tendonIndex.ts` porté, 27 tests qui verrouillent seuils, planchers et silence
- [x] `paces.ts`, `load.ts`, `dates.ts`, `repartition.ts`, `insights.ts`
- [x] Schéma Supabase avec RLS, testé sur PostgreSQL 16 (idempotent)
- [x] Seed généré depuis le carnet, rejouable
- [x] **Supabase branché** : `useAuth` (lien magique), `DataProvider` en source
      unique, cache `localStorage` hydraté au montage, écritures optimistes,
      file d'attente hors ligne (`offlineQueue`, 12 tests)
- [x] **Les cinq écrans** : Aujourd'hui, Programme, Suivi, Allures, Profil
- [x] **Les quatre graphiques** : indice, douleur, volume, charge empilée
- [x] **Détail de séance** en feuille modale, avec les curseurs de ressenti
- [x] **Moteur d'adaptation** `adapt.ts`, 24 tests
- [x] **Écarts volontaires** `overrides.ts` (23 tests) et `EcartEditor`
- [x] **Mot du coach** `coach.ts` (11 tests), en bas de l'écran Aujourd'hui
- [x] Design tokens, icônes PWA

À faire, dans cet ordre :

1. **Retours design de Mathieu** — la vraie raison de ce dépôt.

### Les écarts volontaires

`src/lib/overrides.ts` (+ 23 tests), édités depuis `EcartEditor` en bas de la
feuille de séance. Un écart peut sauter une séance, la remplacer par une autre
discipline, la déplacer d'un jour, corriger sa distance ou sa durée.

- **Rien n'est jamais réécrit dans `plan.json`.** Un écart est une ligne de
  `plan_overrides` appliquée au rendu. Réécrire le plan ferait valider par
  `check_plan.py` un fichier qui n'est plus la référence de personne.
- **Ordre d'application : plan → écart volontaire → `applyFx`.** La décision de
  Mathieu passe d'abord, la protection du tendon s'applique par-dessus. Une
  séance sautée ne reçoit aucune adaptation : il n'y a plus rien à protéger.
- **Une séance sautée vaut zéro dans la charge**, comme une journée sans
  activité importée.
- **Le contrôle des contraintes avertit, il ne bloque pas.** `verifierContraintes`
  lit les contraintes 2, 3, 4 et 6 sur la disposition de la semaine.
  **Chacune vise une séance, jamais une case du calendrier** : la 2 part de la
  séance d'escalade et non du mercredi, sans quoi poser un renfo haut sur
  l'escalade alertait mais poser l'escalade sur le renfo haut restait muet — la
  même collision, dans l'autre sens. La 4 a deux volets : rien ne se pose sur
  la séance de repos, et il faut un jour sans jambes dans la semaine. La 3
  couvre aussi le jour même de la sortie longue, pire que la veille et le
  lendemain. La 6 ajoute deux séances de course le même jour, que le plan de
  référence ne peut pas produire mais qu'un déplacement peut créer. Ces
  contraintes ; les 1 et 5 portent sur la progression du plan de référence, que
  les écarts ne touchent pas. `alertesAjoutees` ne remonte que ce que le changement en cours introduit,
  sinon une semaine déjà limite crierait à chaque modification.
- **`slot` est le rang dans la JOURNÉE, jamais l'index dans la semaine.**
  `slotsParJour` est la seule façon correcte de le calculer. La confusion entre
  les deux était un vrai bug de `buildLoad` : les séances passées notées à la
  main ne comptaient pas dans la charge, silencieusement.
- **Un patch vide vaut « retour au plan ».** La ligne reste en base plutôt que
  d'être supprimée : c'est ce qui garde toutes les écritures idempotentes, donc
  rejouables telles quelles par la file d'attente.

### La vue calendrier et le déplacement des séances

`src/components/VueCalendrier.tsx`, `src/components/ActionsSeance.tsx`, plus
7 tests de placement et de cibles.

L'écran Programme porte deux vues, sous un même sélecteur : **semaine**
(inchangée) et **calendrier**, qui déroule les 245 jours du plan avec leurs
en-têtes de semaine.

- **Le déplacement se fait au doigt, dans le calendrier.** Le menu déroulant de
  sept jours qui vivait dans la feuille de séance ne disait rien de la semaine
  qu'il fabriquait : on choisissait « jeudi » sans voir ce que jeudi portait
  déjà. Cet accès est supprimé.
- **Le geste est en événements de pointeur, pas en drag-and-drop HTML5**, qui
  n'existe pas sur iPhone. Appui de 220 ms pour ouvrir la prise, capture du
  pointeur pendant tout le geste — sans elle, un doigt qui sort de la carte
  perd le déplacement, ce qui est le cas normal quand on vise un jour éloigné.
- **Les conflits se signalent pendant le geste, ils n'interdisent rien.** Même
  règle que partout : on avertit, c'est le tendon de Mathieu qui tranche. Le
  contrôle porte sur la semaine d'**accueil**, sur sa disposition réelle
  (`dispositionSemaine`) : celle qui compte les séances venues des semaines
  voisines et retire celles qui sont parties. Quitter une semaine ne peut
  qu'y retirer des alertes, jamais en ajouter — aucune des contraintes
  vérifiées ne se casse en enlevant une séance.
- **`EcartPatch.semaines`** porte le franchissement du dimanche, borné à ±1.
  La clé Supabase reste celle du plan de référence (semaine, jour, slot) : une
  séance déplacée ne change jamais de ligne, elle porte seulement l'offset de
  sa nouvelle date. C'est ce qui garde les écritures idempotentes.
- **`seancesDeLaSemaine`** balaie les trois semaines voisines et filtre par
  date : depuis qu'un écart franchit le dimanche, la semaine du plan et la
  semaine du calendrier ne coïncident plus.
- **`SeancePlanifiee.semaineOrigine`** existe pour ça : la clé de l'écart ne se
  déduit plus de la date affichée. **Rien ne doit être clé sur la semaine
  AFFICHÉE.** Deux sorties longues peuvent désormais se retrouver dans la même
  semaine de calendrier — celle de la semaine N poussée au mardi, celle de N+1
  ramenée au dimanche — avec le même `jourOrigine` et le même `slot`. Seule la
  semaine d'origine les distingue, et un écart enregistré sur l'une écrasait
  l'autre. `onOuvrirSeance` ne reçoit donc plus de semaine du tout : la séance
  porte la sienne.
- **« Voir initial »** montre le plan de référence nu, sans écart ni
  adaptation. C'est le seul sens non ambigu de « avant toute modification ».

La feuille de séance porte désormais quatre actions au-dessus du détail :
sauter, déplacer (qui ouvre le calendrier sur la séance), donnée réelle
(distance et durée), remplacer. Le sélecteur extérieur / tapis est supprimé :
tout est dehors.

- **La feuille ne retient que l'IDENTITÉ de la séance**, jamais la séance
  elle-même. Un instantané se figeait : enregistrer une donnée réelle mettait à
  jour les écarts, et la feuille continuait d'afficher la distance d'avant.
  `App` la recalcule à chaque rendu depuis les données courantes.
- **Le repos n'a que deux actions : déplacer et remplacer.** Sauter un repos
  ne veut rien dire, il n'y a rien à ne pas faire, et une donnée réelle non
  plus. Il n'a pas non plus de ressenti : la règle porte sur le TYPE de la
  séance, écarts appliqués, et sur rien d'autre. Elle regardait aussi l'absence
  d'écart et l'absence de ressenti, si bien que déplacer le repos d'un jour
  faisait réapparaître deux curseurs sur la seule journée qui n'a rien à noter.
- **Une distance ne se saisit que là où elle a un sens** (`porteUneDistance`) :
  le vélo oui, même si le plan ne lui en fixe aucune ; l'escalade, le renfo et
  le repos non. Elle a quitté le formulaire de ressenti : deux champs pour la
  même valeur en font toujours un qui ment.
- **Le titre suit la distance** (`titreAvecDistance`). Corriger les kilomètres
  sans corriger le titre laissait la feuille se contredire d'une ligne à
  l'autre. Le remplacement n'a lieu que si le titre annonce bien l'ancienne
  distance : sinon le nombre désigne autre chose, « 8 x 400 m » ou
  « 2 x 2 km », et le réécrire inventerait une séance.
- **Pas de raison ni de contrôle de contraintes dans « donnée réelle »** :
  corriger une distance ne déplace rien dans la semaine, il n'y a aucune
  contrainte à faire tomber.

**La marche est un type de séance**, à `0,5` point par kilomètre, soit deux
fois moins que la course : pas de phase aérienne, donc pas de choc à la
réception. Elle charge les jambes (le noir l'arrête) mais n'est pas de la
course : le rouge, qui interdit la course, la laisse passer. C'est tout son
intérêt comme repli. Ses kilomètres restent hors du volume de course, qui
mesure l'impact au sol.

### Le palier de la sortie longue

`src/lib/palier.ts` (+ 19 tests), plus 26 tests de placement dans
`src/lib/placement.test.ts`.

L'indice est un **état du jour, pas une mémoire** : il retombe en trois jours,
et la sortie longue de la semaine suivante s'affichait donc en entier même
quand la précédente avait fait mal. La progression n'apprenait jamais du
résultat de la séance qui charge le plus le tendon.

- **Le verdict appartient au lendemain matin.** C'est la règle des 24 heures :
  une douleur pendant l'effort est tolérable si elle redescend au niveau
  habituel le lendemain et si la raideur au réveil n'est pas aggravée. Une
  douleur de 5/10 pendant la séance ne conclut rien à elle seule.
- **Quatre conditions, toutes nécessaires** pour que le tendon ait encaissé :
  douleur de séance < 6, raideur du lendemain saisie, sous 4, et pas plus de
  1,5 point au-dessus de la moyenne des sept jours précédents.
- **Le palier répète, il ne réduit jamais.** Réduire est le travail de
  l'indice (orange, −20 %) ; ici on refuse seulement d'augmenter, ce qui est la
  même règle que `painInconnue` : on ne dégrade pas sur une absence
  d'information, on refuse de monter dessus. Une raideur du lendemain non
  saisie plafonne donc aussi.
- **Une seule séance est plafonnée**, la prochaine dans le temps. Dès qu'elle
  est faite et notée, un nouveau verdict se calcule sur elle. Plafonner toute
  la suite aplatirait les 35 semaines sur un seul mauvais matin.

### Ce qui est fait ne se réécrit plus

**Le ressenti, et non la date, atteste qu'une séance a eu lieu.** `fxForDate`
n'excluait que les jours strictement antérieurs : une sortie longue faite dans
la journée puis notée le soir se faisait raccourcir de 20 % par le ressenti
qu'on venait d'en saisir. La mesure réécrivait son propre objet, et `buildLoad`
comptait ensuite les kilomètres réduits au lieu des kilomètres courus.

`ContextePlan.faites` gèle toute séance notée, exactement comme une séance
sautée : dans les deux cas il n'y a plus rien à protéger.

**Les règles visent la séance, jamais la case du calendrier.** « Le lendemain
de la sortie longue » était codé en dur au mardi ; déplacer la sortie longue au
mardi faisait viser le mardi, c'est-à-dire le jour de la sortie longue
elle-même, et la règle ne protégeait plus rien. Il se calcule maintenant sur la
semaine réelle, écarts appliqués. **Toute nouvelle règle doit se tester sur les
sept jours**, c'est ce que fait `placement.test.ts`.

### Quand la douleur n'est plus saisie

Arbitré : l'app **dit qu'elle ne sait pas** plutôt que d'afficher un chiffre
rassurant. La composante douleur pèse 85 des 100 points ; sans saisie elle vaut
zéro, et l'indice tombe dans le vert alors qu'il ne mesure plus rien.

- Le report décroissant de `painScore` couvre **trois** jours, pas quatre. Au
  quatrième le facteur valait exactement zéro : un report qui ne dit plus rien
  tout en se présentant comme une mesure, et c'est cet état qui affichait
  « tout est autorisé » sur un carnet muet.
- Au-delà, `painInconnue` passe à vrai. L'écran Aujourd'hui remplace l'indice
  par un point d'interrogation et « Je ne sais pas », en donnant la part
  mécanique, qui est la seule chose réellement connue. La jauge et la feuille
  de charge portent la même mention.
- **Le feu vert est bloqué tant que `painInconnue` est vrai.** Un indice bas
  obtenu par absence de données n'est pas un feu vert, c'est un angle mort, et
  autoriser une hausse de volume là-dessus serait l'erreur exacte que l'indice
  existe pour éviter.
- Le plan reste nominal : on ne dégrade pas les séances sur une absence
  d'information, on refuse seulement de les augmenter.

### Quand la charge n'est plus attestée

Le même angle mort, du côté mécanique. `buildLoad` rend un nombre par jour et
ne peut pas dire d'où il vient : un dimanche de repos et un mardi de 24 km non
noté valent tous les deux zéro. L'indice lisait donc un carnet muet comme une
semaine légère, c'est-à-dire dans le sens rassurant, qui est le seul dangereux.

- **`joursAttestes` (`load.ts`) sépare la mesure du silence.** Un jour est
  attesté quand une activité importée le couvre, ou quand toutes ses séances
  sont notées, sautées, ou du repos, qui n'a rien à noter. Le futur l'est par
  définition : le plan EST la projection. **Une seule séance oubliée retire
  tout le jour**, parce que la charge d'un jour est la somme de ses séances et
  non la plus grosse.
- `chargeInconnue` passe à vrai sous cinq jours attestés sur les sept derniers.
  L'emballement compare alors une charge aiguë trouée à une charge chronique
  qui, elle, tient encore sur des jours plus anciens, et conclut au calme. La
  jauge et la feuille de charge le disent.
- **Le feu vert est bloqué tant que `chargeInconnue` est vrai**, exactement
  comme pour `painInconnue`. Les deux absences se valent.
- Le chiffre, lui, ne bouge pas : c'est le plafond de confiance qui fait le
  travail numérique. On ne dégrade toujours pas sur une absence d'information.

### Le mot du coach

`src/lib/coach.ts` produit l'encouragement du bas de l'écran Aujourd'hui.
**Règle unique : ne jamais affirmer un chiffre absent des données.**

**Il parle d'abord de la séance du jour.** `motSurLaSeance` passe avant toutes
les autres règles : le jour où l'indice retire la course, féliciter pour
l'excentrique de la quinzaine n'est pas un coach, c'est un bandeau. Cinq cas,
et le silence sinon : l'indice a neutralisé la course, il a raccourci la
sortie longue, un écart de Mathieu a cassé une contrainte de la semaine, il a
lui-même allégé sur un indice haut, ou la charge n'est plus attestée. Le
chiffre cité est toujours l'indice réellement calculé et le fait cité est
toujours un changement réellement appliqué. `SeancePlanifiee.typePlan` existe
pour ça : dire « ta sortie longue est devenue du vélo » plutôt que « tu as du
vélo », qui n'apprend rien. Chaque
message exige un minimum de saisies (quatre raideurs matinales de chaque côté
de la fenêtre, par exemple) et se tait sinon. Un encouragement inventé se
repère en une semaine et discrédite l'indice avec lui. L'ordre des règles est
un ordre de valeur : raideur au réveil, puis observance de l'excentrique, puis
régularité, puis l'indice — qui vient en dernier parce que c'est un agrégat et
non une observation.

## Les rappels du carnet

`src/lib/push.ts` (client), `supabase/functions/rappels/` (envoi, dont
`logique.ts` testé par 14 tests), `supabase/notifications.sql` (table et cron).

Deux rappels, en heure de Paris : **8 h la raideur au réveil**, **23 h l'effort
perçu, la douleur à l'effort et la douleur de fin de journée**.

- **La règle est la même que pour le mot du coach : ne jamais redemander ce
  qui est déjà saisi.** Une notification qui répète une valeur déjà donnée se
  fait couper en trois jours, et emporte avec elle celle qui servait. Un zéro
  compte comme une mesure.
- **Le cron tourne toutes les heures, pas deux fois par jour.** pg_cron
  raisonne en UTC ; à heure fixe le rappel de 8 h glisserait d'une heure deux
  fois par an. C'est `momentParis` qui décide si c'en est une.
- **Le dimanche, seul le point du soir part** : c'est le repos jambes de la
  contrainte 4, il n'y a pas de séance à noter. Un écart volontaire pourrait le
  démentir et le rappel se tairait à tort, ce qui est le bon sens de l'erreur.
- **Sur iPhone, rien ne marche hors PWA installée.** L'écran de réglage le dit
  avant de proposer le bouton, plutôt que de laisser croire à une panne.
- Les gestionnaires `push` et `notificationclick` vivent dans
  `public/push-sw.js`, greffé au service worker généré par
  `workbox.importScripts`. Ce fichier est mis en cache pour un temps qu'on ne
  maîtrise pas : **il ne doit porter aucune règle métier**, tout le texte vient
  du message envoyé.

## Pistes connues

- Le bundle passe 600 Ko, essentiellement `plan.json` embarqué. Sans
  conséquence tant que la PWA précharge tout, à revoir si le plan grossit.
