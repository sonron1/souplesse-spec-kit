# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

Proposition SMS/OTP validée sur le fond (schéma, routes, OTP haché bcrypt),
mais **exécution suspendue** : Ange n'a pas de base de données de
développement séparée de la production — il faut sécuriser l'environnement
avant toute migration.

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

- **Date/surface** : chat Claude.ai — 2026-08-02
- **Fait** : décision du stockage OTP (bcrypt) confirmée. Question posée à
  Ange sur l'existence d'une base de dev séparée — réponse : non, aucune.
  Nouvelle checklist d'investigation (lecture seule) rédigée avant
  d'autoriser toute exécution de migration.
- **Pas encore fait** : `docker-compose.yml` (présent dans l'historique du
  dépôt) n'a pas été vérifié — inconnu s'il fournit une Postgres locale
  utilisable pour tester la migration séparément de la production. Le
  fournisseur de base de données (probablement Neon, à confirmer — un commit
  passé mentionne "Neon pooler compatibility") et la possibilité d'y créer
  une branche de base de données isolée n'ont pas non plus été vérifiés.
  Aucune migration, aucune route SMS créée. Le diff `89df398..HEAD` de la
  phase authentification reste également en attente de vérification par
  Ange (depuis plusieurs sessions).

## Garde-fou supplémentaire — pas de DB de test séparée

- **Ne jamais exécuter `prisma migrate dev` ou `prisma migrate deploy` contre
  la base de production tant que cette checklist n'est pas terminée et
  validée par Ange.**
- Ne pas supposer quel fournisseur de base de données est utilisé — le
  vérifier dans le `.env` local (sans jamais afficher la valeur complète de
  `DATABASE_URL` en clair dans une réponse ou un commit — donner uniquement
  le nom d'hôte/fournisseur, ex. "neon.tech", pas les identifiants).

## Prochaine étape — Sécuriser l'environnement avant migration (lecture seule)

- [ ] **1.** Vérifier si `docker-compose.yml` (racine du dépôt) définit un
      service Postgres utilisable comme base de développement locale.
      Documenter dans ce fichier : ce que le service contient, comment le
      démarrer (`docker-compose up` ou équivalent), et si le schéma Prisma
      actuel peut s'y appliquer sans toucher à la production (ex. en
      pointant temporairement `DATABASE_URL` dessus). Ne pas le démarrer ni
      l'utiliser à cette étape — seulement lire et documenter.
- [ ] **2.** Identifier (sans l'afficher en clair) le fournisseur de base de
      données actuellement utilisé par le `.env` local/production : regarder
      uniquement le nom d'hôte dans `DATABASE_URL` (ex. contient-il
      "neon.tech" ?). Documenter juste le nom du fournisseur trouvé.
- [ ] **3.** Si le fournisseur est Neon (ou un autre supportant des branches
      de base de données à moindre coût) : documenter la procédure exacte
      (lien vers leur documentation officielle si connue, ou indiquer
      "à vérifier dans leur dashboard") pour créer une branche isolée de la
      base de production, sans en créer une soi-même à cette étape.
- [ ] **4.** Proposer, dans une nouvelle sous-section "Plan de test avant
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

## Historique (ajouter une entrée par session, la plus récente en haut)

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