# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

**Pivot architectural confirmé (2026-09-20) : le backend consommé par l'app mobile est
extrait dans un nouveau dépôt indépendant `souplesse-api` (NestJS)**, hébergé sur
Render.com (offre gratuite) le temps de la démo. L'app mobile reste dans ce monorepo
(`mobile/`). Documentation consolidée (étape 0 du handoff terminée) ; prochaine étape :
créer le dépôt `souplesse-api` et y scaffolder NestJS (étape 1).

La migration SMS/OTP appliquée en production le 2026-08-02 (voir "Archive" plus bas)
reste valide au niveau du schéma Prisma partagé — mais les routes `/api/auth/phone/*`
ne seront **plus** créées dans le backend Nitro embarqué : elles seront réimplémentées
dans `souplesse-api` (voir `architecture.md`, module `auth`). La confirmation d'Ange que
`souplessefitness.com` fonctionne toujours normalement après cette migration reste un
point ouvert mais n'est plus bloquante pour la suite du travail mobile.

## Décisions actées (ne pas rouvrir sans le dire explicitement)

- App mobile **autonome**, pas un wrapper du site web.
- **Aucun paiement in-app** : preuve (capture d'écran) d'un paiement Mobile
  Money (MTN, Moov, Celtiis) fait hors app.
- Durées d'abonnement : 1, 2, 3, 6, 12 mois.
- Notifications (modération des paiements) : SMS **et** push, en parallèle.
  Fournisseur push confirmé : **Expo Push Notifications**.
- 4 rôles / 4 dashboards distincts : **Client, Coach, Modérateur, Admin**.
- Priorité de publication : **Google Play d'abord**. Apple App Store = phase 2.
- Stack mobile : **React Native + Expo**, dans `mobile/` à la racine de ce
  monorepo (`souplesse-speckit`), aux côtés du web — **inchangé par le pivot
  ci-dessous**.
- **[PIVOT — 2026-09-20] Backend extrait dans un nouveau dépôt indépendant.**
  Le mobile ne consomme plus le backend Nitro embarqué du monorepo web. Un
  **nouveau backend NestJS**, dans un **nouveau dépôt GitHub indépendant
  `souplesse-api`** (sans historique lié à ce monorepo), est développé
  spécifiquement pour l'app mobile. Il réutilise le schéma Prisma existant
  (base Neon partagée, avec bases dev/prod distinctes pendant la phase de
  démo). Hébergement provisoire : **Render.com (offre gratuite)** pendant la
  phase de démo sans budget ; cible finale : VPS DigitalOcean une fois
  financé. Ceci **remplace** l'ancienne décision "backend = extension de
  l'API Nitro/Prisma existante". Décision prise dans la session de chat
  Claude.ai séparée (voir `handoff.md`), confirmée explicitement par Ange en
  session Claude Code le 2026-09-20. Détails complets dans `architecture.md`.
- Objectif immédiat de cette phase : produire un **APK Android de démonstration**
  fonctionnel de bout en bout (inscription → OTP → abonnement → preuve de paiement →
  modération → dashboard), pour une démo investisseurs — pas encore un lancement
  public. Aucune ressource payante à provisionner sans validation explicite.
- Identité visuelle validée : `#EAB308`, thème sombre, Manrope + Inter.
- **Authentification mobile** câblée (login/register/logout, navigation par
  rôle, tokens via `expo-secure-store`) — **dans l'ancien backend Nitro** ; à
  **réimplémenter** dans `souplesse-api` (référence fonctionnelle, pas à
  reprendre telle quelle).
- **Vérification de compte** : email inchangé pour le web ; SMS bloquant
  pour les comptes mobile uniquement (`registeredVia: WEB | MOBILE`).
- **Schéma SMS/OTP appliqué en local ET en production avec succès** (voir
  Archive ci-dessous) : enum `RegisteredVia { WEB MOBILE }` + 6 champs sur
  `User` (`registeredVia`, `phoneVerified`, `phoneVerificationCodeHash`,
  `phoneVerificationCodeCreatedAt`, `phoneVerificationAttempts`,
  `phoneVerificationLockedUntil`). Code OTP haché (bcrypt). Ce schéma est
  réutilisé tel quel par `souplesse-api`.
- **Passerelle SMS retenue : Africa's Talking**, derrière une interface
  `SmsProvider` interchangeable (voir `architecture.md` section 5). Test
  comparatif avec eSMS Africa prévu en parallèle, sans bloquer le choix
  initial.
- **Incident de sécurité clos (2026-08-02)** : `DATABASE_URL` et
  `DIRECT_DATABASE_URL` de production affichés en clair dans une sortie
  d'outil pendant l'investigation (pas dans un commit ni dans STATUS.md).
  Mot de passe Neon régénéré, `.env` local et variables Vercel (Production)
  mis à jour par Ange, site vérifié fonctionnel après redéploiement.
  **Aucune action supplémentaire requise sur ce point.**

## Fichiers de référence

- `specs/2-mobile-app/spec.md` — cahier des charges fonctionnel (source de vérité actuelle)
- `specs/2-mobile-app/architecture.md` — architecture technique cible backend/mobile (source de vérité actuelle)
- `specs/2-mobile-app/handoff.md` — note de passation en cours ; **en cas de divergence avec ce fichier STATUS.md, `handoff.md` + `spec.md` + `architecture.md` priment** (voir section 0 de `handoff.md`)
- `specs/2-mobile-app/compliance/` — dossier APDP et politique de confidentialité (`.docx`, non prioritaires pour la phase démo)
- `specs/2-mobile-app/legacy/` — versions antérieures/superseded des documents ci-dessus, conservées pour l'historique (cahier des charges v2.1, note de passation v1, architecture cible v1 — avant clarification monorepo)
- `specs/2-mobile-app/prototypes/` — prototypes HTML cliquables
- `docs/security-audit.md` (racine) — audit sécurité du monorepo web, sans lien avec le mobile
- `CLAUDE.md` (racine) — instructions permanentes pour Claude Code

## Dernière session

- **Date/surface** : Claude Code (VS Code) — 2026-09-20 — consolidation documentaire (étape 0 du handoff)
- **Fait** : Lecture complète de `handoff.md`, `spec.md`, `architecture.md`. Conflit
  détecté et signalé à Ange entre le pivot décrit dans ces documents et la décision
  actée dans ce fichier (backend = extension Nitro, monorepo) — **confirmé par Ange
  comme un pivot intentionnel et déjà tranché** dans la session de chat séparée.
  Inventaire de `docs/` et `specs/2-mobile-app/` : doublons exacts identifiés entre
  `docs/cahier-des-charges.md` ↔ `specs/2-mobile-app/cahier-des-charges.md`,
  `docs/note-passation-claude-code.md` ↔ `specs/2-mobile-app/compliance/note-passation-claude-code.md`,
  `docs/architecture-cible-souplesse-backend.md` ↔ `specs/2-mobile-app/compliance/architecture-cible-souplesse-backend.md`.
  Consolidation effectuée : versions de référence conservées dans `spec.md`/`architecture.md`/`handoff.md` ;
  anciennes versions déplacées (une seule copie canonique) dans `specs/2-mobile-app/legacy/` ;
  doublons redondants supprimés ; les deux fichiers `.md` égarés retirés de
  `compliance/` (qui ne contient plus que les `.docx`) ; `docs/security-audit.md`
  conservé à la racine (web/monorepo général, sans rapport avec le mobile).
  STATUS.md mis à jour pour refléter le pivot.
- **Pas encore fait** : création du dépôt `souplesse-api` (étape 1 du périmètre) —
  non lancée dans cette session, en attente de vérification de faisabilité
  (accès `gh` CLI authentifié) et de confirmation du nom/visibilité du dépôt avec Ange
  avant de créer une ressource externe visible sur son compte GitHub.

## Garde-fous permanents — migrations de schéma production

- Utiliser **`prisma migrate deploy`** pour la production (jamais
  `migrate dev`, qui est un outil de développement interactif/destructif
  dans certains cas — `deploy` applique uniquement les migrations déjà
  générées et testées en local, sans rien recréer).
- Ne jamais afficher `DATABASE_URL`/`DIRECT_DATABASE_URL` en clair dans une
  réponse, un fichier commité, ou une commande dont la sortie serait
  affichée — utiliser des variables d'environnement déjà chargées par le
  processus, jamais un `grep`/`cat` direct sur `.env` contenant des secrets
  de production.
- Si la moindre erreur survient pendant `migrate deploy` : s'arrêter
  immédiatement, ne pas retenter, documenter l'erreur exacte dans STATUS.md
  et attendre Ange — ne jamais improviser une correction sur la base de
  production en session autonome.
- Vérifier le PITR Neon actif avant toute migration de schéma en production
  (filet de sécurité minimal en l'absence de base de test séparée).

## Garde-fous pour la phase actuelle (pivot backend NestJS + APK démo)

Détail complet dans `handoff.md` section 3. Résumé :

1. Ne jamais toucher à la plateforme web existante ni à sa base de production directement.
2. Ne jamais migrer un schéma contre la production sans vérification PITR préalable.
3. Ne jamais committer de secret (clé Africa's Talking, identifiants Neon, JWT secret) — `.env` non versionné + `.env.example` documenté.
4. Ne provisionner aucune ressource payante sans validation explicite préalable.
5. Ne pas supprimer de code/branche existante sans raison documentée — déplacer vers `legacy/` en cas de doute.
6. Respecter les règles métier validées (pas de nouvelle demande de paiement si abonnement actif/en pause, suppression de la preuve après décision, SMS obligatoire et bloquant pour le mobile).
7. Décision structurante non couverte : documenter le choix dans le commit, signaler dans le résumé de fin de tâche.
8. Tester avant de considérer une fonctionnalité terminée (au minimum un test manuel de bout en bout).

## Prochaine étape — Périmètre du handoff (`handoff.md` section 4)

- [x] **0. Consolider la documentation existante.** Fait dans cette session — voir
      "Dernière session" ci-dessus. Commit dédié séparé du reste.
- [ ] **1. Créer le dépôt `souplesse-api`** (nouveau, sans historique), scaffold
      NestJS selon `architecture.md` section 4 (modules : auth, users, subscriptions,
      payments, coaching, notifications). **Avant de créer une ressource GitHub
      externe visible sur le compte d'Ange, vérifier la disponibilité/authentification
      de `gh` CLI et confirmer le nom exact + la visibilité (public/privé) du dépôt.**
- [ ] **2. Module Auth** : inscription, connexion, vérification OTP SMS, en réutilisant
      le schéma Prisma existant, Africa's Talking derrière `SmsProvider`.
- [ ] **3. Module Subscriptions** : formules 1/2/3/6/12 mois, statut actif/en
      pause/expiré, règle de non-renouvellement tant qu'actif.
- [ ] **4. Module Payments** : soumission de preuve, file de modération,
      validation/rejet, notification SMS + push via `PushProvider`, suppression de
      la capture après traitement.
- [ ] **5. Module Coaching** (si le temps le permet pour cette démo — sinon
      signaler comme non couvert plutôt que de le bâcler).
- [ ] **6. Déployer `souplesse-api` sur Render.com** (offre gratuite).
- [ ] **7. Brancher l'app mobile** (`EXPO_PUBLIC_API_URL`) sur cette instance Render.
- [ ] **8. Générer l'APK** via `eas build --platform android --profile preview`.
- [ ] **9. Valider manuellement le parcours complet** sur un appareil Android réel
      avant de livrer l'APK.

Definition of done complète : voir `handoff.md` section 5.

## Archive — Migration SMS/OTP production (2026-08-02, terminée)

Cette section documente une phase antérieure au pivot ci-dessus, conservée pour
l'historique. Le schéma qu'elle décrit reste en place et est réutilisé tel quel
par `souplesse-api` ; les routes applicatives mentionnées comme "à créer" dans
cette archive ne seront finalement **pas** créées dans l'ancien backend Nitro
(voir pivot ci-dessus) — elles seront réimplémentées dans `souplesse-api`.

### Résultat — étape 1 (PITR Neon)

**Confirmé par Ange** (vérification dashboard Neon, hors de portée de
Claude Code — pas d'accès navigateur/API disponible dans cette session) :
Point-in-Time Recovery **actif**, fenêtre de restauration **6 heures** (plan
gratuit Neon). Filet de sécurité jugé suffisant pour cette migration
purement additive → passage à l'étape 2.

### Résultat — étape 2 (`prisma migrate deploy` contre la production)

Exécuté directement (variable d'environnement du `.env` racine, déjà mise à
jour par Ange après la rotation — jamais affichée en clair ; seul le nom
d'hôte apparaît dans la sortie de Prisma, jamais les identifiants) :

```
Datasource "db": PostgreSQL database "neondb", schema "public" at "ep-jolly-leaf-airya666.c-4.us-east-1.aws.neon.tech"

17 migrations found in prisma/migrations

Applying migration `20260802132750_add_phone_verification`

All migrations have been successfully applied.
```

Une seule migration était en attente — les 16 précédentes étaient déjà
appliquées en production (normal, c'est la base qui fait tourner le site
depuis le début). **Succès, aucune erreur.**

### Résultat — étape 3 (`prisma migrate status`)

```
Datasource "db": PostgreSQL database "neondb", schema "public" at "ep-jolly-leaf-airya666.c-4.us-east-1.aws.neon.tech"

17 migrations found in prisma/migrations

Database schema is up to date!
```

Confirme que les 17 migrations (dont la nouvelle) sont bien enregistrées et
appliquées en production. Le schéma SMS/OTP est en place sur la base de
production (`RegisteredVia`, `registeredVia`, `phoneVerified`,
`phoneVerificationCodeHash`, `phoneVerificationCodeCreatedAt`,
`phoneVerificationAttempts`, `phoneVerificationLockedUntil` sur `User`) —
tous les comptes existants ont `registeredVia = WEB` (défaut), donc le
comportement de login web n'est pas affecté.

### Résultat — étape 4 (site déployé après migration)

**Non vérifiable par Claude Code** : pas d'accès réseau sortant vers
`souplessefitness.com`, pas de navigateur. Migration additive, risque de
régression jugé faible en théorie mais non vérifié comme tel. **Confirmation
d'Ange toujours en attente** sur ce point précis — désormais non bloquante
pour la suite du travail mobile puisque les routes SMS ne seront plus créées
dans ce backend.

## Historique (ajouter une entrée par session, la plus récente en haut)

- 2026-09-20 — Claude Code (VS Code) — Pivot architectural confirmé par Ange
  (backend extrait vers `souplesse-api`, NestJS, nouveau dépôt indépendant ;
  Render.com pendant la démo ; mobile inchangé dans ce monorepo). Documentation
  consolidée (étape 0 du handoff) : doublons `docs/` ↔ `specs/2-mobile-app/`
  résolus, anciennes versions déplacées dans `legacy/`, `compliance/` nettoyé.
  STATUS.md mis à jour. Prochaine étape : créer le dépôt `souplesse-api`.
- 2026-08-02 — Claude Code (VS Code) — PITR confirmé (6h) par Ange. Migration
  SMS/OTP appliquée en production avec succès (`migrate deploy` +
  `migrate status` OK). Site déployé non vérifiable par moi — en attente de
  confirmation d'Ange avant de créer les routes `/api/auth/phone/*`.
- 2026-08-02 — Claude Code (VS Code) — Migration production **non
  exécutée** : PITR Neon non vérifiable depuis cet outil (pas d'accès
  dashboard/API), arrêt avant `migrate deploy` conformément à la checklist.
  En attente qu'Ange confirme le PITR dans le dashboard Neon.
- 2026-08-02 — chat — Rotation Neon confirmée (local + Vercel), site
  fonctionnel. Checklist de migration de production rédigée ; test branche
  Neon sauté au profit d'une vérification PITR.
- 2026-08-02 — Claude Code (VS Code) — Migration testée avec succès en local
  (docker-compose) ; incident de sécurité signalé (DATABASE_URL affichée en
  clair pendant l'investigation, jamais commitée) ; test branche Neon
  bloqué (pas d'accès `neonctl`/API). Commit `0fe6f5c`.
- 2026-08-02 — chat — Stratégie de test confirmée (local puis Neon).
- 2026-08-02 — Claude Code (VS Code) — Environnement sécurisé identifié
  (docker-compose local, Neon en prod). Commit `2457a73`.
- 2026-08-02 — chat — Pas de DB de dev séparée confirmé ; checklist de
  sécurisation rédigée.
- 2026-08-02 — chat — Décision : code OTP haché (bcrypt).
- 2026-08-02 — Claude Code (VS Code) — Proposition SMS/OTP écrite. Commit
  `fdfa257`.
- 2026-08-02 — chat — Décision finale : email/téléphone identiques web et
  mobile ; SMS ajouté en vérification bloquante mobile uniquement.
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
