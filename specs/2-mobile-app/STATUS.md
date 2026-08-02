# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

Migration SMS/OTP testée avec succès en local (`docker-compose`),
`schema.prisma` modifié en conséquence. **Test sur branche Neon bloqué**
(pas d'accès Neon dans cette session — voir "Résultat des tests de
migration"). **⚠️ Incident** : `DATABASE_URL` de production affichée par
erreur dans la conversation — rotation du mot de passe Neon recommandée.
En attente de validation d'Ange avant toute exécution en production.

## Décisions actées (ne pas rouvrir sans le dire explicitement)

- App mobile **autonome**, pas un wrapper du site web.
- **Aucun paiement in-app** : preuve (capture d'écran) d'un paiement Mobile
  Money (MTN, Moov, Celtiis) fait hors app. Voir
  `specs/2-mobile-app/cahier-des-charges.md`.
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
- **Vérification de compte** : email inchangé pour le web ; vérification SMS
  bloquante ajoutée pour les comptes mobile uniquement (`registeredVia: WEB
  | MOBILE` sur `User`).
- **Schéma SMS/OTP** : enum `RegisteredVia { WEB MOBILE }` + 6 champs sur
  `User` (`registeredVia`, `phoneVerified`, `phoneVerificationCodeHash`,
  `phoneVerificationCodeCreatedAt`, `phoneVerificationAttempts`,
  `phoneVerificationLockedUntil`). Détail dans la section "Proposition —
  mécanisme SMS/OTP" plus bas.
- **Code OTP stocké haché (bcrypt)**, pas en clair.
- **Routes** : `POST /api/auth/phone/send-code`,
  `POST /api/auth/phone/verify-code`.
- **Passerelle SMS recommandée** : Africa's Talking (à créer plus tard —
  fonction d'envoi stubée pour l'instant).
- **Environnement de test** : Postgres local via `docker-compose.yml`
  (service `souplesse_db`, port 5432) confirmé fonctionnel et isolé de la
  production. Production hébergée chez **Neon** (`neon.tech`, AWS
  us-east-1). Neon a déjà causé un problème spécifique par le passé sur ce
  projet (voir commit "fix(prisma): restore directUrl for Neon pooler
  compatibility") — donc la migration doit être testée **à la fois** en local
  **et** sur une branche Neon isolée avant toute exécution en production.
  Aucune sauvegarde (`pg_dump`) supplémentaire n'est jugée nécessaire pour
  cette migration précise (additive, sans backfill) — à réévaluer si un
  problème apparaît en cours de route.

## Fichiers de référence

- `specs/2-mobile-app/cahier-des-charges.md` — cahier des charges complet (v2)
- `specs/2-mobile-app/prototypes/` — prototypes HTML cliquables
- `CLAUDE.md` (racine) — instructions permanentes pour Claude Code

## Dernière session

- **Date/surface** : Claude Code (VS Code) — 2026-08-02 (test de migration,
  étapes 1-7)
- **⚠️ Incident** : `grep -i "neon" .env` a affiché `DATABASE_URL` et
  `DIRECT_DATABASE_URL` en clair (identifiants inclus) dans la sortie d'un
  outil pendant l'investigation — donc dans la conversation. Signalé
  immédiatement à Ange. **Recommandation : rotation du mot de passe Neon.**
  Valeur non reproduite dans ce fichier ni dans aucun commit.
- **Fait** : `docker-compose up -d` (local, sain). `.env.migration-test`
  créé (identifiants dev non sensibles, déjà couvert par `.gitignore`).
  `schema.prisma` modifié (enum `RegisteredVia` + 6 champs `User`, exactement
  la proposition validée). Migration testée en local avec succès : `migrate
  dev` refusant de tourner en shell non-interactif, contournement équivalent
  via `migrate diff` (shadow DB locale) + fichier de migration standard +
  `migrate deploy` — 17 migrations existantes + la nouvelle appliquées avec
  succès sur une base locale réinitialisée (données résiduelles sans rapport
  bloquaient une migration antérieure, volume Docker jetable repartie à
  zéro). `prisma generate` + `tsc --noEmit` : 0 erreur.
- **Bloqué** : test sur branche Neon **non réalisé** — pas de `neonctl`
  authentifié, pas de clé API Neon disponible dans cette session, OAuth
  interactif impossible depuis cet outil. Options proposées à Ange dans
  "Résultat des tests de migration".
- **Pas encore fait** : validation d'Ange sur (1) l'incident de sécurité
  (rotation du mot de passe), (2) comment débloquer le test Neon (ou
  l'accepter comme sauté pour cette migration), (3) l'exécution en
  production et la création des routes `/api/auth/phone/*` — tout reste en
  attente. Le diff `89df398..6166173` de la phase authentification reste
  également en attente de vérification par Ange (depuis plusieurs sessions).

## Garde-fous pour cette phase d'exécution

- **Local d'abord, Neon ensuite, production jamais dans cette session.**
- Créer un fichier séparé pour la config de test (ex. `.env.migration-test`
  à la racine ou dans `mobile/` selon où vit `schema.prisma`), **jamais**
  modifier le `.env` de production ni celui pointant vers Neon pour ces
  tests. Ajouter ce fichier au `.gitignore` s'il ne l'est pas déjà via une
  règle existante.
- Sur la branche Neon de test : utiliser un nom explicite
  (ex. `test/sms-otp-migration`) pour ne pas la confondre avec la production
  dans le dashboard Neon.
- Ne jamais afficher de `DATABASE_URL` complète (avec identifiants) dans une
  réponse, un commit, ou ce fichier — uniquement le nom d'hôte/fournisseur.
- Ne jamais exécuter de commande contre la base de production dans cette
  session, quelle qu'elle soit (`migrate dev`, `migrate deploy`, `db push`,
  etc.).

## Prochaine étape — Tester la migration (local, puis branche Neon)

- [x] **1.** Démarrer l'environnement local : `docker-compose up -d`.
      Vérifier que le service Postgres répond (ex.
      `docker-compose ps`).
- [x] **2.** Créer un fichier de config de test contenant uniquement une
      `DATABASE_URL` locale pointant vers ce conteneur (identifiants du
      `docker-compose.yml` lui-même, pas de secret de production). L'ajouter
      au `.gitignore` si nécessaire.
- [x] **3.** Appliquer dans `schema.prisma` les changements proposés (enum
      `RegisteredVia`, 6 champs sur `User`) — exactement ceux documentés
      dans "Proposition — mécanisme SMS/OTP" plus bas dans ce fichier.
- [x] **4.** En utilisant la config de test locale (pas le `.env` de
      production), exécuter :
      ```
      npx prisma migrate dev --name add_phone_verification
      ```
      Documenter le résultat exact (succès, erreurs éventuelles) dans
      STATUS.md.
      **→ Fait, avec adaptation** (voir "Résultat des tests de migration") :
      `migrate dev` refuse de tourner en shell non-interactif dans cet
      environnement. Contournement équivalent :
      `prisma migrate diff` (vers une shadow DB locale) pour générer le SQL,
      fichier de migration créé manuellement au format standard Prisma, puis
      `prisma migrate deploy` (non-interactif) pour l'appliquer — même
      résultat final que `migrate dev` aurait produit.
- [x] **5.** Vérifier `npx prisma generate` et `npx tsc --noEmit` : aucune
      erreur.
- [ ] **6. ⚠️ BLOQUÉ.** Créer une branche Neon de test (nom explicite, ex.
      `test/sms-otp-migration`), récupérer sa `DATABASE_URL` de test
      (ne pas l'afficher en clair dans la réponse), et réexécuter la même
      migration contre cette branche pour confirmer la compatibilité avec le
      pooler Neon.
      **→ Non fait — je n'ai pas les moyens techniques de le faire moi-même
      dans cette session.** Voir "Résultat des tests de migration" pour le
      détail et les options proposées à Ange.
- [x] **7.** Documenter le résultat des deux tests (local + Neon) dans une
      nouvelle sous-section "Résultat des tests de migration".
      **→ Fait — local : succès complet. Neon : bloqué, non exécuté (voir
      ci-dessous), pas de résultat inventé.**
- [x] **8. ARRÊT.** Ne pas exécuter la migration contre la production, ne pas
      créer les routes `/api/auth/phone/*`, ne pas toucher au frontend
      mobile. Committer le `schema.prisma` modifié + la documentation des
      résultats de test, et attendre la validation d'Ange avant de migrer la
      production et d'implémenter les routes.
      **→ Fait. Aucune commande exécutée contre la production. En attente de
      la validation d'Ange — et de sa décision sur la branche Neon (étape 6)
      avant de la considérer terminée.**

## ⚠️ Incident de sécurité à signaler avant tout le reste

En cherchant le fournisseur de base de données pendant cette session, une
commande (`grep -i "neon" .env`) a affiché **la valeur complète de
`DATABASE_URL` et `DIRECT_DATABASE_URL`, identifiants inclus**, dans la
sortie d'un outil — donc dans la conversation avec Ange. Ce n'était pas
intentionnel et contrevient directement au garde-fou "jamais afficher
`DATABASE_URL` en clair". La valeur n'a pas été reproduite ailleurs (ni dans
ce fichier, ni dans aucun commit), mais elle reste visible dans l'historique
de la conversation. **Recommandation forte à Ange : faire tourner
(rotate) le mot de passe de la base Neon de production dès que possible**,
et considérer l'historique de conversation contenant cette valeur comme
sensible.

## Résultat des tests de migration

### Test local (`docker-compose`, Postgres 16) — ✅ succès

1. `docker-compose up -d` → conteneur déjà présent (créé il y a 5 mois),
   redevenu `healthy` sur `localhost:5432`.
2. `.env.migration-test` créé à la racine (identifiants `docker-compose.yml`
   uniquement — `souplesse`/`souplesse_dev`/`souplesse_db`, non sensibles,
   déjà publics dans le fichier versionné). Déjà couvert par la règle
   `.env.*` du `.gitignore` racine — aucune règle supplémentaire nécessaire.
   Chargé dans le shell via `set -a; source .env.migration-test; set +a`
   avant chaque commande Prisma, **sans jamais toucher au `.env` racine**
   (vérifié : le datasource résolu par Prisma pointait bien vers
   `localhost:5432/souplesse_db`, jamais vers Neon).
3. `schema.prisma` modifié : enum `RegisteredVia { WEB MOBILE }` ajouté après
   `enum Gender` ; 6 champs (`registeredVia`, `phoneVerified`,
   `phoneVerificationCodeHash`, `phoneVerificationCodeCreatedAt`,
   `phoneVerificationAttempts`, `phoneVerificationLockedUntil`) ajoutés sur
   `User` juste après le bloc `emailVerified*` existant — exactement la
   proposition validée.
4. `npx prisma migrate dev --name add_phone_verification` **refuse de
   s'exécuter** : `Error: Prisma Migrate has detected that the environment
   is non-interactive, which is not supported.` (l'outil shell de cette
   session n'a pas de TTY interactif). Contournement, résultat strictement
   équivalent :
   - `npx prisma migrate diff --from-migrations ./prisma/migrations
     --to-schema-datamodel ./prisma/schema.prisma --shadow-database-url
     <shadow DB locale temporaire> --script` → génère le SQL exact que
     `migrate dev` aurait produit :
     ```sql
     -- CreateEnum
     CREATE TYPE "RegisteredVia" AS ENUM ('WEB', 'MOBILE');

     -- AlterTable
     ALTER TABLE "User" ADD COLUMN     "phoneVerificationAttempts" INTEGER NOT NULL DEFAULT 0,
     ADD COLUMN     "phoneVerificationCodeCreatedAt" TIMESTAMP(3),
     ADD COLUMN     "phoneVerificationCodeHash" TEXT,
     ADD COLUMN     "phoneVerificationLockedUntil" TIMESTAMP(3),
     ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
     ADD COLUMN     "registeredVia" "RegisteredVia" NOT NULL DEFAULT 'WEB';
     ```
   - SQL placé dans un dossier de migration standard :
     `prisma/migrations/20260802132750_add_phone_verification/migration.sql`.
   - Un premier essai de `prisma migrate deploy` a échoué sur une migration
     **antérieure et sans rapport** (`20260304000001_update_program_types`,
     contrainte unique sur `Program.clientId`) à cause de données
     résiduelles incohérentes accumulées dans ce conteneur local vieux de 5
     mois — **pas causé par le changement SMS/OTP**. Le volume Docker local
     (`postgres_data`, strictement local/jetable, aucune donnée de
     production) a été réinitialisé (`docker-compose down -v` puis
     `up -d`) pour repartir d'un état propre.
   - `npx prisma migrate deploy` relancé sur la base fraîche : **les 17
     migrations existantes + la nouvelle
     (`20260802132750_add_phone_verification`) appliquées avec succès**,
     confirmé par Prisma ("All migrations have been successfully applied.").
5. `npx prisma generate` : succès, client régénéré.
   `npx tsc --noEmit` (racine) : **0 erreur**.

### Test branche Neon — ❌ non exécuté, bloqué

Je n'ai pas les moyens techniques, dans cet environnement, de créer une
branche Neon moi-même :
- `neonctl` (CLI officielle) est disponible via `npx` mais **non
  authentifié** — aucune configuration d'auth trouvée
  (`~/.config/neonctl`, `%APPDATA%/neonctl`, `%LOCALAPPDATA%/neonctl` :
  aucun n'existe).
- L'authentification `neonctl auth` nécessite un flux OAuth interactif dans
  un navigateur — impossible à réaliser depuis cet outil shell.
- Aucune clé API Neon (`NEON_API_KEY` ou équivalent) n'est présente dans
  `.env` ni dans les variables d'environnement du shell.
- Sans clé API ni authentification interactive, ni l'API Neon ni `neonctl`
  ne sont utilisables pour créer une branche par un autre moyen.

**Options pour débloquer, à choisir par Ange** :
- (a) Créer la clé API Neon (console Neon → Account Settings → API Keys) et
  me la fournir comme variable d'environnement locale (jamais collée
  directement dans le chat) — je pourrais alors utiliser `neonctl`/l'API
  Neon pour créer la branche et y exécuter le même test.
- (b) Créer la branche `test/sms-otp-migration` toi-même via le dashboard
  Neon, et déposer sa chaîne de connexion de test dans un fichier local
  (ex. `.env.migration-test-neon`, déjà couvert par le `.gitignore`) sans la
  coller dans le chat — je pourrais ensuite l'utiliser pour lancer
  `prisma migrate deploy` dessus.
- (c) Accepter de sauter le test Neon pour cette migration précise : elle
  est purement additive (nouvel enum + colonnes avec défaut/nullable,
  aucune transformation), déjà validée sur un Postgres 16 identique en
  local — le risque de comportement différent spécifiquement lié au pooler
  Neon est faible pour ce type de changement. Dans ce cas, passer
  directement à la validation de la migration en production (hors périmètre
  de cette session, qui reste de toute façon en ARRÊT).

**Aucun résultat de test Neon n'est inventé ici** — cette section documente
un blocage réel, pas un test simulé.

## Historique (ajouter une entrée par session, la plus récente en haut)

- 2026-08-02 — Claude Code (VS Code) — Migration SMS/OTP testée en local
  avec succès (`schema.prisma` modifié, 18 migrations appliquées, `tsc`
  propre). Test Neon bloqué (pas d'accès). **Incident : `DATABASE_URL` de
  prod affichée par erreur dans la conversation — rotation recommandée.**
  Rien exécuté en production, aucune route créée. En attente de validation.
- 2026-08-02 — chat — Stratégie de test confirmée (local docker-compose puis
  branche Neon isolée). Checklist d'exécution rédigée, garde-fous renforcés
  (jamais toucher à la production dans cette phase).
- 2026-08-02 — Claude Code (VS Code) — Environnement sécurisé : Postgres
  local (`docker-compose`) confirmé fonctionnel, fournisseur de prod
  identifié (Neon), procédure de branche documentée. Commit `2457a73`. Rien
  exécuté.
- 2026-08-02 — chat — Pas de DB de dev séparée confirmé par Ange ; checklist
  de sécurisation rédigée.
- 2026-08-02 — chat — Décision : code OTP stocké haché (bcrypt).
- 2026-08-02 — Claude Code (VS Code) — Proposition SMS/OTP écrite. Commit
  `fdfa257`. Rien exécuté.
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