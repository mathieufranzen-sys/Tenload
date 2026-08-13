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
vérifiées par `reference/check_plan.py` sur les 315 séances du plan. **Aucune
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
- **Bloc B** (S9-16) base aérobie, 24 → 32 km, volume vers 50 km/semaine.
- **Bloc C** (S17-25) développement, pic à 32 km, **semi-marathon test le
  samedi 30 janvier 2027**.
- **Bloc D** (S26-32) spécifique marathon, allure course en volume.
- **Bloc E** (S33-35) affûtage. Dernière longue de 28 km trois semaines avant.

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

## Les zones cardiaques — piège corrigé

Strava calcule les zones de Mathieu sur une FC max implicite d'environ **193**.
C'est faux : il plafonne à **179-180** sur un 3 km maximal, avec un plateau de
FC moyenne à 174 pendant huit minutes. **On retient 181.**

Conséquences à garder en tête :

- Sur son test de 3 km, il était à 96-98 % de son maximum : l'effort était bien
  maximal, et le 12:02 est une valeur exploitable. Les allures ne sont pas
  conservatrices, elles sont justes.
- Sur sa sortie de 25 km à 140 de moyenne, il est au **haut de Z2**, pas au
  milieu : il court son endurance un peu trop vite.

Zones retenues (`HR_ZONES` dans `src/lib/paces.ts`) : Z1 < 123, Z2 123-150,
Z3 150-161, Z4 161-170, Z5 > 170.

## L'indice de charge du tendon

Le cœur du produit. `src/lib/tendonIndex.ts`, verrouillé par 20 tests dans
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
| Gestes protecteurs | −15 | Excentrique la veille −6, vraie journée de repos −5, glaçage −2, sauts −2. |

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

- **Planchers garantis** : douleur déclarée ≥ 4 impose l'orange, ≥ 6 le rouge,
  ≥ 8 le noir, quoi que dise le reste du calcul. Ce sont les seuils que Mathieu a
  posés, ils ne se contournent pas.
- **Mémoire d'épisode** : après un pic au-dessus de 60, un plancher décroissant
  (facteur 0,74 par jour) tient cinq jours. Un tendon réactif reste fragile même
  quand la douleur est retombée.
- **Confiance** : en dessous de dix jours de charge connue sur 28, la
  contribution mécanique est plafonnée. Sans ça, un historique court fait
  exploser le rapport aigu/chronique pour rien.

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
  lib/          tendonIndex.ts (+ tests), paces.ts, load.ts, dates.ts, supabase.ts
  components/   TendonGauge, SessionCard, charts/…
  screens/      Today, Program, Track, Paces, Coach
  styles/       tokens.css (design system), global.css
supabase/       schema.sql (RLS testé), seed.sql (généré)
netlify/functions/  strava-callback.ts, strava-sync.ts
reference/      tendo-v3.html (la version à porter), scripts Python d'origine
```

- **Vite + React + TypeScript strict.** Styles en variables CSS, pas de Tailwind :
  le design system existe déjà et Mathieu le lit directement.
- **Supabase** pour l'auth (magic link) et les données. RLS sur toutes les
  tables, filtré sur `auth.uid()`. La table `strava_tokens` n'a **aucune
  politique** : elle est inaccessible depuis le navigateur, seules les fonctions
  Netlify y touchent avec la clé de service.
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

Fait :

- [x] Socle Vite + React + TS + PWA, build qui passe
- [x] `tendonIndex.ts` porté et couvert par 20 tests
- [x] `paces.ts`, `load.ts`, `dates.ts`
- [x] Schéma Supabase avec RLS, testé sur PostgreSQL 16 (idempotent)
- [x] Seed généré depuis le carnet et Strava, rejouable
- [x] Fonctions Netlify Strava écrites (inactives jusqu'à l'étape 5)
- [x] Design tokens, `TendonGauge`, `SessionCard`
- [x] Icônes PWA

À faire, dans cet ordre :

1. **Brancher Supabase** : `useAuth` (magic link), `useProfile`, `useLogs`,
   `useActivities`. Écriture optimiste avec file d'attente hors ligne.
2. **Porter les cinq écrans** depuis `reference/tendo-v3.html`, qui est la
   référence fonctionnelle et visuelle : Aujourd'hui, Programme, Suivi (avec les
   quatre graphiques), Allures, Coach. Un composant par écran, pas de fichier de
   mille lignes.
3. **Les graphiques** : indice avec bandes de fond et projection en pointillés,
   douleur trois séries, volume hebdomadaire, charge empilée course/autres.
   Palette validée dans `tokens.css`, trois séries maximum par graphique.
4. **Le détail de séance** en feuille modale, avec les deux curseurs de ressenti.
5. **Strava OAuth** : bouton de connexion, retour, synchro, puis webhook si
   Mathieu le souhaite.
6. **Retours design de Mathieu** — la vraie raison de ce dépôt.

## Pistes connues

- Quand aucune douleur n'est saisie depuis plus de quatre jours, la composante
  douleur retombe à zéro et l'indice peut paraître trop optimiste. Le drapeau
  `stale` existe et est affiché ; envisager un plancher de prudence.
- Le graphique de charge empile la course au-dessus des autres disciplines. La
  série principale gagnerait à être en bas.
- La version HTML de référence garde ses saisies en mémoire uniquement : c'est
  précisément ce que Supabase vient corriger.
