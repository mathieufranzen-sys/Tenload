# Tendo

Plan marathon adaptatif piloté par un indice de charge du tendon d'Achille.
Objectif : Marathon de Paris, dimanche 11 avril 2027, en 3 h 15.

---

## Étape 0 — Installer Node (à faire une seule fois)

Node fournit `npm`, qui fait tourner le projet. Sur un Mac, il n'est pas là par
défaut. Vérifie d'abord :

```bash
node -v
```

Si tu obtiens un numéro comme `v22.x.x`, passe à l'étape 1. Si tu obtiens
`command not found`, deux voies :

**Si tu as Homebrew** (teste avec `brew -v`) :

```bash
brew install node
```

**Sinon, sans terminal** : va sur [nodejs.org](https://nodejs.org), télécharge
la version **LTS** pour macOS, ouvre le `.pkg` et clique jusqu'au bout. Ferme
puis rouvre ton terminal, et `node -v` doit répondre.

Node est de toute façon un prérequis de Claude Code, donc c'est du temps investi
une seule fois.

---

## Ce que tu as entre les mains

Le socle tourne déjà. Le plan des 35 semaines, le modèle d'indice avec ses tests,
le schéma de base de données, les fonctions Strava et le design system sont
écrits. Ce qui reste, c'est porter les cinq écrans et itérer sur le design — et
c'est là que Claude Code prend le relais.

```
npm install
npm run dev        # http://localhost:5173
npm test           # 20 tests sur le modèle d'indice
npm run build      # typage puis build de production
```

L'app démarre sans Supabase : elle tourne alors sur les instantanés embarqués
(83 activités Strava, 16 jours de carnet) et ne conserve pas les saisies. C'est
normal, c'est l'étape 2 qui règle ça.

---

## Étape 1 — Mettre le projet au bon endroit et le versionner

L'archive est arrivée dans `~/Downloads/Runna/`. Décompresse-la et range le
projet où tu veux :

```bash
cd ~/Downloads/Runna && unzip -q tendo.zip
mkdir -p ~/Projets && mv tendo ~/Projets/ && cd ~/Projets/tendo
git init && git add -A && git commit -m "Socle Tendo : plan, indice, schéma, PWA"
```

Puis crée un dépôt vide sur GitHub et pousse :

```bash
gh repo create tendo --private --source=. --push
```

Si tu n'as pas `gh`, crée le dépôt sur github.com et suis les deux lignes
`git remote add` / `git push` qu'il t'affiche.

**Pourquoi maintenant** : Netlify déploie depuis GitHub, et chaque retour design
devient un commit que tu peux annuler.

---

## Étape 2 — Créer la base Supabase

1. Va sur [supabase.com](https://supabase.com), crée un compte, puis un projet.
   Région : **Europe (Frankfurt ou Paris)**. Note le mot de passe de base de
   données, tu n'en auras pas besoin tout de suite mais ne le perds pas.
2. Le projet met deux minutes à démarrer.
3. Ouvre **SQL Editor**, clique **New query**, colle **tout** le contenu de
   `supabase/schema.sql`, et lance avec **Run**.

   Tu dois voir passer des `CREATE TABLE`, `CREATE POLICY`, `CREATE TRIGGER`, et
   des `NOTICE ... does not exist, skipping` qui sont normaux : le script est
   écrit pour être rejouable sans erreur.

4. Va dans **Project Settings → API** et récupère deux valeurs :
   - **Project URL**
   - la clé **anon / public**

5. Crée le fichier `.env` à la racine du projet, à partir du modèle :

   ```bash
   cp .env.example .env
   ```

   puis remplis les deux premières lignes avec les valeurs de l'étape 4.

6. Relance `npm run dev`. Le bandeau « Supabase n'est pas encore branché » doit
   disparaître.

**Ce que fait ce schéma** : six tables, avec Row Level Security sur toutes. Tes
données de douleur ne sont lisibles que par ton compte, même si la clé publique
de l'app circule — elle est faite pour être publique, c'est le RLS qui protège.
La table des jetons Strava n'a volontairement aucune politique : elle est
inaccessible depuis le navigateur.

---

## Étape 3 — Activer la connexion par lien e-mail

1. Dans Supabase, **Authentication → Providers**. Laisse **Email** activé et
   **désactive « Confirm email »** si tu veux que le premier lien te connecte
   directement.
2. **Authentication → URL Configuration** : mets `http://localhost:5173` dans
   **Site URL** pour l'instant. Tu ajouteras l'adresse Netlify à l'étape 4.
3. Connecte-toi une première fois depuis l'app. Un profil est créé
   automatiquement par un déclencheur SQL.
4. Reviens dans **SQL Editor** et lance le contenu de `supabase/seed.sql`. Il
   importe ton carnet et ton historique Strava dans le premier compte créé,
   donc le tien. Aucun identifiant à recopier.

   Tu dois lire `NOTICE: Import terminé : 16 jours de carnet, 83 activités.`

---

## Étape 4 — Déployer sur Netlify

1. [netlify.com](https://netlify.com) → **Add new site → Import an existing
   project** → GitHub → choisis le dépôt.
2. Netlify lit `netlify.toml`, donc la commande de build et le dossier de
   publication sont déjà bons. Ne touche à rien.
3. Avant le premier déploiement, ouvre **Site configuration → Environment
   variables** et ajoute :

   | Nom | Valeur |
   |---|---|
   | `VITE_SUPABASE_URL` | ton Project URL |
   | `VITE_SUPABASE_ANON_KEY` | ta clé anon |

4. Déploie. Tu obtiens une adresse en `xxx.netlify.app`.
5. Retourne dans Supabase → **Authentication → URL Configuration** et ajoute
   cette adresse dans **Site URL** et dans **Redirect URLs**, sinon le lien de
   connexion te renverra sur localhost.

**Installer la PWA** : ouvre l'adresse sur ton iPhone dans Safari, bouton
Partager, « Sur l'écran d'accueil ». L'app s'ouvre alors en plein écran, sans
barre d'adresse, et fonctionne hors ligne.

---

## Étape 5 — Brancher Strava (optionnel, plus tard)

À faire seulement quand la PWA et le design te satisfont.

1. Va sur [strava.com/settings/api](https://www.strava.com/settings/api) et crée
   une application :
   - **Application Name** : Tendo
   - **Category** : Training
   - **Website** : ton adresse Netlify
   - **Authorization Callback Domain** : ton domaine Netlify **sans** `https://`,
     par exemple `tendo-mathieu.netlify.app`
2. Note le **Client ID** et le **Client Secret**.
3. Dans Netlify → Environment variables, ajoute :

   | Nom | Valeur | Remarque |
   |---|---|---|
   | `STRAVA_CLIENT_ID` | ton Client ID | serveur |
   | `STRAVA_CLIENT_SECRET` | ton Client Secret | **serveur uniquement** |
   | `VITE_STRAVA_CLIENT_ID` | le même Client ID | exposé, sans risque |
   | `SUPABASE_URL` | ton Project URL | serveur |
   | `SUPABASE_SERVICE_ROLE_KEY` | clé **service_role** de Supabase | **serveur uniquement** |

   Le préfixe `VITE_` rend une variable visible dans le navigateur. Le secret
   Strava et la clé de service ne doivent **jamais** l'avoir.

4. Redéploie, puis clique sur « Se connecter avec Strava » dans l'app.

Les deux fonctions sont déjà écrites : `netlify/functions/strava-callback.ts`
échange le code contre des jetons, `strava-sync.ts` rapatrie les activités et
rafraîchit le jeton quand il expire.

---

## Étape 6 — Itérer sur le design

C'est la raison d'être de ce dépôt. Le workflow :

```bash
npm run dev          # dans un terminal, laissé ouvert
claude               # dans un autre, à la racine du projet
```

Tu décris ce que tu veux changer, Claude Code modifie le composant concerné, tu
vois le résultat immédiatement dans le navigateur. Quand ça te plaît :

```bash
git add -A && git commit -m "Carte de séance : hiérarchie retravaillée"
git push
```

Netlify redéploie tout seul en une minute.

Les tokens du design system sont dans `src/styles/tokens.css`. Les dégradés par
type de séance viennent de Runna et portent l'identité visuelle : violet pour la
sortie longue, jaune-vert pour l'endurance, rouge-orange pour les intervalles,
bleu pour le renforcement.

---

## Où trouver quoi

| Fichier | Contenu |
|---|---|
| `CLAUDE.md` | Le contexte complet : contraintes, décisions, calibration. Claude Code le lit tout seul. |
| `src/lib/tendonIndex.ts` | Le modèle d'indice. Le cœur du produit. |
| `src/lib/tendonIndex.test.ts` | 20 tests qui verrouillent les seuils. |
| `src/data/plan.json` | Les 35 semaines, 315 séances. |
| `src/styles/tokens.css` | Le design system. |
| `supabase/schema.sql` | Les tables et la sécurité. |
| `reference/tendo-v3.html` | La version d'origine, référence fonctionnelle et visuelle du portage. |
| `reference/build_plan.py` | Le générateur du plan et `check_plan.py` qui vérifie les six contraintes. |

---

## En cas de pépin

**Le lien de connexion me renvoie sur localhost.** Les Redirect URLs de Supabase
ne contiennent pas ton adresse Netlify. Étape 4, point 5.

**L'app affiche encore le bandeau Supabase après avoir rempli `.env`.** Vite ne
relit les variables d'environnement qu'au démarrage : arrête et relance
`npm run dev`.

**Le seed dit « Aucun utilisateur trouvé ».** Connecte-toi une fois à l'app
avant de le lancer : il cible le premier compte créé.

**La PWA ne se met pas à jour sur mon téléphone.** Le service worker est en
`autoUpdate`, mais iOS peut garder l'ancienne version un moment. Ferme
complètement l'app depuis le sélecteur d'apps et rouvre-la.

**Un test casse après une modification du modèle.** Relis la section
« L'indice » du `CLAUDE.md` avant de modifier le test : les seuils viennent de
décisions prises sur des données réelles.

**`zsh: command not found: npm`.** Node n'est pas installé : étape 0.

**`unzip: cannot find or open tendo.zip`.** Tu n'es pas dans le bon dossier.
L'archive est dans `~/Downloads/Runna/`, pas dans `~/Downloads/`.
