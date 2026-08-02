# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

Proposition SMS/OTP validée sur le fond (schéma, routes, OTP haché bcrypt).
Environnement investigué : `docker-compose` local (Postgres 16, vide) est
disponible et utilisable pour tester la migration sans toucher à Neon
(fournisseur de production) — recommandé comme option de test. **Rien
exécuté**, en attente du choix d'Ange entre les options de test proposées.

## Décisions actées (ne pas rouvrir sans le dire explicitement)

- App mobile **autonome**, pas un wrapper du site web.
- **Aucun paiement in-app** : l'app valide une preuve (capture d'écran) d'un paiement
  Mobile Money (MTN, Moov, Celtiis) fait hors app. Voir `specs/2-mobile-app/cahier-des-charges.md`.
- Durées d'abonnement : 1, 2, 3, 6, 12 mois.
- Notifications (modération des paiements) : SMS **et** push, en parallèle.
- 4 rôles / 4 dashboards distincts : **Client, Coach, Modérateur, Admin**.
- Priorité de publication : **Google Play d'abord**. Apple App Store = phase 2.
- Stack : React Native + Expo, backend = extension de l'API Nitro/Prisma existante.
- **Monorepo** : le projet React Native vit dans `mobile/` à la racine du dépôt.
- Identité visuelle validée : couleur de marque `#EAB308`, thème sombre,
  Manrope (titres) + Inter (texte).
- **Authentification mobile** : réutilise `/api/auth/register`,
  `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me`.
- **Stockage des tokens** : `expo-secure-store`.
- **URL de base de l'API** : `https://souplessefitness.com/api`, via
  `EXPO_PUBLIC_API_URL`.
- **Champs du formulaire d'inscription** : Prénom, Nom, Email, Téléphone,
  Genre (Homme/Femme, obligatoire), Mot de passe, Confirmer — identiques sur
  web et mobile.
- **Vérification de compte** : email inchangé pour le web ; ajout d'une
  vérification SMS bloquante pour les comptes mobile uniquement (champ
  `registeredVia: WEB | MOBILE` sur `User` pour distinguer les deux au login).
- **Schéma proposé (validé sur le fond, pas encore exécuté)** : enum
  `RegisteredVia { WEB MOBILE }` + 6 champs sur `User` (`registeredVia`,
  `phoneVerified`, `phoneVerificationCodeHash`,
  `phoneVerificationCodeCreatedAt`, `phoneVerificationAttempts`,
  `phoneVerificationLockedUntil`). Détail complet dans la section
  "Proposition — mécanisme SMS/OTP" plus bas dans ce fichier.
- **Code OTP stocké haché (bcrypt)**, pas en clair — décidé le 2026-08-02,
  cohérent avec le traitement des mots de passe dans le même code.
- **Routes proposées** : `POST /api/auth/phone/send-code`,
  `POST /api/auth/phone/verify-code`.
- **Passerelle SMS recommandée** : Africa's Talking (meilleure couverture
  MTN/Moov Bénin que Vonage ; réutilisable pour les notifications de
  modération de paiement, cahier des charges §5.1). Le compte Africa's
  Talking n'est pas encore créé — la fonction d'envoi peut être stubée
  ("à brancher plus tard") en attendant.
- **Aucune base de développement/test séparée de la production actuellement**
  (confirmé par Ange le 2026-08-02) — voir garde-fou et checklist ci-dessous
  avant toute exécution de migration.

## Fichiers de référence

- `specs/2-mobile-app/cahier-des-charges.md` — cahier des charges complet (v2)
- `specs/2-mobile-app/prototypes/` — prototypes HTML cliquables
- `CLAUDE.md` (racine) — instructions permanentes pour Claude Code

## Dernière session

- **Date/surface** : Claude Code (VS Code) — 2026-08-02 (sécurisation
  environnement avant migration, étapes 1-4, lecture seule)
- **Fait** :
  1. `docker-compose.yml` vérifié : service Postgres 16 local (`db`),
     identifiants de dev déjà en clair dans le fichier versionné (non
     sensibles), port `5432`, volume persistant. Utilisable tel quel pour
     tester la migration sans toucher à la production.
  2. Fournisseur identifié à partir du nom d'hôte uniquement (jamais la
     valeur complète de `DATABASE_URL`/`DIRECT_DATABASE_URL` affichée ou
     commitée) : **Neon** (`neon.tech`, AWS `us-east-1`), configuration
     pooled + direct conforme aux recommandations Prisma/Neon déjà en place
     dans `schema.prisma`.
  3. Procédure de branche Neon documentée (dashboard + CLI `neonctl`),
     aucune branche créée.
  4. Plan de test proposé : **docker-compose local recommandé** (migration
     purement additive, risque faible, zéro dépendance externe), branche
     Neon en option secondaire, `pg_dump` + migration directe en dernier
     recours seulement.
  - Rien démarré, rien migré, aucune branche créée, aucune valeur secrète
    affichée ou commitée.
- **Pas encore fait** : le choix entre (a)/(b)/(c) n'est pas encore validé
  par Ange. Aucune migration, aucune route SMS créée. Le diff
  `89df398..6166173` de la phase authentification reste également en
  attente de vérification par Ange (depuis plusieurs sessions).

## Garde-fou supplémentaire — pas de DB de test séparée

- **Ne jamais exécuter `prisma migrate dev` ou `prisma migrate deploy` contre
  la base de production tant que cette checklist n'est pas terminée et
  validée par Ange.**
- Ne pas supposer quel fournisseur de base de données est utilisé — le
  vérifier dans le `.env` local (sans jamais afficher la valeur complète de
  `DATABASE_URL` en clair dans une réponse ou un commit — donner uniquement
  le nom d'hôte/fournisseur, ex. "neon.tech", pas les identifiants).

## Prochaine étape — Sécuriser l'environnement avant migration (lecture seule)

- [x] **1.** Vérifier si `docker-compose.yml` (racine du dépôt) définit un
      service Postgres utilisable comme base de développement locale.
      Documenter dans ce fichier : ce que le service contient, comment le
      démarrer (`docker-compose up` ou équivalent), et si le schéma Prisma
      actuel peut s'y appliquer sans toucher à la production (ex. en
      pointant temporairement `DATABASE_URL` dessus). Ne pas le démarrer ni
      l'utiliser à cette étape — seulement lire et documenter.
- [x] **2.** Identifier (sans l'afficher en clair) le fournisseur de base de
      données actuellement utilisé par le `.env` local/production : regarder
      uniquement le nom d'hôte dans `DATABASE_URL` (ex. contient-il
      "neon.tech" ?). Documenter juste le nom du fournisseur trouvé.
- [x] **3.** Si le fournisseur est Neon (ou un autre supportant des branches
      de base de données à moindre coût) : documenter la procédure exacte
      (lien vers leur documentation officielle si connue, ou indiquer
      "à vérifier dans leur dashboard") pour créer une branche isolée de la
      base de production, sans en créer une soi-même à cette étape.
- [x] **4.** Proposer, dans une nouvelle sous-section "Plan de test avant
      migration", l'option la plus sûre et la plus simple parmi : (a) tester
      contre `docker-compose` local si viable, (b) tester contre une branche
      Neon si disponible, (c) à défaut, une sauvegarde complète
      (`pg_dump`) de la production avant d'exécuter la migration directement
      dessus — avec la commande exacte de sauvegarde adaptée au fournisseur
      identifié.
- [ ] **5. ARRÊT.** Ne rien exécuter (pas de `docker-compose up`, pas de
      migration, pas de branche créée). Committer uniquement la
      documentation, et attendre la validation d'Ange sur l'option de test
      à retenir avant de passer à l'exécution réelle.
      **→ Fait. Voir "Investigation environnement" et "Plan de test avant
      migration" ci-dessous — rien démarré, rien migré, aucune branche
      créée, `DATABASE_URL` jamais affiché en clair.**

## Investigation environnement (lecture seule — rien exécuté)

### 1. `docker-compose.yml` (racine du dépôt)

Contenu exact (fichier déjà dans le dépôt, non modifié) :

- Service unique `db` : image `postgres:16-alpine`.
- Identifiants **de développement local uniquement**, déjà en clair dans le
  fichier versionné (pas un secret de production) :
  `POSTGRES_USER=souplesse`, `POSTGRES_PASSWORD=souplesse_dev`,
  `POSTGRES_DB=souplesse_db`.
- Port exposé : `5432:5432` (port Postgres standard, sur `localhost`).
- Volume nommé `postgres_data` pour la persistance entre redémarrages.
- `healthcheck` via `pg_isready`.

**Démarrage** (documenté, non exécuté dans cette session) :
```
docker-compose up -d db
```

**Utilisable pour tester la migration sans toucher à la production ?**
Oui — c'est une instance Postgres 16 totalement séparée, en local, vide au
premier démarrage. Il suffirait de pointer temporairement `DATABASE_URL`
(dans un `.env` **local, non commité**) vers :
`postgresql://souplesse:souplesse_dev@localhost:5432/souplesse_db`
puis lancer `npx prisma migrate dev` contre cette base — zéro risque pour la
production, car aucune connexion réseau vers Neon n'intervient dans ce
chemin. Limite : la base est vide (pas de données de production), donc ce
test valide la **mécanique de la migration** (le schéma s'applique proprement,
les nouveaux champs/enum sont corrects) mais pas le comportement sur un
volume de données réel.

### 2. Fournisseur de base de données (`.env` — hôte uniquement, jamais la valeur complète)

- `DATABASE_URL` et `DIRECT_DATABASE_URL` pointent tous deux vers un hôte se
  terminant par **`neon.tech`**, région AWS `us-east-1` → **fournisseur :
  Neon**. Ceci confirme l'indice trouvé précédemment dans l'historique Git
  ("Neon pooler compatibility").
- Les deux variables sont définies séparément et diffèrent uniquement par le
  suffixe `-pooler` sur `DATABASE_URL` (absent sur `DIRECT_DATABASE_URL`) —
  conforme à la configuration Neon recommandée pour Prisma
  (`datasource db { url = DATABASE_URL, directUrl = DIRECT_DATABASE_URL }`
  dans `schema.prisma`, déjà en place). En pratique, `prisma migrate` utilise
  automatiquement `DIRECT_DATABASE_URL` (connexion non poolée, requise pour
  les migrations DDL).
- Aucune valeur de `DATABASE_URL`/`DIRECT_DATABASE_URL` n'est reproduite ici
  ni ailleurs dans ce commit — seul le fournisseur (Neon) et la région sont
  documentés, conformément à la consigne.

### 3. Procédure de branche Neon (documentée, aucune branche créée)

Neon propose un système de "branches" de base de données (copie-sur-écriture,
quasi instantanée, isolée de la branche parente) — c'est la fonctionnalité
adaptée à ce besoin. Procédure généralement disponible chez Neon (à
**vérifier dans leur dashboard actuel**, l'interface évoluant régulièrement — je
n'ai pas de moyen de confirmer l'état exact de leur UI/CLI depuis ce dépôt) :

- **Dashboard** : console Neon → projet du dépôt → onglet "Branches" →
  "Create branch" → choisir la branche parente (`main`/production) →
  nommer la branche (ex. `pre-otp-migration-test`) → Neon fournit une
  nouvelle chaîne de connexion (pooled + direct) pour cette branche isolée,
  distincte de celle de production.
- **CLI** (`neonctl`, si installé — pas vérifié comme dépendance de ce
  projet) : `neonctl branches create --project-id <project-id> --name pre-otp-migration-test`.
  Le `project-id` exact n'est pas documenté ici (non déductible sans risquer
  d'exposer des éléments de connexion) — à récupérer dans le dashboard Neon.
- Une fois la branche créée, sa chaîne de connexion serait utilisée
  **temporairement** (dans un `.env` local non commité) pour exécuter
  `prisma migrate dev` dessus — la branche de production reste intacte tant
  qu'elle n'est pas explicitement fusionnée/promue.
- **Non fait dans cette session** : aucune branche Neon n'a été créée,
  aucun accès à leur dashboard/API n'a été effectué.

## Plan de test avant migration

**Recommandation : option (a), `docker-compose` local, comme validation
mécanique avant toute exécution — suffisant ici.**

Justification : la migration proposée (voir "Proposition — mécanisme
SMS/OTP") est **purement additive** — un nouvel enum + des colonnes
nouvelles avec valeurs par défaut (`registeredVia @default(WEB)`,
`phoneVerified @default(false)`, `phoneVerificationAttempts @default(0)`)
ou nullables (`phoneVerificationCodeHash`, `*CreatedAt`,
`*LockedUntil`) — aucune transformation ni backfill de données existantes,
aucune colonne supprimée/renommée. Le risque principal d'une telle migration
est une erreur de syntaxe/nommage dans le schéma, pas un risque de perte de
données — un test local sur `docker-compose` (option a) suffit à l'écarter
avant de lancer `prisma migrate deploy` contre Neon.

Ordre de préférence proposé :
1. **(a) `docker-compose` local** — le plus simple, zéro coût, zéro
   dépendance externe, déjà présent dans le dépôt. Valide que la migration
   s'applique proprement.
2. **(b) Branche Neon** — optionnelle, seulement si Ange souhaite en plus
   valider sur un volume de données proche de la production avant de
   toucher au vrai environnement (nécessite un accès au dashboard Neon, non
   fait ici).
3. **(c) `pg_dump` puis migration directe sur production** — **dernier
   recours seulement**, si (a) et (b) sont écartées. Réduit le risque de
   perte de données mais pas le risque d'interruption de service pendant la
   migration. Commande adaptée à Neon (référence à la variable
   d'environnement, jamais la valeur en clair) :
   ```
   pg_dump "$DIRECT_DATABASE_URL" --format=custom --file=backup-$(date +%Y%m%d-%H%M).dump
   ```
   (nécessite `pg_dump` installé localement, version compatible Postgres 16 ;
   `DIRECT_DATABASE_URL` doit être exporté dans le shell, jamais collé en
   clair dans une commande ou un fichier commité).

**Rien de ce qui précède n'a été exécuté** : pas de `docker-compose up`, pas
de branche Neon créée, pas de `pg_dump` lancé, pas de migration. En attente
du choix d'Ange entre (a)/(b)/(c) (ou une combinaison) avant toute
exécution réelle.

## Historique (ajouter une entrée par session, la plus récente en haut)

- 2026-08-02 — Claude Code (VS Code) — Environnement investigué (lecture
  seule) : `docker-compose` local disponible et recommandé pour tester la
  migration, fournisseur de prod identifié (Neon, hôte uniquement), procédure
  de branche Neon documentée. Rien exécuté. En attente du choix d'Ange.
- 2026-08-02 — chat — Pas de DB de dev séparée confirmé par Ange. Nouvelle
  checklist de sécurisation de l'environnement (lecture seule) rédigée avant
  toute migration.
- 2026-08-02 — chat — Décision : code OTP stocké haché (bcrypt).
- 2026-08-02 — Claude Code (VS Code) — Proposition SMS/OTP écrite (schéma,
  routes, passerelle recommandée Africa's Talking). Commit `fdfa257`. Rien
  exécuté.
- 2026-08-02 — chat — Décision finale confirmée : email/téléphone identiques
  web et mobile ; SMS ajouté en vérification bloquante mobile uniquement.
- 2026-08-02 — Claude Code (VS Code) — Investigation confirmée : aucun
  mécanisme SMS existant côté serveur. Commit `aec87d7`.
- 2026-08-02 — chat — Erreur identifiée : hypothèse email à corriger.
- 2026-08-02 — Claude Code (VS Code) — Phase Authentification, étapes 5-9
  terminées. Commit `6166173`.
- 2026-08-02 — chat — Q1 tranchée (champs `RegisterScreen`).
- 2026-08-02 — Claude Code (VS Code) — Phase Authentification, étapes 1-4.
- 2026-08-02 — Claude Code (VS Code) — Scaffold Expo initialisé ; commit
  `94dd2a2`. Dépôt nettoyé séparément.
- 2026-08-01 — chat + Claude Code — Docs et prototypes poussés sur
  `feat/mobile-app`.
- 2026-08-01 — chat — Maquettes validées (paiement, auth, 4 dashboards).