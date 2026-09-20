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
(`mobile/`). Dépôt créé et poussé : https://github.com/sonron1/souplesse-api (privé).
Étapes 0 à 4 du handoff terminées (doc consolidée, scaffold NestJS, modules Auth,
Subscriptions et Payments complets et testés) ; prochaine étape : module Coaching
(étape 5, best-effort) ou déploiement Render.com (étape 6).

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
- **Authentification mobile** câblée côté ancien backend Nitro (référence
  fonctionnelle) — **réimplémentée dans `souplesse-api`** le 2026-09-20 :
  register/resend-otp/verify-otp/login/refresh/logout, JWT (access 15m +
  refresh 7d), lockout compte (5 tentatives/15min) et lockout OTP (5
  tentatives/15min), révocation de session unique (sessionToken) au logout.
  13 tests unitaires + 1 e2e, plus un test manuel de bout en bout via curl.
  Le frontend mobile (`mobile/`) pointe encore vers l'ancien backend — le
  rebranchement vers `souplesse-api` est l'étape 7 du handoff.
- **Prisma pinné à 5.22.0 dans `souplesse-api`** (pas la 7.x/8.x par défaut
  du moment) : Prisma 7 a supprimé `url`/`directUrl` du bloc `datasource` au
  profit d'un nouveau `prisma.config.ts` + driver-adapters — changement
  cassant jugé hors scope pour cette phase démo. 5.22.0 = même version que
  le backend web, schéma copié tel quel, zéro adaptation nécessaire.
- **`souplesse-api` a sa propre base Postgres locale de dev** (docker-compose,
  port 5433, séparée de celle du web qui utilise 5432) — jamais connectée à
  la production Neon pendant cette phase (garde-fou #2).
- **Règle "pas de nouvelle demande tant qu'actif OU en pause"** (confirmée par
  Ange le 2026-09-20 avant l'étape Subscriptions) : implémentée et **testée
  explicitement** dans `souplesse-api` — un abonnement `status: 'ACTIVE'`
  bloque une nouvelle demande, qu'il soit en pause ou non, car la pause ne
  change jamais `status` (elle pose seulement `pausedAt`, comme sur le web —
  pas de valeur d'enum `PAUSED` séparée). Vérifié par test unitaire +
  vérification manuelle bout en bout (actif → bloqué, mis en pause → toujours
  bloqué, repris → toujours bloqué tant qu'actif).
- **Catalogue de formules mobile — corrigé le 2026-09-20 avec les vrais tarifs
  de la salle (Ange).** La formule "2 mois" (placeholder de la session
  précédente) est retirée — elle n'existe pas dans l'offre réelle. Catalogue
  définitif (Simple / Couple FCFA, validité, `maxPauses`) :
  - 1 mois : 15 000 / 25 000, 30j, maxPauses=0
  - Suivi personnel : 20 000 / 40 000, 30j, maxPauses=1
  - 3 mois : 40 000 / 75 000, 90j, maxPauses=2
  - 6 mois : 70 000 / 120 000, 180j, maxPauses=2
  - 1 an : 120 000 / 200 000, 365j, maxPauses=3

  Carnets de séances, Séance unique et formules sportives (Fit Dance,
  Taekwondo, Boxe) restent **hors périmètre pour cette phase de démo**
  (décision explicite d'Ange). "Report" = exactement le mécanisme de pause
  déjà codé — confirmé, rien à changer sur cette logique.
- **Abonnement Couple (mobile) — nouveau, 2026-09-20** : à la création d'une
  demande, le souscripteur fournit le numéro de téléphone de son partenaire.
  Ce numéro doit correspondre à un compte `MOBILE` déjà vérifié par SMS,
  sinon la demande est rejetée (400, code `partner_not_eligible` — message
  volontairement générique, ne distingue pas "numéro inconnu" de "non
  vérifié", pour ne pas permettre l'énumération de comptes, comme le fait
  déjà `resend-otp`). Si trouvé, **deux** abonnements `PENDING` sont créés
  et liés via `partnerUserId` (champ déjà présent sur le schéma partagé,
  pas de nouvelle table) — même principe que la liaison couple déjà en
  place côté web (`payments.service.ts`). La règle "actif ou en pause"
  bloque désormais la demande si **l'un ou l'autre** des deux comptes est
  concerné (réponse 409 avec `who: 'self' | 'partner'` pour indiquer lequel).
  `activate()` active les deux abonnements liés en une seule fois. Vérifié
  par test (26 tests sur le catalogue/couple) et manuellement de bout en
  bout (deux comptes réels créés, liés, activés, blocage confirmé des deux
  côtés après activation). **Non repris depuis le web** : la validation
  "genre opposé" pour les couples (Bloc L de CLAUDE.md) n'a pas été
  demandée pour le mobile et n'a pas été ajoutée — à signaler si c'est un
  oubli plutôt qu'un choix voulu.
- **Module Payments (`souplesse-api`) — 2026-09-20** : rôle `MODERATOR`
  ajouté au schéma (mobile uniquement, pas d'équivalent web) ; nouveau
  modèle `PaymentProof` (preuve de paiement) et `DeviceToken` (token Expo
  Push par appareil — comble le manque signalé dans le commit Auth : la
  résolution userId→token pour le push n'existait pas encore).
  `POST /payments/proof` (upload multipart, stockage **disque local**,
  5 Mo max, JPEG/PNG/WebP uniquement — **aucun compte S3/R2 provisionné**
  conformément au garde-fou "pas de ressource payante sans validation").
  `GET /payments/pending` (file du Modérateur), `GET /payments/:id/screenshot`,
  `PATCH /payments/:id/validate` (active l'abonnement — et celui du
  partenaire couple le cas échéant — notifie SMS+push, supprime la capture),
  `PATCH /payments/:id/reject` (motif obligatoire, notifie, supprime la
  capture, l'abonnement reste `PENDING` pour permettre une nouvelle
  soumission). **Limite connue à surveiller** : le stockage disque local est
  éphémère sur Render.com — un redéploiement entre la soumission et la
  décision du modérateur ferait perdre le fichier. Acceptable pour cette
  phase de démo (fichier supprimé de toute façon juste après décision), mais
  **pas une solution valable au-delà** — à remplacer par S3/R2/Cloudinary
  avant toute mise en production réelle. 9 tests unitaires (49 au total sur
  `souplesse-api`) + vérification manuelle complète de bout en bout (upload
  réel, contrôle des rôles, récupération de la capture, validation avec
  activation + suppression fichier + garde-fou anti double-traitement,
  rejet avec motif obligatoire).
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

- **`souplesse-api`** (dépôt séparé, https://github.com/sonron1/souplesse-api,
  privé) — backend NestJS de l'app mobile. Cloné localement dans
  `C:\Users\Ange\Documents\Dev\souplesse-api` (sibling de ce monorepo, pas un
  sous-dossier). Son propre README documente le démarrage local.
- `specs/2-mobile-app/spec.md` — cahier des charges fonctionnel (source de vérité actuelle)
- `specs/2-mobile-app/architecture.md` — architecture technique cible backend/mobile (source de vérité actuelle)
- `specs/2-mobile-app/handoff.md` — note de passation en cours ; **en cas de divergence avec ce fichier STATUS.md, `handoff.md` + `spec.md` + `architecture.md` priment** (voir section 0 de `handoff.md`)
- `specs/2-mobile-app/compliance/` — dossier APDP et politique de confidentialité (`.docx`, non prioritaires pour la phase démo)
- `specs/2-mobile-app/legacy/` — versions antérieures/superseded des documents ci-dessus, conservées pour l'historique (cahier des charges v2.1, note de passation v1, architecture cible v1 — avant clarification monorepo)
- `specs/2-mobile-app/prototypes/` — prototypes HTML cliquables
- `docs/security-audit.md` (racine) — audit sécurité du monorepo web, sans lien avec le mobile
- `CLAUDE.md` (racine) — instructions permanentes pour Claude Code

## Dernière session

- **Date/surface** : Claude Code (VS Code) — 2026-09-20 — étapes 0 à 3 du handoff
- **Fait (étape 0)** : Lecture complète de `handoff.md`, `spec.md`, `architecture.md`. Conflit
  détecté et signalé à Ange entre le pivot décrit dans ces documents et la décision
  actée dans ce fichier (backend = extension Nitro, monorepo) — **confirmé par Ange
  comme un pivot intentionnel et déjà tranché** dans la session de chat séparée.
  Doublons exacts entre `docs/` et `specs/2-mobile-app/` consolidés : versions de
  référence dans `spec.md`/`architecture.md`/`handoff.md`, anciennes versions dans
  `specs/2-mobile-app/legacy/`, `compliance/` nettoyé (ne garde que les `.docx`).
  Commit `5c55d81`.
- **Fait (étape 1)** : `gh` CLI vérifié disponible et authentifié (compte `sonron1`).
  Ange a confirmé de procéder en autonome avec check-ins par module. Dépôt
  `souplesse-api` créé (privé, sans historique) et poussé. Scaffold NestJS 12
  (ESM) avec la structure de `architecture.md` section 4 : `auth/`, `users/`,
  `subscriptions/`, `payments/`, `coaching/`, `notifications/` (avec
  `providers/sms/` et `providers/push/`), `prisma/`, `common/`. Schéma Prisma
  copié tel quel depuis ce monorepo, pinné en 5.22.0 (voir décision ci-dessus).
  Docker Compose local (Postgres port 5433, séparé du web). `@nestjs/mau`
  retiré (vulnérabilités transitives inutiles, non utilisé — déploiement prévu
  sur Render.com directement).
- **Fait (étape 2)** : Module Auth entièrement implémenté et testé — voir décision
  "Authentification mobile" ci-dessus pour le détail. Build + lint + 14 tests
  unitaires/e2e + smoke test manuel (curl) tous verts.
- **Fait (étape 3)** : Ange a demandé, avant de commencer, une vérification explicite
  de la règle "actif OU en pause" — confirmée correcte et testée (voir décision
  ci-dessus). Module Subscriptions implémenté : catalogue auto-seedé, `POST
  /subscriptions` (bloqué si abonnement actif/en pause), `GET /subscriptions/me`,
  `PATCH /subscriptions/:id/{pause,resume}`. 11 tests. Commit `souplesse-api@527755d`.
- **Fait (étape 3, correction)** : Ange a fourni les vrais tarifs de la salle
  et le mécanisme d'abonnement couple — catalogue corrigé (formule "2 mois"
  supprimée, "Suivi personnel" ajoutée, prix Simple/Couple réels) et liaison
  de comptes couple implémentée (voir décisions ci-dessus pour le détail).
  26 tests sur le module (40 au total sur `souplesse-api`), vérification
  manuelle bout en bout des deux fonctionnalités. Commit `souplesse-api@6077664`,
  poussé.
- **Fait (étape 4)** : Module Payments implémenté et testé — voir décision
  "Module Payments" ci-dessus pour le détail complet. `DeviceToken` +
  `POST /notifications/register-device` ajoutés au passage (comblent le
  manque signalé au commit Auth). 49 tests au total sur `souplesse-api`.
  Commit `souplesse-api@8c5c2c2`, poussé.
- **Pas encore fait** : Coaching (étape 5, best-effort), déploiement Render.com
  (étape 6), branchement du frontend mobile sur `souplesse-api` (étape 7),
  build APK (étape 8), test manuel bout en bout sur device réel (étape 9).
  Compte Africa's Talking toujours pas créé — `AfricasTalkingProvider`
  fonctionne en mode "stub log" en attendant.

## Questions en attente

- **Validation "genre opposé" pour l'abonnement Couple mobile** : le web impose
  cette règle (Bloc L de CLAUDE.md) ; elle n'a pas été demandée pour le mobile
  et n'a donc pas été ajoutée dans `souplesse-api`. À confirmer si c'est
  volontaire (le mobile pourrait vouloir être plus permissif, ex. couples de
  même sexe) ou un oubli à corriger.
- **Stockage des captures de paiement (`souplesse-api`)** : disque local,
  éphémère sur Render.com. Suffisant pour la démo (fichier supprimé juste
  après décision du modérateur) mais **pas une solution de production** —
  un redéploiement entre soumission et décision ferait perdre le fichier.
  À remplacer par un stockage persistant (S3/R2/Cloudinary) avant tout usage
  au-delà de la démo — nécessitera une ressource externe, donc validation
  explicite d'Ange avant de la provisionner (garde-fou #4).

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

- [x] **0. Consolider la documentation existante.** Fait — voir "Dernière session".
      Commit `5c55d81`.
- [x] **1. Créer le dépôt `souplesse-api`**, scaffold NestJS selon `architecture.md`
      section 4. Fait — https://github.com/sonron1/souplesse-api (privé).
- [x] **2. Module Auth** : inscription, connexion, vérification OTP SMS. Fait et testé
      — voir "Dernière session" et le commit initial de `souplesse-api`.
- [x] **3. Module Subscriptions** : formules 1/2/3/6/12 mois, statut actif/en
      pause/expiré, règle de non-renouvellement tant qu'actif **ou en pause**
      (vérifiée explicitement à la demande d'Ange). Corrigé le même jour avec
      les vrais tarifs + liaison couple (voir décisions ci-dessus). Fait et testé.
- [x] **4. Module Payments** : soumission de preuve, file de modération,
      validation/rejet, notification SMS + push via `PushProvider`, suppression de
      la capture après traitement. Fait et testé — voir décision "Module Payments"
      ci-dessus (limite de stockage disque local à surveiller).
- [ ] **5. Module Coaching** (prochaine étape, si le temps le permet pour cette
      démo — sinon signaler comme non couvert plutôt que de le bâcler).
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

- 2026-09-20 — Claude Code (VS Code) — Étapes 0-3 du handoff. Pivot architectural
  confirmé par Ange (backend extrait vers `souplesse-api`, NestJS, nouveau dépôt
  indépendant ; Render.com pendant la démo ; mobile inchangé dans ce monorepo).
  Documentation consolidée (commit `5c55d81`). Dépôt `souplesse-api` créé et
  poussé (https://github.com/sonron1/souplesse-api, privé), scaffold NestJS,
  module Auth complet et testé (register/OTP/login/refresh/logout, 14 tests +
  smoke test manuel). Ange a demandé une vérification explicite de la règle
  "actif ou en pause" avant Subscriptions — confirmée et testée. Module
  Subscriptions complet et testé (catalogue 5 formules, requête bloquée si
  actif/en pause, pause/reprise).
- 2026-09-20 — Claude Code (VS Code) — Correction du catalogue Subscriptions avec
  les vrais tarifs de la salle fournis par Ange : formule "2 mois" supprimée
  (n'existe pas), "Suivi personnel" ajoutée, prix Simple/Couple réels pour les 5
  formules. Ajout de la liaison de comptes pour l'abonnement Couple (numéro de
  téléphone du partenaire, vérifié MOBILE + phoneVerified, deux abonnements
  PENDING liés via `partnerUserId`, blocage actif/en pause vérifié sur les deux
  comptes). 26 tests sur le module (40 au total), vérifié manuellement de bout
  en bout. Commit `souplesse-api@6077664`. Une question ouverte : validation
  genre opposé (non reprise du web, à confirmer).
- 2026-09-20 — Claude Code (VS Code) — Module Payments (étape 4) : rôle
  `MODERATOR` et modèles `PaymentProof`/`DeviceToken` ajoutés au schéma ;
  upload de preuve (disque local, 5 Mo, JPEG/PNG/WebP), file de modération,
  validation (active l'abonnement + le partenaire couple, notifie SMS+push,
  supprime la capture), rejet (motif obligatoire, abonnement reste PENDING).
  `POST /notifications/register-device` ajouté pour le push. 49 tests au
  total, vérifié manuellement de bout en bout (upload réel, rôles, capture,
  validation, rejet). Commit `souplesse-api@8c5c2c2`, poussé. Limite
  documentée : stockage disque éphémère sur Render.com, à remplacer avant
  toute production réelle. Prochaine étape : module Coaching (best-effort)
  ou déploiement Render.com.
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
