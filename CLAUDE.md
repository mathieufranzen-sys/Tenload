# Tendo — contexte du projet

Plan d'entraînement marathon adaptatif, piloté par un indice de charge du tendon
d'Achille. Application personnelle de **Mathieu Franzen**, UX/UI designer chez
Arneo, qui prépare le **Marathon de Paris du dimanche 4 avril 2027** avec une
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

Ces contraintes viennent de son tendon, de son emploi du temps et, depuis le
18 septembre 2026, de la méthode de Maxime Lopes (RunWise) qu'il a choisie
comme référence. Elles sont vérifiées par `reference/check_plan_v2.py` sur les
275 séances du plan. **Aucune modification du plan ne doit les casser.**

1. **La sortie longue ne s'incrémente jamais de plus de 2 km d'une SEMAINE DE
   CHARGE à la suivante.** La chaîne saute les décharges, les semaines de
   course, leurs lendemains et les **pauses de longue** : aucune n'est une
   étape de la progression. **Une décharge coupe librement**, et le contrôle
   exige au moins −20 %, sur la sortie longue comme sur la charge de la semaine
   entière. Deux mesures, parce qu'une seule se contourne.
2. **Supprimée le 18 septembre 2026.** Elle protégeait le jour de l'escalade.
   L'escalade est sortie du plan : elle n'est plus une séance hebdomadaire mais
   un remplacement possible, au même titre que le vélo ou la marche. Garder la
   contrainte aurait fait crier l'app chaque fois qu'une course est remplacée
   par une grimpe. Le numéro n'est pas réattribué : les écarts en base et les
   tests y font référence.
3. **Ni séance de vitesse ni renforcement accolés à la sortie longue.** Le
   lundi porte la sortie longue, donc les deux renforcements sont le mercredi
   et le vendredi, et la qualité le jeudi.
4. **Un jour de repos jambes complet par semaine** : le dimanche.
5. **Un vélo par semaine.** Il n'est plus une béquille qui remplace la course
   mais **du volume aérobie sans impact au sol**, ce que Maxime recommande
   d'ajouter plutôt que de retirer. Il deviendra une cinquième course quand le
   tendon aura tenu 56 jours sans douleur au-dessus de 2 sur dix, avec 42
   relevés dans la fenêtre.
6. **Jamais deux jours de course consécutifs**, sauf la paire lundi-mardi où le
   mardi est une récupération très lente, et qui bascule en vélo si la douleur
   au réveil dépasse 2. Cette bascule vit dans `applyFx`
   (`SEUIL_RAIDEUR_LENDEMAIN`), lit la raideur saisie du jour via
   `ContextePlan.reveils`, vise la séance qui suit la sortie longue RÉELLE et
   non le mardi, et ne touche jamais une séance déjà notée. Mathieu : « je ne
   dois pas courir si la raideur du mardi matin est à 3 ».
7. **Aucune séance dure hors bloc spécifique.** Effort 7,5 sur 10 au maximum,
   trois à quatre répétitions en réserve à la fin. Le 10 sur 10 appartient aux
   dossards et aux tests, le 8,5 à 9 aux dernières répétitions d'une séance
   spécifique. Un seuil couru à 9 cesse d'être du seuil : il coûte le prix
   d'une séance de VO2 pour un bénéfice moindre, et il empêche de prendre du
   volume. C'est l'erreur la plus fréquente selon Maxime.
8. **La sortie longue reste sous 48 % du volume de course de la semaine**, 46 %
   dès que le volume dépasse 65 km. Avec quatre courses, une longue de 26 km
   pèse forcément près de la moitié tant que le volume n'a pas monté : un
   plafond fixe à 45 % aurait interdit de progresser. Et
   **une semaine sur trois environ elle raccourcit** (`PAUSE_LONGUE`). L'ancien
   plan la laissait à 57 % : une journée écrasait la semaine, ce qui est le
   profil de charge qui use un tendon. Les semaines de course et leurs
   lendemains sortent de cette règle, elles n'ont que trois courses.
9. **20 à 30 minutes cumulées au seuil par semaine, et trois séances de seuil
   pour une séance de vitesse.** C'est le dosage de Maxime pour un marathonien.
   La vitesse tient dans des répétitions courtes avec récupération généreuse :
   des 200 m et des lignes droites ne sont pas des séances dures.


## La semaine type

Refondue le 18 septembre 2026. Quatre courses, un vélo, deux renforcements full
body, aucun renfo un jour de course.

| Jour | Contenu |
|---|---|
| Lundi | Sortie longue |
| Mardi | Course facile de récupération |
| Mercredi | Renfo full body, jambes dominantes, + vélo Z2 |
| Jeudi | Séance de qualité, lignes droites à l'échauffement |
| Vendredi | Renfo full body, haut dominant |
| Samedi | Course facile ou moyenne, allure marathon en bloc spécifique |
| Dimanche | Repos jambes complet |

Les deux renforcements tombent les jours sans course, et le Stanish est dans les
deux : c'est un traitement, pas un complément. Le mercredi porte aussi le vélo,
un jour sans impact au sol qui ne charge pas le tendon.

## Le plan

**34 semaines, du lundi 10 août 2026 au dimanche 4 avril 2027, 275 séances.**
Il vit dans `src/data/plan.json`, généré par `reference/build_plan_v2.py` et
validé par `reference/check_plan_v2.py`. **C'est une donnée de référence, pas
une donnée utilisateur** : elle est versionnée dans le code, pas en base. Seuls
les écarts volontaires vont dans `plan_overrides`.

**Les semaines 1 à 6 sont reprises telles quelles de l'ancien plan**, archivé
dans `reference/archives/`. Les ressentis déjà saisis sont rattachés à la
position (semaine, jour, rang dans la journée) : les régénérer déplacerait le
carnet. Seule la séance du samedi de la S6 a changé de contenu, à position
identique. Le contrôle ne vérifie donc que les semaines 7 à 34.

| Bloc | Semaines | Rôle |
|---|---|---|
| A · Réathlétisation | 1-8 | Le volume monte vers 54 km, l'intensité reste basse |
| B · Bloc 10 km | 9-15 | 20 km de Paris en rythme, cinq séances à allure 10 km, 10 km Hoka |
| C · Volume | 16-26 | De 53 à 72 km, du seuil chaque jeudi, semi test le 30 janvier |
| D · Spécifique marathon | 27-31 | Cinq semaines, allure marathon en volume, longues à 30 et 32 km |
| E · Affûtage | 32-34 | Le volume tombe, l'allure marathon reste |

Les **vraies décharges** sont S17, S21 et S26 : elles creusent d'au moins 20 %
en volume comme sur la sortie longue. Les **pauses de longue** sont S13,
S19, S24 et S30 : la longue raccourcit d'un quart, le volume ne bouge presque
pas. C'est le conseil de Maxime, s'accorder une pause de sorties longues toutes
les deux ou trois semaines pour assimiler la charge.

**La séance de qualité ne bouge pas en semaine de décharge.** Ni son intensité,
ni sa place. C'est le volume autour qui se coupe : l'endurance du mardi perd
2 km, celle du samedi aussi, l'échauffement raccourcit, le vélo perd un quart
d'heure. Les planchers de chaque séance maintenaient sinon la décharge à −15 %,
au lieu des −20 % exigés.

### Le bloc 10 km

Sept prises de contact avec l'allure de course, du 19 septembre au 11 novembre,
plus le dossard. L'allure 10 km est la zone `vo2` du modèle, 3:57/km.

| Date | Séance |
|---|---|
| Sam 19/09 (S6) | 6 x 300 m à 4:00 puis 10 min au seuil |
| Lun 28/09 (S8) | Sortie longue de 20 km : 14 km EF, 4 km allure semi, 2 km au seuil |
| Lun 05/10 (S9) | Sortie longue de 16 km : 10 km EF, 4 km allure semi, 2 km au seuil |
| Jeu 24/09 (S7) | 8 x 200 m à 3:45, puis 15 min au seuil |
| Jeu 01/10 (S8) | 10 x 300 m à 4:00 |
| Dim 11/10 (S9) | **20 km de Paris**, chrono bonus |
| Sam 17/10 (S10) | 5 x 600 m à 4:05, semaine à début décalé |
| Jeu 22/10 (S11) | 6 x 800 m à 4:05 |
| Jeu 29/10 (S12) | 5 x 1000 m à 4:08 |
| Jeu 05/11 (S13) | 8 x 600 m à 4:00 |
| Mer 11/11 (S14) | 5 x 400 m, rappel d'allure |
| Dim 15/11 (S14) | **10 km Hoka**, l'objectif de l'automne |

Le volume ne baisse pas pendant le bloc : 55 puis 58 km, les plus grosses
semaines depuis le début. C'est ce qui distingue ce bloc d'une prépa 10 km
classique, et c'est ce qui protège le marathon d'avril.

**La sortie longue ne monte pas pendant le bloc.** Elle tient 26 km, puis 24 et
26 pendant les séances spécifiques. **Les deux longues qui précèdent le 20 km
raccourcissent et se densifient** : 20 puis 16 km qui accélèrent
jusqu'au bout, allure semi puis seuil, pour installer le rythme de la course.
**Une sortie longue ne ralentit jamais**, et `check_plan_v2.py` le vérifie
désormais sur toutes : le negative split est la compétence marathon numéro un,
et un plan qui finit plus lentement qu'il n'a commencé apprend l'inverse. Elles sortent de la
chaîne de progression, comme les décharges : ce ne sont pas des étapes du
kilométrage : on ne développe pas deux qualités en même
temps, et la charge nouvelle de ces semaines est la séance du jeudi. Elle
reprend sa progression en S16, une fois la course passée.

### Les quatre dossards

- **20 km de Paris, dimanche 11 octobre** (S9). Bonus. Trois jours d'allègement
  seulement, la semaine pèse encore 56 km course comprise.
- **10 km Hoka, dimanche 15 novembre** (S14). L'objectif de l'automne. Record à
  battre 40:12, fourchette réaliste 40:40 à 41:30. Le chrono recalera la forme
  projetée depuis la feuille de séance (`recalageSurCourse`).
- **Semi test, samedi 30 janvier** (S25). Le point de bascule : sous 1 h 30
  l'objectif 3 h 15 tient, au-delà de 1 h 35 on recale sur 3 h 25.
- **Marathon de Paris, dimanche 4 avril** (S34).

**Une semaine de dossard ne porte aucune course la veille** : sinon samedi et
dimanche s'enchaînent, ce que la contrainte 6 interdit. Les semaines qui suivent
un dossard (S10, S15) ont un **début décalé** : lundi repos, mardi course très
facile, la sortie longue passe au jeudi, et les deux renforcements ignorent les
jambes pour ne pas tomber la veille de cette longue.


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
endurance +50, allure marathon 0, **allure semi −13**, seuil −20, intervalles
−40, répétitions −55.

**L'allure semi a été ajoutée le 18 septembre 2026.** Elle manquait : les fins
de sortie longue avant un dossard et le semi test de janvier n'avaient que le
seuil ou l'allure marathon, deux allures qui encadrent la bonne sans la dire.
Elle coûte 1,45 au kilomètre dans l'indice, entre l'allure marathon et le seuil,
et se lit en Z3 haut côté cardiaque.
Ces valeurs reproduisent les tables de Jack Daniels pour un VDOT autour de 55,
qui est le sien.

**Test de calibrage** : 3 km le 8 août 2026 en **12:02** (4:00/km, meilleur
kilomètre à 3:50, splits 3:59 / 3:55 / 4:05). Le test était bien maximal, voir
la section suivante.

**Le prochain recalage est le 10 km du 15 novembre**, pas un nouveau test de
3 km : arbitré par Mathieu le 16 septembre 2026, la fin du bloc A était trop
tôt. La feuille de toute course de 10 à 39 km (`recalageSurCourse`) porte un
bloc « Ton chrono », une fois le jour passé : saisie, projection affichée, puis
recalage sur confirmation. Le chrono est enregistré comme durée réelle de la
course (`EcartPatch.durMin`), la forme dans `profiles.fitness_pace_s` : aucune
colonne à créer.

- **`projeterMarathon` (`paces.ts`) utilise les équations de Daniels et
  Gilbert**, avec une prudence qui décroît avec la distance. L'équivalence pure
  projette le 12:02 7 s/km plus vite que `projectFrom3k` : ce n'est pas un
  désaccord, c'est l'endurance spécifique qu'un effort de douze minutes ne
  mesure pas. Sans correction, le même niveau couru sur 10 km aurait affiché un
  progrès fabriqué par le changement de méthode. La prudence vaut ces 7 s/km
  sur 3 km et zéro sur 42 km, en échelle logarithmique ; le 12:02 retombe
  exactement sur 289.
- Le marathon ne recale rien : c'est l'aboutissement, pas une mesure.

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
  séance sautée garde l'adaptation À L'ÉCRAN mais perd son étiquette
  (22 septembre 2026) : sauter la course devenue vélo doit afficher « vélo
  sauté », sinon la carte parle d'une séance que Mathieu n'a jamais vue.
  Rien ne change au calcul, une séance sautée vaut zéro dans la charge. Le
  palier, lui, ne vise que ce qui reste à courir : il ignore les sautées.
- **Une séance sautée vaut zéro dans la charge**, comme une journée sans
  activité importée.
- **Le contrôle des contraintes avertit, il ne bloque pas.** `verifierContraintes`
  lit les contraintes 3, 4 et 6 sur la disposition de la semaine. La 2 a été
  retirée le 18 septembre 2026 avec l'escalade, et son numéro reste vacant :
  des écarts en base y font référence.
  **Chacune vise une séance, jamais une case du calendrier.** La 4 a deux volets : rien ne se pose sur
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
- **Un écart peut composer une séance de qualité** (`EcartPatch.qualite`).
  Changer de discipline ne suffisait pas : une séance spécifique n'est pas une
  discipline, c'est un contenu, et `versType` efface les allures avec le reste.
  On pouvait donc transformer une sortie longue en course facile mais jamais
  composer un 5 x 1000 m au seuil. Trois réglages la définissent, répétitions,
  longueur, zone, et **le reste se déduit, `struct` compris** : c'est lui que
  lit le coût tendineux, et une séance dont le modèle ignorerait la zone
  coûterait le prix d'une sortie facile. La VO2 donne un `inter`, les deux
  autres zones un `tempo`, donc `verifierContraintes` la traite comme de la
  vitesse sans qu'on ait à le lui dire. Pas de champ libre : un titre qui ne se
  traduit pas en segments est un titre qui ment sur la charge.
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
- **La séance spécifique du jeudi suit la même règle**, avec son propre
  verdict. Elle grossit d'une répétition par semaine dans le plan ; quand la
  précédente n'est pas passée, `palierProchaineSpecifique` **répète la
  précédente à l'identique** au lieu de monter. Le plafond porte la séance
  entière et pas son kilométrage : « 3 x 1000 m » ne se déduit pas de 7 km, et
  afficher une distance sans dire comment la courir ne serait pas une séance.
- **Les deux familles se suivent séparément.** `FamillePalier` vaut `long` ou
  `specifique`, et une sortie longue douloureuse ne plafonne pas la séance du
  jeudi, qui n'a rien à voir avec elle. La cible se reconnaît au drapeau
  `Session.specifique`, jamais au jour : une règle vise une séance, jamais une
  case du calendrier.

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

### Les séances à noter

`src/lib/aNoter.ts` (+ 9 tests), page `Profil → Séances à noter`. **C'est le
KPI « Séances notées » de Suivi qui y mène**, quand il y a du retard : un
bandeau à côté aurait dit deux fois la même chose, et le chiffre qui pose le
problème est le bon endroit d'où partir le résoudre. L'étiquette « 3 en
retard » est sur la même ligne que le « 12 / 310 » : elle le qualifie, elle ne
s'ajoute pas à lui.

Le décompte « 3 en retard » du KPI de Suivi disait qu'il manquait quelque chose
sans dire quoi : il fallait remonter le calendrier à la main. Or ces trous ne
sont pas un détail de comptage, ce sont eux qui plafonnent la confiance de
l'indice et qui font passer `chargeInconnue` à vrai.

- **La liste et le décompte viennent de la même fonction.** `seancesANoter` est
  calculée une fois dans `App` et descend dans les deux écrans : un badge qui
  ne correspond pas à sa liste est pire que pas de badge.
- **Le repos et les séances sautées n'y sont pas** : il n'y a rien à noter, et
  une tâche qui ne peut pas se terminer n'est pas une tâche.
- **La séance du jour y figure mais n'est pas « en retard »** : une séance du
  soir n'est pas en retard à midi. `enRetard` sépare les deux, et c'est lui que
  compte le badge.
- Attention, **`joursAttestes` exige TOUTES les séances du jour**. Noter la
  course sans noter le renfo ou l'escalade laisse la journée non attestée, donc
  la confiance plafonnée. C'est la raison la plus fréquente d'un
  « historique de charge encore court » sur un carnet qu'on croit complet.

### Le mot du coach

`src/lib/coach.ts` produit l'encouragement du bas de l'écran Aujourd'hui.
**Règle unique : ne jamais affirmer un chiffre absent des données.**

**Il parle d'abord de la séance du jour.** `motSurLaSeance` passe avant toutes
les autres règles : le jour où l'indice retire la course, féliciter pour
l'excentrique de la quinzaine n'est pas un coach, c'est un bandeau.

Huit cas, dans cet ordre : ce que l'INDICE a imposé (course neutralisée,
sortie longue raccourcie), puis ce que MATHIEU a décidé (contrainte cassée,
séance sautée, remplacée, déplacée, distance corrigée), puis la charge non
attestée. **Les quatre règles du milieu ne doivent jamais dépendre d'un indice
haut** : les cinq premières versions l'étaient toutes, et à 27 sur 100,
changer une séance ne produisait donc aucun mot — c'est-à-dire précisément
dans le cas courant. Le seul endroit où l'indice décide encore, c'est le TON :
un allègement volontaire est un « bon réflexe » au-dessus de 50 et une simple
constatation en dessous, parce qu'en dessous le modèle ne l'avait pas vu venir
et le féliciter laisserait croire l'inverse.

**Jamais le même SUJET trois jours de suite.** Arbitré le 15 septembre 2026,
corrigé le 19 : la première version excluait la règle affichée la veille, mais
« raideur en baisse », « raideur en hausse », « raideur stable » et « douleur
sur le long terme » sont quatre règles qui parlent toutes de la même chose, et
Mathieu a vu la raideur au réveil revenir tous les matins. Chaque candidat
porte donc un `sujet` (raideur, douleur, excentrique, charge, séance, semaine,
carnet, régularité, forme, échéance), et `motDuCoach` écarte les sujets des
**deux** derniers jours (`exclureSujets`). La mémoire vit dans `localStorage`
(`tenload-coach`, trois jours) : c'est ce que CET écran a montré. **Trois
règles sont `obligatoire`** et se répètent tant qu'elles sont vraies : course
neutralisée, sortie longue raccourcie, contrainte cassée. Taire le deuxième
jour d'une course retirée serait la laisser croire levée. Le compte à rebours
est toujours disponible, c'est lui qui garantit qu'un autre mot existe.

Trois règles de fond s'ajoutent, avec les mêmes exigences de saisie : le
compteur de jours sans douleur au-dessus de 2 (trois relevés sur quatre, et le
« depuis » s'arrête au premier jour du carnet), la variation de charge entre
deux semaines pleines (jamais quand `chargeInconnue`), et la série de matins
notés. La raideur stable, observation plate, passe après toutes.

**Les lectures réfléchies**, demandées par Mathieu le 16 septembre 2026. Les
faits sont calculés dans `Today` (`SeanceHier`, `SemaineEnCours`, `forme`) et
le coach ne fait que les lire, pour rester pur et testable.

| Règle | Ce qu'elle lit | Garde-fou |
|---|---|---|
| `episode-douleur` | pic d'aujourd'hui ou d'hier contre les quatre semaines d'avant | dix relevés de fond, pic ≥ 3 et +2 ; vise la course du jour, sinon le vélo |
| `decharge-trop-chargee` | réel de lundi à hier + projection, contre la dernière semaine de charge | au-dessus de 80 %, la barre de `check_plan.py` ; jamais sur `chargeInconnue` |
| `semaine-hors-attentes` | réel contre plan de référence sur les mêmes jours | ±20 %, deux jours écoulés, jamais sur `chargeInconnue` |
| `seance-hier` | effort perçu contre `RPE_ATTENDU`, durée réelle contre la fourchette du plan | course seulement ; la fourchette vient du plan de référence, pas de l'écart |
| `excentrique-serie` / `excentrique-relance` | série de jours, ou oubli d'hier | la relance exige un carnet tenu hier |
| `jour-douloureux` | douleur du soir et d'effort par jour de semaine, six semaines | trois relevés par jour sur cinq jours, +1 point et ≥ 2,5 |
| `douleur-long-terme` | trois premières semaines du carnet contre les deux dernières | six semaines de recul, huit relevés de chaque côté |
| `forme-long-terme` | écart de `ajusterForme` et chrono projeté | trois séances, écart ≥ 3 s/km |

Les trois lectures de vigilance passent avant la séance d'hier, qui passe
avant les encouragements de fond.

Le chiffre cité est toujours l'indice réellement calculé et le fait cité est
toujours un changement réellement appliqué. `SeancePlanifiee.typePlan` et
`SeanceDuJour.distPlan` existent pour ça : dire « ta sortie longue de 26 km
est devenue du vélo » plutôt que « tu as du vélo », qui n'apprend rien. Chaque
message exige un minimum de saisies (quatre raideurs matinales de chaque côté
de la fenêtre, par exemple) et se tait sinon. Un encouragement inventé se
repère en une semaine et discrédite l'indice avec lui. L'ordre des règles est
un ordre de valeur : raideur au réveil, puis observance de l'excentrique, puis
régularité, puis l'indice — qui vient en dernier parce que c'est un agrégat et
non une observation.

## La méthode de Maxime

Choisie comme référence par Mathieu le 18 septembre 2026, d'après les vidéos de
**Maxime Lopes (RunWise)** : la prépa générale, le seuil, la sortie longue, et
le podcast « Ce qui fait stagner 80 % des coureurs ».

Ce qu'elle impose au plan est dans les contraintes 7, 8 et 9. Ce qu'elle impose
au reste :

- **La prépa générale est longue, le spécifique est court.** Cinq semaines de
  spécifique marathon, pas sept. Son athlète Johann a couru 2 h 15 avec cinq
  semaines de spécifique, et il préfère « une prépa générale trop longue qu'une
  prépa spécifique trop longue ».
- **Le seuil est un état, pas une allure.** 82 à 90 % de FC max, effort 7,5 sur
  10 au maximum, mieux vaut partir près du seuil 1 et monter. Menu : 2 à 3 x
  10 min, 3 x 8 min, 5 x 6 min, 8 à 10 x 3 min.
- **La sortie longue est une séance de qualité**, souvent le plus gros stress de
  la semaine. Sucre avant, un gel dès 1 h 20, 20 g de protéines après.
- **Compter ses erreurs, pas seulement ses kilomètres.** Maxime en comptait 45 à
  50 en 2025 contre 10 à 20 sur une bonne année. C'est devenu un indicateur du
  bilan du dimanche.
- **« Pas de jambes » n'existe pas** : quand une course rate, les signaux
  étaient là trois semaines avant. C'est ce que le carnet de patterns cherche.
- **Ne pas s'entraîner malade** : « le kilomètre que tu penses gagner, tu le
  perds en double derrière ».
- **Le changement brutal de type d'effort blesse**, pas seulement le volume.
- **Ne pas copier les pros** : ils sont 0,01 % et occupent 80 % de ce qu'on lit.

## Le carnet de patterns

`src/lib/carnet.ts` (+ 9 tests), page `Profil → Tes patterns`. Demandé par
Mathieu le 16 septembre 2026 : utiliser l'app comme un carnet de suivi qui relie
la douleur à ce qui a été fait, pour trouver des patterns, des manques et des
abus, dans l'app ou en passant les données à une IA.

- **`construireCarnet` met sur la même ligne l'activité et la douleur**, sur
  90 jours : séances notées (effort perçu, douleur d'effort), historique Strava
  avant le 10 août, réveil, soir, **réveil du lendemain** (le verdict de la
  journée), excentrique, charge.
- **Un jour avec une séance non notée est incomplet** : il reste dans l'export,
  marqué, mais n'entre dans aucune comparaison. Ce qui a été fait ce jour-là est
  inconnu, pas nul. Même règle que partout.
- **La durée d'une séance n'est qu'une durée saisie**, jamais l'estimation du
  plan : une estimation n'est pas une mesure.
- **`trouverPatterns` compare la douleur des jours avec et sans** chaque
  facteur (sortie longue, qualité, EF, vélo, renfo bas, escalade, excentrique,
  journée sans jambes, effort ≥ 8, charge 30 % au-dessus des quatre semaines
  d'avant), sur le soir même et le réveil du lendemain. **Quatre jours de chaque
  côté et un demi-point d'écart au minimum**, effectifs toujours affichés : un
  pattern affiché s'installe comme une vérité.
- **`exporterPourIA`** produit un Markdown avec les échelles, une consigne
  d'analyse qui exige de séparer corrélation et cause, la tenue du carnet, une
  ligne par jour et les patterns déjà repérés. Copié au presse-papiers, feuille
  de partage iOS en repli. Aucun nom dedans.
- Le carnet ne se calcule que quand la page est ouverte.

## Le bilan de la semaine

`src/lib/bilan.ts` (+ 6 tests), carte `CarteBilan` au-dessus du mot du coach
dans Aujourd'hui. Demandé par Mathieu le 16 septembre 2026. **Le dimanche** il
porte sur la semaine qui se referme, **le lundi** sur celle qui vient de finir :
on ne relit pas toujours l'app le dimanche, et la semaine qui commence est
justement celle dont la carte parle.

- Séances faites, sautées, à noter ; kilomètres de course réels contre le plan
  de référence ; charge réelle contre plan ; raideur moyenne contre la semaine
  d'avant ; pic de douleur et son moment ; jours d'excentrique.
- **L'écart de charge n'est pas calculé tant qu'une séance passée n'est pas
  notée** : la charge réelle serait sous-estimée, donc l'écart rassurant à tort.
- **Pas de moyenne de raideur sous trois matins**, une nuit ferait la moyenne.
- « La semaine prochaine » ne dit que ce que le plan porte ou ce que le moteur
  a déjà appliqué : décharge, dossard, sortie longue contre celle de la semaine
  (ou tenue par le palier, avec sa raison), séances déjà changées par l'indice
  projeté (qui ne vaut que sur dix jours, et la phrase le dit), semaine à quatre
  courses.

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
- **Le dimanche à 20 h, le bilan de la semaine** (`messageBilan`, option
  choisie par Mathieu le 16 septembre 2026). À 20 h et non à 23 h : il se lit
  avant de préparer la semaine, et ne se mélange pas au point du soir. **Il ne
  porte que ce qui se lit en base** : séances notées, séances sautées (écarts
  de la semaine du plan), raideur moyenne contre la semaine d'avant (trois
  matins minimum), jours d'excentrique. Les séances prévues, la charge et la
  semaine suivante demandent le plan et le modèle, qui vivent dans l'app :
  la notification y renvoie au lieu de les approximer. Elle se tait sur une
  semaine sans aucune trace et hors des 35 semaines. **Toute modification de
  `logique.ts` ou `index.ts` demande un redéploiement** :
  `supabase functions deploy rappels`.
- **Le dimanche, le point du soir ne réclame pas de ressenti de séance** :
  c'est le repos jambes de la contrainte 4. Un écart volontaire pourrait le
  démentir et le rappel se tairait à tort, ce qui est le bon sens de l'erreur.
- **Sur iPhone, rien ne marche hors PWA installée.** L'écran de réglage le dit
  avant de proposer le bouton, plutôt que de laisser croire à une panne.
- Les gestionnaires `push` et `notificationclick` vivent dans
  `public/push-sw.js`, greffé au service worker généré par
  `workbox.importScripts`. Ce fichier est mis en cache pour un temps qu'on ne
  maîtrise pas : **il ne doit porter aucune règle métier**, tout le texte vient
  du message envoyé.

## La refonte « braise » (branche `design-test`)

Demandée le 21 septembre 2026, d'après une maquette Claude Design de Mathieu
passée du violet à l'orange. **Aucun calcul ni aucune séance ne change** :
c'est une consigne, pas un effet de bord. Seuls deux textes de règle ont bougé,
parce qu'ils nommaient l'onglet Allures.

- **Palette** (`tokens.css`) : **Trailblazer, le design system d'AllTrails,
  en mode clair**, sur ses rôles sémantiques fournis par Mathieu. Fond
  Container/Primary (Neutral-0), cartes Container/Secondary (Neutral-100),
  et ce qui vit dans une carte remonte en Neutral-0. Texte Dark (Green-400)
  et Subtle (Neutral-600, qui écrit aussi les étiquettes). Filets Neutral-200
  et 300. **Bouton d'action : Button/Accent** (NeonGreen-100, survol 200,
  texte Green-400, `.bouton-pale` et `--neon`). **Sélection : Button/Focus**
  (Green-300, texte blanc, `--pale`). Cartes sombres (`.carte-braise`) en
  Tertiary vers Brand ; **elles redéfinissent les jetons pour leurs
  enfants** (`--ink` blanc, `--accent` NeonGreen-100), si bien qu'un
  composant posé dedans s'inverse sans rien savoir. Blue (AllTrails+) pour
  la courbe d'effort, valeur `#4f63f2` relevée à l'œil, à confirmer. Les
  noms `pale` et `braise` sont restés des versions précédentes.
- **Trois familles de couleur, trois rôles** (arbitré le 22 septembre 2026) :
  le **vert foncé** n'appartient qu'au coach ; le **vert clair** (néon) à ce
  qui se touche, boutons, sélection, bascules (`--pale` vaut désormais le
  néon) ; le **bleu** (gamme `--bleu-50` à `--bleu-900`, autour des deux
  bleus d'origine 100 et 500) et le gris aux blocs de page, au déroulé et aux
  allures. La jauge est un bloc bleu pâle (`.carte-bleu-pale`), la séance du
  jour un bloc bleu (`.carte-bleue`, qui inverse les jetons comme la carte du
  coach). Le déroulé est en bleu, ses segments d'effort passent au néon quand
  la séance change d'allure (`couleurRole`). Suivi garde le bleu et le vert.
- L'allure marathon visée ne vit plus que dans Profil → Réglages d'allure ;
  la forme projetée (`CarteForme`) est dans Suivi, avec le gain sur quatre
  semaines en secondes.
- **Les teintes de bande vivent dans `src/lib/teintes.ts`**, pas dans `BANDS`
  (tendonIndex.ts), qui est un fichier du modèle. La bande jaune y est enfin
  jaune. `COULEUR_DOULEUR` (ressenti.ts) suit les mêmes teintes, le noir
  devenant un grenat lisible sur fond sombre.
- **Typographie** : Fraunces (serif, axes SOFT et opsz) pour les titres, les
  grands chiffres (`.chiffre`) et le mot du coach en italique (`.display-it`) ;
  Instrument Sans pour le texte courant. **Toutes les tailles passent par
  l'échelle de `tokens.css`** (`--fs-micro` à `--fs-lead` pour la linéale,
  `--fs-t-*` pour les titres, `--fs-c-*` pour les chiffres, `--fs-coach*`),
  resserrée le 22 septembre 2026 : onze tailles de linéale au demi-pixel
  près ramenées à six. Aucune valeur en dur dans un composant ; seuls les
  axes des graphiques SVG gardent la leur, en unités du dessin. Les deux sont embarquées par
  `@fontsource` et préchargées par la PWA, sous-ensemble vietnamien exclu.
- **Allures devient Objectif.** La clé d'onglet reste `paces` pour ne toucher
  aucun appelant. L'écran porte l'allure visée, les zones en barres, la forme
  projetée et les **dossards**.
- Aujourd'hui : jauge en gélule (`CarteCharge`), « ce que ça change »
  (`CeQueCaChange`, qui remplace AlertBox), carnet résumé et sa page
  (`PageCarnet`), bilan de semaine en page. Le détail du calcul est une page.
- Programme : pastilles de jour pleine hauteur dans la vue semaine, le bloc en
  tête avec les chiffres de la semaine, les jours passés grisés. Le calendrier
  a deux lectures au choix : **vue semaine** (par défaut, sur la semaine en
  cours, là où les séances se déplacent) et **vue globale**, la grille du plan
  entier (`GrilleCalendrier`), le passé coloré par bande, l'avenir par type de
  séance, la sortie longue en néon.
- Le ressenti n'a plus de phrase d'introduction : les deux curseurs se
  suffisent. Le ressenti de séance garde les curseurs d'origine (`JaugeRessenti`) et les
  mots du test de la parole : les pastilles de la maquette ont été essayées puis
  retirées le 22 septembre, une seule façon de noter dans toute l'app.
- **Le vert profond est réservé au mot du coach** (`.carte-braise`), et à ce
  qui en est une variante : mot mental du bilan, mot du coach d'un dossard.
  Arbitré par Mathieu le 22 septembre 2026 : les autres blocs n'y ont pas
  droit. L'action est en néon, la séance à faire en blanc sous un filet fort.
- **Majuscule au premier mot de chaque ligne**, étiquettes comprises.
- **Un seul bouton d'action** (`BoutonAction`) : pilule néon, libellé à
  gauche, pastille blanche ronde à droite avec l'icône du geste. « Ouvrir le
  carnet » est la référence (arbitré le 22 septembre 2026). Seuls les gestes
  secondaires (annuler, désactiver, retirer) restent en contour.
- **Détail de séance façon fiche AllTrails** : retour à gauche, titre en
  grand, ligne de repères (pastille d'intensité en verts, catégorie, date,
  semaine), rangée de chiffres à filets verticaux (distance, temps estimé,
  allure, intensité), et **barre d'actions collée en bas** (Noter en néon,
  Sauter, Déplacer, Donnée réelle, Remplacer), qui défile à l'horizontale.
- Aujourd'hui n'a plus de bloc « ce que ça change » : l'adaptation se lit
  sur la séance. Le carnet du jour n'y est qu'un résumé à jauges fines, la
  saisie vit dans sa page.
- **Les bandes reprennent les camaïeux de la branche main** (`CAMAIEU_BANDE`
  dans teintes.ts), en m4 — la teinte claire — et avec le vert de la marque
  à la place du vert d'eau : vert #65f67b, jaune #93c5fd, orange #fcd34d,
  rouge #fb7185, noir #d946ef. Le nom d'une bande ne décrit plus sa couleur
  (le « jaune » est bleu, le « noir » violet) : c'est l'ordre qui se lit.
  L'encre posée dessus est le m6 de la même famille.
- **La douleur ET l'effort perçu** suivent ces familles : m4 puis m2 par
  palier. Deux notes de 0 à 10 sur la même séance ne peuvent pas avoir l'une
  une échelle et l'autre un bleu fixe.
- **Une couleur par allure** (`COULEUR_ZONE`, seanceStyle.ts), la même dans
  les barres d'Objectif et dans le déroulé d'une séance. Elle va **du vert
  au bleu** : les deux allures lentes, qui font le volume, prennent le vert
  de la marque, les cinq autres foncent dans le bleu — sept bleus voisins ne
  se distinguaient pas. **Les récupérations entre deux tours sont en vert
  clair**, ce qui fait lire le
  graphique du déroulé comme une alternance effort / souffle. L'ancienne règle du
  néon quand la séance change d'allure est retirée : on ne voyait pas OÙ
  l'allure changeait, ce qui est justement ce que le déroulé montre.
- **Un seul orange** (`--orange-100` à `--orange-900`), aligné sur la
  famille ambre des bandes depuis que les camaïeux sont revenus : l'aplat des
  étiquettes, la bande, le cran 5 de la douleur, l'encre d'alerte et l'encre
  sur l'aplat. `--warning` et `--serious` valent tous deux le 700 : deux
  oranges pour deux degrés du même message ne se lisaient pas comme une
  échelle.
- Le bloc de charge est une **carte grise** (Neutral-100) avec un tube blanc
  à filet gris et un **bouton secondaire** blanc à flèche bleue : le néon
  reste à l'action principale d'un écran.
- L'anneau de Suivi ne montre que **la course** : le vélo et le renfo
  écrasaient la lecture du dosage d'intensité (`ORDRE_COURSE`).
- Suivi : les courbes de douleur sont **lissées à l'affichage** (moyenne
  glissante de 7 jours, `lisser`), l'indice lit toujours les valeurs brutes.
  Les trois courbes de douleur ont la même épaisseur : la fin de journée se
  distingue par sa couleur, pas par un trait plus gros.
  Deux graphiques de niveau en course (`NiveauChart`) : le marathon projeté
  semaine par semaine (`serieForme`, l'ancre est le test actuel) et l'effort
  perçu contre l'effort attendu (`ecartEffortSemaine`), soit exactement ce
  que lit `ajusterForme`.

- Retours du 22 septembre, fin de journée : les trois indicateurs de la
  semaine vivent DANS la jauge, sous l'échelle des bandes ; les étiquettes
  de séance sont en aplat plein (`.tag-adapte`, `.tag-ecart`) pour se lire
  sur le bloc bleu ; le bouton du ressenti reste grisé tant qu'aucun curseur
  n'a bougé. Programme : le jour courant en bleu clair, les semaines passées
  du bloc en vert foncé (exception voulue par Mathieu à la règle du vert
  réservé au coach), la nature de la semaine sous les dates et trois puces
  seulement dans la carte du bloc. Calendrier : filets droits, sans icônes,
  mêmes corps que la vue semaine ; vue globale en pastilles aplaties.
- **Aucune couleur hors famille** (rattachement du 22 septembre) : toute
  teinte dérive d'une des sept principales (Neutral-0, Neutral-100,
  Green-400, néon, Bleu 500, Green-300, les bandes) ; les fonds légers se
  font par `color-mix` sur un jeton, jamais par un `rgba` d'une ancienne
  palette. La jauge de charge a une gélule blanche et le bouton rond dans
  le coin, comme la séance du jour (12 px du haut et du bord) ; ses
  compteurs de la semaine sont partis dans les chiffres de Suivi.
- **Règle de rédaction** (audit du 22 septembre) :
  - **titres** d'écran, de section et de carte : un groupe nominal, sans
    article ni possessif (« Déroulé », « Ressenti », « Contraintes »,
    « Zones cardiaques »), jamais de point final ;
  - **boutons** : un verbe à l'infinitif et un article, jamais « mon, ma,
    mes » (« Enregistrer le ressenti », « Recalibrer les zones ») ; une
    action de la barre de séance est un verbe seul (Noter, Sauter,
    Déplacer, Corriger, Remplacer) ;
  - **descriptions** (rubriques du Profil) : un groupe nominal avec article,
    sans verbe conjugué ni point final ;
  - **texte courant** au tutoiement, phrases complètes avec point ; la
    première personne n'appartient qu'au coach ;
  - aucun mot anglais (« vs ») ; un point médian n'ouvre jamais une ligne.
- La date d'Aujourd'hui tient sur une ligne : si « Mardi 22 septembre » ne
  tient pas, le mois s'abrège (`TitreUneLigne`), jamais le jour. Les flèches
  de jour sont à côté du bouton profil.
- Suivi : six chiffres en cartes grises, et la **répartition de la semaine**
  en anneau (`repartition.ts`, 4 tests), en temps par intensité (endurance,
  allure marathon, seuil, vitesse, vélo, renfo) sur le plan de la semaine,
  écarts compris et séances sautées exclues.
- **Profil → Bilans de la semaine** relit chaque semaine terminée
  (`BilansPasses`). Le calcul est sorti d'Aujourd'hui dans
  `construireBilan` (`bilanDeSemaine.ts`), lu à la date `ref` : aujourd'hui
  pour le bilan courant, le lundi suivant pour une semaine passée, sans la
  forme projetée, qui ne vaut que pour aujourd'hui.

- Le détail du calcul prend six teintes lisibles comme TEXTE (`TEINTE_TERME`,
  ChargeSheet) : le néon et le vert clair disparaissaient sur la carte, et le
  total reprend l'encre de l'app, la teinte m4 d'une bande étant trop claire
  pour un chiffre de 72 px.

- **Une seule ligne de repères** sur toute carte de séance : distance, durée,
  allure, puis l'échelle d'intensité, en texte (23 septembre). L'intensité
  vivait dans une pilule et la durée en texte brut sur la même carte, et
  l'inverse sur la carte d'à côté. Les cartes n'ont plus d'icône de
  discipline, seule la séance notée garde sa coche.
- Une séance **sautée** descend avec les séances notées sur Aujourd'hui,
  barrée : elle n'est plus « à faire ».
- Profil à deux niveaux (23 septembre) : ton suivi en cartes (bilans, séances
  à noter, patterns, dossards passés, rappels), puis deux portes,
  « Informations du programme » et « Paramètres », et la déconnexion.
- Suivi ne garde que trois chiffres (course sur 7 jours, santé du tendon,
  séances notées) : ceux de la semaine en cours répétaient Aujourd'hui. Il
  porte les **chronos équivalents** (colonnes « Aujourd'hui » et « Visé le
  4 avril ») et le **rapport aigu sur chronique** (`RatioChart`), dessiné sur
  ses trois plages de lecture.
- Objectif n'a plus de bascule course/vélo : chaque zone porte sa fourchette
  de FC en course et celle du vélo entre parenthèses.

- **L'indice de Suivi se dessine en colonnes**, une par journée, à la couleur
  de sa bande (dessin choisi par Mathieu parmi quatre, le 23 septembre 2026).
  Au-delà de deux mois la colonne s'efface progressivement, sans jamais
  disparaître tout à fait ; l'avenir projeté reste en creux, et un pointillé
  marque aujourd'hui.
- **La forme projetée a quitté Suivi** : elle vit sur la page de chaque
  dossard à venir, avec l'objectif de CETTE course et la règle à l'échelle de
  sa distance (`CarteForme` accepte un titre, un format et une plage).
- Le détail du calcul nomme les gestes de la veille un par un
  (`ChargeSheet`, prop `soins`) : « pourquoi je n'ai pas mes −5 de repos »
  n'avait pas de réponse dans l'app.
- Toutes les séances du jour encore à faire sont des blocs bleus à bouton
  vert, le vélo comme la course. **L'intensité s'écrit en texte, sur la ligne
  des repères**, jamais en pilule : la pilule a été essayée puis retirée le
  23 septembre, tout le reste de l'app écrit ses chiffres en texte.
- **Logo et icônes** : le logo de Mathieu (rond bleu sur fond vert, mot-clé
  « tenload ») remplit favicon, apple-touch et les trois icônes PWA. Le
  `theme_color` suit le fond blanc de l'app.
- Dans le détail du calcul, toutes les barres se remplissent depuis la
  gauche, le soin compris, et la ligne des gestes donne la charge de la
  veille : c'est elle qui décide du −5 de journée de repos.

- **L'en-tête du Programme** suit la structure donnée par Mathieu le
  23 septembre : pastille du bloc et nature de la semaine, la semaine entre
  ses deux flèches avec ses dates, la progression du bloc, ce que le bloc
  cherche, puis trois chiffres (sortie longue, courses, kilomètres).
- Tous les graphiques de Suivi partagent le même pointillé (`POINTILLE`) et
  la même couleur de trait de repère (`TRAIT_REPERE`).
- Suivi porte quatre chiffres, le quatrième étant le **seuil cumulé de la
  semaine** contre la cible de 20 à 30 min (contrainte 9). L'effort perçu se
  lit **séance par séance sur 30 jours** : une moyenne hebdomadaire sur trois
  mois lissait ce qu'on vient y chercher.
- `--good` est le m3 de la famille verte des bandes (#1f8a3b) : le vert
  profond appartient au coach.

### Les dossards

`src/lib/dossards.ts` (+ 11 tests), `SectionDossards`, table
`supabase/dossards.sql` **à exécuter une fois**. Tant qu'elle manque, l'écran
le dit et n'enregistre rien, sans allumer la bannière de synchronisation.

- Les quatre dossards du plan y sont d'office et ne se suppriment pas. Leur
  ligne ne porte que l'objectif ; le chrono d'une course qui recale la forme
  (10 à 39 km) reste la durée réelle de l'écart, saisie par le même chemin que
  la feuille de séance. Une valeur, une source.
- **Un dossard ajouté ne touche ni au programme ni à l'indice.** Son chrono ne
  recale rien.
- Une suppression est un drapeau `supprime`, jamais un DELETE : toutes les
  écritures restent des upserts rejouables.
- **Objectifs par défaut** (`objectifParDefaut`), tant qu'aucun n'est saisi :
  10 km 40:12 (le record), semi test 1 h 30, marathon l'allure visée du
  profil. Le 20 km de Paris n'en a pas, aucun chrono n'a été fixé.
- La page d'un dossard porte toujours l'objectif ET le chrono réel ; avant
  la course, le chrono attend « le jour J ». Le bouton d'ajout est à côté
  du titre.
- Une carte de dossard à venir est bleu clair et non grise, avec sa pastille
  de compte à rebours en blanc : un dossard est un rendez-vous, pas une ligne
  de liste. Sur sa page, l'allure visée a son propre bloc.
- **Chronos équivalents** dans Objectif : 5 km, 10 km, semi et marathon, en
  deux colonnes, la forme du jour et l'objectif. Même équivalence que le
  recalage sur un chrono de course, prise à l'envers (`chronoEquivalent`).
- Objectif ne liste que les dossards à venir ; **les passés vivent dans
  Profil → Dossards passés**. Une carte ouvre la page du dossard (par un
  portail, pour s'ouvrir aussi depuis une sous-page), où se saisissent
  l'objectif et le chrono réel.
- Le mot du coach d'un dossard (`motDuDossard`) compare l'objectif à
  `chronoEquivalent`, l'inverse exact de `projeterMarathon` sur la forme
  projetée, puis, la course passée, le chrono à l'objectif et à la forme.

## Pistes connues

- Le bundle passe 600 Ko, essentiellement `plan.json` embarqué. Sans
  conséquence tant que la PWA précharge tout, à revoir si le plan grossit.
