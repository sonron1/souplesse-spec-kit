# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

Environnement sécurisé (Postgres local via `docker-compose`, base de
production identifiée comme Neon). Prochaine étape : tester réellement la
migration SMS/OTP en local, puis sur une branche Neon isolée — jamais
directement sur la production.

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

- **Date/surface** : chat Claude.ai — 2026-08-02
- **Fait** : choix de la stratégie de test confirmé (local docker-compose
  PUIS branche Neon isolée, avant toute exécution en production). Checklist
  d'exécution rédigée.
- **Pas encore fait** : rien exécuté. `schema.prisma` non modifié. Aucune
  branche Neon créée. Le diff `89df398..HEAD` de la phase authentification
  reste en attente de vérification par Ange (depuis plusieurs sessions —
  à faire dès que possible, indépendamment de cette phase SMS).

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

- [ ] **1.** Démarrer l'environnement local : `docker-compose up -d`.
      Vérifier que le service Postgres répond (ex.
      `docker-compose ps`).
- [ ] **2.** Créer un fichier de config de test contenant uniquement une
      `DATABASE_URL` locale pointant vers ce conteneur (identifiants du
      `docker-compose.yml` lui-même, pas de secret de production). L'ajouter
      au `.gitignore` si nécessaire.
- [ ] **3.** Appliquer dans `schema.prisma` les changements proposés (enum
      `RegisteredVia`, 6 champs sur `User`) — exactement ceux documentés
      dans "Proposition — mécanisme SMS/OTP" plus bas dans ce fichier.
- [ ] **4.** En utilisant la config de test locale (pas le `.env` de
      production), exécuter :
      ```
      npx prisma migrate dev --name add_phone_verification
      ```
      Documenter le résultat exact (succès, erreurs éventuelles) dans
      STATUS.md.
- [ ] **5.** Vérifier `npx prisma generate` et `npx tsc --noEmit` : aucune
      erreur.
- [ ] **6.** Créer une branche Neon de test (nom explicite, ex.
      `test/sms-otp-migration`), récupérer sa `DATABASE_URL` de test
      (ne pas l'afficher en clair dans la réponse), et réexécuter la même
      migration contre cette branche pour confirmer la compatibilité avec le
      pooler Neon.
- [ ] **7.** Documenter le résultat des deux tests (local + Neon) dans une
      nouvelle sous-section "Résultat des tests de migration".
- [ ] **8. ARRÊT.** Ne pas exécuter la migration contre la production, ne pas
      créer les routes `/api/auth/phone/*`, ne pas toucher au frontend
      mobile. Committer le `schema.prisma` modifié + la documentation des
      résultats de test, et attendre la validation d'Ange avant de migrer la
      production et d'implémenter les routes.

## Historique (ajouter une entrée par session, la plus récente en haut)

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