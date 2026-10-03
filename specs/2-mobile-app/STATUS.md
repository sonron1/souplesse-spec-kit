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
Étapes 0 à 4 du handoff terminées côté `souplesse-api` (doc consolidée, scaffold
NestJS, modules Auth, Subscriptions et Payments complets et testés, validation
genre opposé couple ajoutée). Render.com déployé par Ange (étape 6) après
correctif `render.yaml` (JWT_SECRET/JWT_REFRESH_SECRET). **Travail en cours,
2026-09-20 : reconstruction de l'app mobile** (`mobile/`, restée figée depuis
la phase Authentification d'avant le pivot) selon le plan détaillé d'Ange —
voir section "Plan de construction mobile" ci-dessous pour le détail
bloc par bloc.

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
  côtés après activation). **Validation genre opposé ajoutée le 2026-09-20**
  (demande explicite d'Ange) : réplique exactement le Bloc L du web
  (`server/api/payments/create-session.post.ts` L001) — rejet 400
  (`incompatible_genders`) si l'un des deux genres est manquant ou si les
  deux comptes ont le même genre. Le contrôle web complémentaire ("partenaire
  déjà dans un abonnement couple actif") n'est pas répliqué séparément : le
  blocage actif/en pause déjà en place le couvre plus largement (bloque sur
  n'importe quel abonnement actif du partenaire, pas seulement un couple).
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
  **Durcissement sécurité — 2026-10-03** : type vérifié par signature
  (magic bytes), plus seulement par le Content-Type déclaré ; extension du
  fichier stocké déduite du contenu (elle reprenait celle du nom envoyé par
  le client → XSS stocké possible chez le Modérateur) ; upload gardé en
  mémoire (5 Mo) et écrit sur disque seulement après toutes les
  vérifications ; rate limit 5/min sur la route ; `trust proxy` à 1 (Render,
  un seul proxy) — avant, toutes les limites de débit, auth comprise, étaient
  partagées entre tous les clients. Une nouvelle soumission pour un
  abonnement déjà `PENDING` **remplace** la preuve en attente (détails +
  fichier, l'ancien est supprimé) au lieu d'en créer une seconde, et garde sa
  place dans la file (décision d'Ange). Verrou `SELECT … FOR UPDATE` sur
  l'abonnement contre le double appui, vérifié contre la base Neon de démo.
  **Limite connue acceptée (phase démo, décision d'Ange)** : si le client
  remplace sa preuve pendant que le Modérateur la consulte, la validation ou
  le rejet s'applique à la version remplacée, et le nouveau fichier reste
  orphelin sur le disque (c'est l'ancien chemin, déjà supprimé, que
  `approve`/`reject` tentent d'effacer). Rare ; à traiter si besoin par un
  contrôle optimiste (statut + `screenshotPath` attendus) dans
  `approve`/`reject`.
- **Déploiement Render.com préparé — 2026-09-20** : `render.yaml` (Blueprint,
  un seul service gratuit, pas de séparation staging/prod pour cette phase,
  région Frankfurt). `start:prod` exécute désormais `prisma migrate deploy`
  avant de démarrer (idempotent, sûr à chaque redémarrage y compris après
  mise en veille du plan gratuit). Secrets JWT auto-générés par Render
  (`generateValue: true`) ; `DATABASE_URL`/`DIRECT_DATABASE_URL` et les
  identifiants Africa's Talking marqués `sync: false` (jamais dans le dépôt,
  demandés par Render au moment du déploiement). Bug CORS trouvé et corrigé
  au passage : `origin: ['*']` ne fait PAS office de wildcard pour le
  package `cors` (seul `origin: true` reflète n'importe quelle origine) —
  aurait bloqué silencieusement toutes les requêtes une fois déployé. Node
  épinglé en version 22 (`.node-version` + `engines`) plutôt que la 24.13
  utilisée en local, par prudence sur la disponibilité côté Render.
  **Aucun accès Render/Neon (CLI ou API) depuis cet outil** — même
  contrainte que la vérification PITR Neon précédente ; Ange a réalisé les
  étapes manuelles (projet Neon + déploiement Blueprint) elle-même.
- **Bug `render.yaml` corrigé — 2026-09-20** : après déploiement, seules
  `DATABASE_URL`/`DIRECT_DATABASE_URL` sont apparues dans l'onglet
  *Environment* du service Render — `JWT_SECRET` jamais généré → crash au
  démarrage (`JwtStrategy` appelle `config.getOrThrow('JWT_SECRET')` dans son
  constructeur, exécuté dès le boot d'`AuthModule`, avant toute requête).
  Audit de tous les `getOrThrow`/`process.env` du code : seules 4 variables
  sont réellement requises au démarrage — `JWT_SECRET`, `JWT_REFRESH_SECRET`,
  `DATABASE_URL`, `DIRECT_DATABASE_URL` — les 9 autres ont toutes un
  fallback (`?? '15m'`, mode stub SMS, etc.). Les 4 étaient déjà déclarées
  dans `render.yaml` ; le problème n'était donc pas une variable manquante
  de la liste mais `generateValue: true` (utilisé pour les 2 secrets JWT),
  qui n'est fiable qu'à la toute première création du service depuis le
  blueprint — pas garanti de se matérialiser sur un service déjà existant.
  Remplacé par `sync: false` (même mécanisme que les 2 variables DB, qui
  elles ont bien fonctionné) pour un comportement prévisible dans tous les
  cas. Commit `souplesse-api@110f544`, poussé. **Correctif de code déployé,
  mais l'application réelle sur Render reste à faire par Ange** — ajouter
  directement `JWT_SECRET`/`JWT_REFRESH_SECRET` dans l'onglet *Environment*
  du service existant est plus rapide et plus certain qu'un redéploiement ou
  une resynchronisation Blueprint (voir section "Dépannage" du README de
  `souplesse-api` pour le détail — je ne peux pas vérifier depuis cet outil
  si Render relit `render.yaml` sur un service déjà créé).
- **Root cause confirmée — 2026-09-20** : Ange a observé que l'auto-deploy du
  commit `110f544` avait échoué juste avant que le déploiement manuel du même
  commit réussisse. Confirmé par Ange : elle avait ajouté `JWT_SECRET`/
  `JWT_REFRESH_SECRET` à la main dans l'onglet *Environment* **avant** de
  déclencher le déploiement manuel — ce n'est donc pas "manuel vs automatique"
  qui a fait la différence, c'est le moment où les variables ont été ajoutées.
  Ni un déploiement automatique (push) ni un déploiement manuel ne relit
  `render.yaml` pour une variable sur un service déjà existant — seules la
  création initiale depuis un Blueprint ou une resynchronisation Blueprint
  explicite le font. **Conséquence pratique** : les variables déjà réglées ne
  risquent rien lors d'un futur `git push` classique (elles sont un état
  persistant du service, jamais recalculées depuis `render.yaml` à chaque
  déploiement) — mais toute **nouvelle** variable requise ajoutée plus tard
  au code retombera dans le même piège si elle n'est pas aussi ajoutée à la
  main (ou via Sync) au moment où on la déclare dans `render.yaml`.
- **Garde-fou ajouté — 2026-09-20** : `src/env-check.ts` dans `souplesse-api`
  vérifie les 4 variables requises (`JWT_SECRET`, `JWT_REFRESH_SECRET`,
  `DATABASE_URL`, `DIRECT_DATABASE_URL`) avant même l'instanciation de Nest,
  et affiche un message unique et clair listant exactement ce qui manque —
  au lieu de la trace générique de NestJS qui avait nécessité un audit complet
  du code pour être décodée la première fois. Vérifié manuellement (fichier
  `.env` déplacé temporairement + variables JWT retirées de l'environnement
  du process enfant : sortie immédiate avec le message attendu avant tout log
  Nest ; comportement normal confirmé une fois restauré). 4 nouveaux tests
  (55 au total). Commit `souplesse-api@08686bb`, poussé. Ne corrige pas le
  problème de fond (une nouvelle variable ne se propage toujours pas
  automatiquement) mais rend le diagnostic immédiat au lieu de nécessiter
  une nouvelle session d'audit.
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

- **Date/surface** : Claude Code (VS Code) — 2026-09-20 — étapes 0 à 4 du handoff
  + validation genre couple + déploiement Render.com résolu + reconstruction
  mobile blocs 1-4
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
- **Fait (correctifs demandés)** : validation genre opposé pour le couple
  ajoutée (voir décision ci-dessus). Déploiement Render.com résolu : Ange a
  créé le projet Neon et déployé via Blueprint, correctif `render.yaml`
  (JWT_SECRET/JWT_REFRESH_SECRET) appliqué pour un crash au démarrage — voir
  décision "Bug `render.yaml` corrigé" ci-dessus. **URL publique confirmée :
  `https://souplesse-api.onrender.com`.**
- **Fait (2026-09-20, suite)** : Audit complet de `mobile/` (voir Historique) ;
  reconstruction lancée selon le plan d'Ange — voir "Plan de construction
  mobile" ci-dessous pour le détail bloc par bloc (1 à 4 faits à ce stade).
- **Pas encore fait** : Coaching (étape 5 du handoff, best-effort — signalé
  non couvert plutôt que bâclé), build APK (étape 8), test manuel bout en
  bout sur device réel (étape 9, prévu par Ange sur Samsung A56 après ce
  qui suit). Compte Africa's Talking toujours pas créé —
  `AfricasTalkingProvider` fonctionne en mode "stub log" en attendant.
- **Fait (2026-09-20, correctifs bloc 3 suite au test d'Ange sur Samsung
  A56)** : deux bugs remontés par Ange après test réel du `ChooseFormulaScreen`.
  (1) Le prix affiché dans chaque carte de formule restait celui du Solo
  quel que soit le mode sélectionné — la carte affichait auparavant les deux
  prix (Solo et Couple) empilés en permanence au lieu de réagir au toggle.
  Corrigé : chaque carte calcule désormais `displayPrice`/`showCouplePrice`
  à partir de l'état global `isCouple`, donc le prix ET le libellé
  "(Solo)"/"(Couple)" basculent ensemble sur toutes les cartes dès que le
  toggle change (pas seulement sur la carte sélectionnée). (2) Responsivité :
  aucune largeur fixe en px n'a été trouvée dans le fichier, mais aucune
  largeur explicite n'était déclarée non plus (le composant comptait
  entièrement sur le stretch implicite de flexbox) — durci en ajoutant
  `width: '100%'` (pourcentage) explicite sur `ScrollView`, `card`,
  `segmentRow`, `optionsBlock`, `input` et `button`, plus un nouveau layout
  en ligne (`cardHeaderRow`, flexDirection row + flexWrap + space-between)
  pour le nom et le prix de la carte, avec `flexShrink` des deux côtés pour
  éviter tout débordement horizontal. Vérifié par `tsc --noEmit` (aucune
  erreur) + `expo export --platform android` (841 modules, build OK) —
  toujours pas de vérification visuelle possible depuis cet outil, en
  attente du retest d'Ange sur son Samsung A56. **Effet de bord détecté et
  annulé** : lancer `npx expo export`/`npx tsc` depuis `mobile/` a modifié
  `package.json`/`package-lock.json` à la racine du monorepo (ajout de
  `expo`/`@types/react` en dépendances racine, `.expo/` créé à la racine) —
  contraire au garde-fou "ne jamais toucher au `package.json` racine".
  Détecté via `git status` avant tout commit, changements annulés
  (`git checkout -- package.json package-lock.json`, suppression de
  `.expo/` racine), rien commité. Cause probable : résolution npx qui
  retombe sur le `package.json` racine quand une dépendance n'est pas
  jugée satisfaisante localement — à surveiller dans les prochains blocs,
  toujours vérifier `git status` à la racine après ces deux commandes.
- **Fait (2026-09-20, correctif bloc 3 — toggle Solo/Couple caché par
  défaut)** : Ange a remonté que le bascule Solo/Couple n'apparaissait
  qu'après avoir sélectionné une carte de formule, alors qu'elle le veut
  visible dès l'arrivée sur l'écran. Comportement exact confirmé par
  lecture du code : le bloc du toggle (`optionsBlock`, un seul toggle
  global, pas un par carte) était entièrement conditionné à
  `{selectedPlan ? (...) : null}` — absent du rendu tant qu'aucune carte
  n'était tapée, pas seulement replié/masqué visuellement. Corrigé en
  déplaçant ce bloc (inchangé sinon) juste après le titre, avant la liste
  des cartes, rendu sans condition — il apparaît donc au tout premier
  rendu de l'écran, et comme `isCouple` est un état global déjà partagé par
  toutes les cartes (corrigé dans le correctif précédent), basculer
  Solo/Couple change immédiatement le prix affiché sur toutes les cartes en
  même temps, sans avoir à en sélectionner une d'abord. Le champ téléphone
  partenaire reste conditionné à `isCouple` (comportement voulu, pas un
  bug). Vérifié par `tsc --noEmit` + `expo export --platform android` (841
  modules) ; `git status` racine vérifié propre après coup (pas de récidive
  de l'effet de bord précédent). En attente du retest d'Ange sur Samsung A56.
- **Fait (2026-09-20, blocs 5-7 — parcours paiement/modération complet)** :
  réalisés d'affilée sans validation manuelle intermédiaire, à la demande
  explicite d'Ange (un seul test complet prévu à la fin sur Samsung A56).
  Détail complet dans "Plan de construction mobile" ci-dessus. Résumé : Bloc
  5 upload de preuve (`expo-image-picker` installé, `UploadProofScreen`,
  bouton "J'ai payé" du bloc 4 câblé) ; Bloc 6 dashboard Client réel +
  écran de confirmation (`GET /subscriptions/me`, jours restants,
  `useFocusEffect`) ; Bloc 7 dashboard Modérateur réel (nouveau
  `ModeratorNavigator` à deux écrans, file + détail/validation/rejet,
  affichage de capture via blob authentifié → `data:` URI). **Aucune route
  backend nouvelle** : les 6 endpoints consommés existaient déjà et étaient
  déjà testés côté `souplesse-api` — vérifié en lisant directement le
  contrôleur/service/DTO source, pas seulement `architecture.md`. Décision
  UX prise en autonomie : "S'abonner" masqué aussi pour un abonnement
  PENDING (pas seulement Actif comme le fait la règle serveur) pour éviter
  d'empiler des demandes en double faute d'écran de reprise. Pas d'UI
  pause/reprise sur le dashboard (hors périmètre explicite du bloc 6).
  Aucun framework de test mobile n'existe (`mobile/package.json` n'a ni
  script `lint` ni `test`, cohérent avec spec.md section 28) — vérification
  `tsc --noEmit` (propre) + `expo export --platform android` (849 modules,
  build OK) après chaque étape, comme pour tous les blocs précédents ;
  `git status` racine vérifié propre après chaque commande (aucune récidive
  de l'effet de bord `package.json` déjà rencontré). Toujours pas de
  vérification visuelle possible depuis cet outil — en attente du test
  complet d'Ange (inscription → paiement → upload → validation modérateur →
  dashboard Client à jour).
- **Fait (2026-10-03, correctif bloc 5 — upload de preuve en échec)** : Ange
  a remonté l'erreur `Unsupported FormDataPart implementation` à l'envoi de
  la preuve. **Cause confirmée dans le source installé** : en SDK 57,
  `expo/src/winter/runtime.native.ts` remplace le `fetch` global par
  `expo/fetch`, dont l'encodeur multipart (`convertFormData.ts`) n'accepte
  que `string`, `Blob` ou un objet exposant `bytes()` — le descripteur RN
  historique `{ uri, name, type }` est explicitement refusé (leur propre test
  `convertFormData-test.native.ts` le vérifie). Ce n'était donc pas un souci de
  forme de l'objet : ce format n'est plus supporté du tout par le fetch par
  défaut. **Correctif** (méthode documentée sur la doc v57 d'`expo-file-system`,
  section "Uploading files using expo/fetch") : `formData.append('screenshot',
  new File(imageUri))` avec le `File` d'`expo-file-system`, qui expose `name`
  (avec extension) et `type` (MIME déduit de l'extension par `MimeTypeMap` sur
  Android, vérifié dans le source Kotlin, donc `image/jpeg|png|webp`, conforme
  au `fileFilter` de `souplesse-api`). Champs `imageName`/`imageMimeType`
  retirés de `SubmitProofInput`/`UploadProofScreen` (devenus inutiles).
  **Nouvelle dépendance signalée** : `expo-file-system ~57.0.7` ajoutée à
  `mobile/package.json` via `npx expo install` — c'était déjà une dépendance
  directe du paquet `expo` (déjà présente dans `node_modules` et déjà liée
  nativement), simplement remontée au premier niveau pour pouvoir l'importer ;
  aucun nouveau module natif. Alternative écartée : `EXPO_PUBLIC_USE_RN_FETCH=1`
  (rétablit le fetch RN pour toute l'app — portée trop large pour un seul
  écran). Vérifié : `tsc --noEmit` propre + `expo export --platform android`
  OK (export vers un dossier temporaire hors dépôt), `git status` racine
  propre. **À noter** : `mobile/package.json` contenait déjà avant cette
  session des modifications non commitées qui ne viennent pas de moi
  (`expo` `~57.0.9` → `^57.0.26`, `react-native` 0.86.2 → 0.86.3,
  `expo-image-picker`/`expo-secure-store` en patch) — incluses dans le même
  commit que ce correctif, à la demande explicite d'Ange (bump jugé cohérent
  et légitime). En attente du retest d'Ange sur Samsung A56.
- **Fait (2026-10-03, durcissement `POST /payments/proof` — `souplesse-api`)** :
  voir "Durcissement sécurité" dans la décision "Module Payments" ci-dessus
  (signature de fichier, nom/extension côté serveur, 5 Mo avant écriture,
  rate limit, `trust proxy`, remplacement de la preuve `PENDING` avec verrou
  de ligne, limite connue de la course avec le Modérateur). 69 tests
  unitaires, lint et build verts ; verrou vérifié en réel contre la base
  Neon de démo (requête bloquée observée dans `pg_stat_activity`, double
  appui → une seule preuve `PENDING`, données de test supprimées). Commits
  `souplesse-api@167b335` (4 correctifs upload), `@31361c9` (`trust proxy`),
  `@113461f` (remplacement de preuve), fusionnés en fast-forward dans `main`
  — **non poussés** (le déploiement Render suivra le push).
- **Fait (2026-10-03, nettoyage dépendances `mobile/`)** : `expo doctor`
  signalait `eas-cli` dans `dependencies` — retiré (`npm uninstall`) ; à
  utiliser via `npx eas-cli …` ou installé globalement (`npm install -g
  eas-cli`). Le paquet `g` (« Globalize module functions », sans rapport,
  importé nulle part), ajouté dans le même commit `a011755` — très
  probablement un `npm install g eas-cli` tapé au lieu de `npm install -g
  eas-cli` —, retiré aussi avec l'accord d'Ange. **Dépendance signalée** :
  `expo-dev-client ~57.0.19` (module natif, non listé jusqu'ici), ajouté
  par Ange hors session et inclus dans le même commit avec son accord —
  cohérent avec le profil `development` (`developmentClient: true`) d'
  `eas.json`. Lockfile : 360 paquets retirés (arbre d'`eas-cli`), 7 ajoutés
  (`expo-dev-client` et ses modules `expo-dev-launcher`/`-menu`/…), aucune
  version modifiée ; `npm install` relancé → « up to date », `npm ls --all`
  sans manquant/étranger. Vérifié : `tsc --noEmit`, `expo export --platform
  android` (bundle JS identique à avant), `expo-doctor` 21/21, `git status`
  racine propre.
- **Fait (2026-10-03, diagnostic `npm ci` en échec sur EAS Build —
  `Missing: typescript@5.9.3 from lock file`)** : **cause exacte** —
  `eas-cli@24.10.0`, alors en `dependencies`, tirait un arbre `@expo/*` de
  l'ère SDK 55, dont `@expo/require-utils@55.0.8` qui déclare une peer
  **optionnelle** `typescript: "^5.0.0 || ^5.0.0-0"`, incompatible avec le
  `typescript@6.0.3` du projet. Les deux npm traitent ce conflit
  différemment : **npm 12.2.0 (local)** tolère la peer optionnelle non
  satisfaite et n'écrit pas (ou supprime) d'entrée `typescript@5.9.3` dans le
  lockfile ; **npm 10.9.8 (image EAS SDK 57 `latest`, Node 22.23.1)** veut
  l'installer en imbriqué → `npm ci` compare emplacement par emplacement et
  échoue. Supprimer `node_modules` + lockfile ne pouvait rien changer : c'est
  toujours npm 12 qui régénérait. Reproduit à l'identique avec `npx npm@10.9.8
  ci` sur le lockfile de `a011755`, et sur celui de `f805ee8` après passage de
  npm 12 (+ `expo-dev-client`, l'état non commité de l'arbre de travail
  qu'EAS envoyait) — `f805ee8` brut, lui, passait. **Déjà corrigé par
  `77eacca`** (retrait d'`eas-cli`) : plus aucun conflit, seul déclarant
  restant `@expo/require-utils@57.0.5` (`^5 || ^6 || ^7`, optionnel).
  Vérifié sur `77eacca` dans des copies propres : `npm ci --include=dev`
  (scripts actifs) OK avec npm 10.9.8 **et** 12.2.0 (557 paquets,
  `typescript@6.0.3`, lockfile inchangé) ; réécriture du lockfile par npm 12
  → identique à l'octet ; par npm 10 → seuls 4 champs `libc` cosmétiques
  retirés (binaires optionnels `lightningcss`), `npm ci` croisé OK.
  **TypeScript non modifié** : le template officiel
  `expo-template-blank-typescript@sdk-57` (57.0.28) déclare lui-même
  `typescript ~6.0.3` — épingler 5.9.3 serait une régression. Garde-fou
  testé : `npx -y npm@10.9.8 ci --dry-run` dans `mobile/` détecte ce type
  d'écart en < 1 s sans téléchargement (exit 1 sur les anciens lockfiles,
  exit 0 sur `77eacca`) — ajouté ensuite, voir entrée suivante.
- **Fait (2026-10-03, garde-fou lockfile EAS — accord d'Ange)** : script
  `npm run check:lock` (`npx -y npm@10.9.8 ci --dry-run --no-audit
  --no-fund`) dans `mobile/package.json`, **à lancer avant chaque `eas
  build`**. Node épinglé à `22.23.1` dans `eas.json` via un profil `base`
  hérité (`extends`) par `development`/`preview`/`production` — `eas.json`
  n'a pas de champ `npm` (doc vérifiée), mais Node 22.23.1 embarque
  précisément npm 10.9.8 (vérifié sur `nodejs.org/dist/index.json`) : le npm
  d'EAS ne bougera donc plus avec l'image `latest`, et reste celui du
  script. **Si Node est un jour changé dans `eas.json`, mettre à jour la
  version npm du script en même temps.** Vérifié : `npm run check:lock` →
  exit 0 sur l'état actuel, exit 1 (`Missing: typescript@5.9.3`) sur
  l'ancien état défectueux reconstitué ; `eas config --profile preview`
  résout bien `"node": "22.23.1"`.
- **Fait (2026-10-03, `EXPO_PUBLIC_API_URL` pour les builds EAS — option (a)
  choisie par Ange)** : `mobile/.env` étant dans `.gitignore` (non envoyé à
  EAS) et aucune variable n'étant définie côté compte EAS, l'APK aurait
  planté au démarrage (`src/config/env.ts` lève une erreur si la variable
  manque). Ajouté `"env": { "EXPO_PUBLIC_API_URL":
  "https://souplesse-api.onrender.com" }` dans le profil `base` d'`eas.json`
  (valeur publique, embarquée en clair dans le bundle de toute façon).
  En local, `.env` reste utilisé tel quel (`expo start`). Vérifié : `eas
  config` → `development`/`preview`/`production` héritent tous de la
  variable ; simulation d'un build EAS (`EXPO_NO_DOTENV=1` + `expo export
  --platform android --clear`) → URL présente dans le bundle avec la
  variable, **absente sans** (confirme le plantage qui aurait eu lieu).

## Questions en attente

- **[Plus tard, non urgent] URL d'API par environnement (noté par Ange le
  2026-10-03)** : `EXPO_PUBLIC_API_URL` n'est définie que dans le profil
  `base` d'`eas.json` (Render, démo). Quand un vrai environnement de
  production séparé existera (VPS DigitalOcean), il faudra sans doute la
  **surcharger spécifiquement dans le profil `production`** plutôt que de
  la laisser uniquement dans `base`. À revoir à ce moment-là — rien à faire
  d'ici là.

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
- [ ] **5. Module Coaching** (si le temps le permet pour cette
      démo — sinon signaler comme non couvert plutôt que de le bâcler).
- [x] **6. Déployer `souplesse-api` sur Render.com** (offre gratuite). Fait par
      Ange le 2026-09-20, après correctif `render.yaml` (JWT_SECRET/
      JWT_REFRESH_SECRET, voir décision ci-dessus). URL :
      `https://souplesse-api.onrender.com`.
- [x] **7. Brancher l'app mobile** (`EXPO_PUBLIC_API_URL`) sur cette instance Render.
      Fait — voir "Plan de construction mobile" ci-dessous (blocs 1 à 7 tous faits ;
      Coaching hors périmètre, point 5 ci-dessus).
- [ ] **8. Générer l'APK** via `eas build --platform android --profile preview`.
- [ ] **9. Valider manuellement le parcours complet** sur un appareil Android réel
      avant de livrer l'APK.

## Plan de construction mobile (`mobile/`) — 2026-09-20

Le dossier `mobile/` était resté figé depuis la phase Authentification
d'avant le pivot (commits `94dd2a2`/`89df398`/`6166173`) : seuls Login/Register
existaient, contre l'ancien backend web. Audit complet fait le 2026-09-20 (voir
Historique). Plan de reconstruction défini par Ange, dans cet ordre strict
(chaque bloc dépend du précédent) :

- [x] **Bloc 1 — Rebranchement API** : `EXPO_PUBLIC_API_URL` →
      `https://souplesse-api.onrender.com` ; `AuthContext.restoreSession()`
      corrigé (`/auth/me` → `/users/me`, qui n'existe pas sur `souplesse-api`) ;
      gestion du refresh token ajoutée dans `api/client.ts` (absente
      auparavant) — `apiFetch()` rafraîchit automatiquement sur un 401 et
      rejoue la requête une fois ; si le refresh échoue aussi, les tokens sont
      effacés et l'appelant retombe sur son traitement d'erreur existant (ex.
      `restoreSession()` déconnecte proprement).
- [x] **Bloc 2 — Écran OTP (E04)** : `VerifyOtpScreen` (saisie code 6 chiffres,
      bouton "Renvoyer le code"). `RegisterScreen` redirige désormais vers cet
      écran (au lieu du message "vérifiez votre email", qui décrivait
      l'ancien flux web).
- [x] **Bloc 3 — Écran choix de formule (E06)** : `ChooseFormulaScreen`,
      `GET /subscriptions/plans`, sélection Solo/Couple (champ téléphone
      partenaire si Couple). Nouveau fichier `api/subscriptions.ts`.
- [x] **Bloc 4 — Écran instructions de paiement (E07)** : `PaymentInstructionsScreen`,
      affiche la formule/montant récapitulés + les 3 numéros Mobile Money.
      **Numéros PROVISOIRES** (`+229 00 00 00 01/02/03`) isolés dans
      `src/config/mobileMoneyNumbers.ts` — **seul ce fichier à modifier**
      quand Ange aura les vrais numéros. Le bouton "J'ai payé" n'est pas
      encore câblé (dépend de `UploadProofScreen`, bloc 5) — écran
      volontairement autonome/testable pour ce jalon.
- [x] **Bloc 5 — Écran upload de preuve (E08)** : `expo-image-picker` installé
      (`~57.0.19`, via `npx expo install` — résolution auto de la version
      compatible SDK 57 ; `mediaTypes: ['images']`, plus l'ancien enum
      `MediaTypeOptions` déprécié en SDK 57, vérifié sur la doc versionnée
      avant d'écrire le code comme demandé par `mobile/AGENTS.md`).
      `UploadProofScreen` : formulaire montant déclaré (préempli avec le
      montant attendu, modifiable)/téléphone émetteur/opérateur (sélecteur
      MTN/Moov/Celtiis) + sélection d'image (`quality: 0.7` — compression
      pour rester sous la limite serveur de 5 Mo et limiter la consommation
      data, spec.md section 23) ; upload multipart vers `POST /payments/proof`
      (nouveau fichier `api/payments.ts`, champs alignés sur `SubmitProofDto`
      côté `souplesse-api` : `subscriptionId`, `amountDeclared`, `senderPhone`,
      `operator`, fichier `screenshot`). Le bouton "J'ai payé" de
      `PaymentInstructionsScreen` (laissé non câblé au bloc 4) navigue
      maintenant vers cet écran. Après envoi réussi : `navigation.reset` vers
      `[ClientDashboard, PaymentStatus]` (index 1) — vide l'historique
      ChooseFormula/PaymentInstructions/UploadProof, dashboard reste en
      dessous pour que le retour matériel depuis PaymentStatus y atterrisse
      directement plutôt que de revenir dans un formulaire déjà soumis.
- [x] **Bloc 6 — Dashboard Client réel (E05) + écran statut (E09)** :
      `ClientDashboardScreen` réécrit — `GET /subscriptions/me` +
      `GET /subscriptions/plans` (jointure côté mobile pour le nom de
      formule, `getMine()` ne renvoie pas la relation `subscriptionPlan`),
      badge de statut (Actif/En attente/Expiré/Annulé), compteur de jours
      restants si Actif, refetch automatique à chaque focus de l'écran
      (`useFocusEffect`, confirmé exporté par `@react-navigation/native` avant
      de l'utiliser) — donc mise à jour au retour de n'importe quel écran du
      parcours paiement sans reload manuel. `PaymentStatusScreen` (E09) :
      écran de confirmation uniquement — `souplesse-api` n'expose aucune
      route pour qu'un client interroge le statut de sa propre preuve (seule
      la file du Modérateur existe), donc pas de suivi en direct possible,
      juste la confirmation d'envoi + retour au dashboard. **Décision UX prise
      en autonomie** : le bouton "S'abonner" est masqué non seulement si un
      abonnement est Actif (règle serveur réelle, `assertNotBlocked`) mais
      aussi s'il y a une demande PENDING — le serveur autorise en réalité
      plusieurs demandes PENDING simultanées (aucune règle métier ne l'en
      empêche), mais comme il n'existe aucun écran pour reprendre une demande
      PENDING précise, laisser retaper "S'abonner" empilerait des doublons
      dans la file du Modérateur. Pas de bouton pause/reprise sur le
      dashboard (hors périmètre du bloc tel que défini — `PATCH
      /subscriptions/:id/{pause,resume}` existe et est testé côté
      `souplesse-api` mais n'a pas d'UI mobile pour l'instant).
- [x] **Bloc 7 — Dashboard Modérateur réel (E10/E11)** : nouveau
      `ModeratorStackParamList`/`ModeratorNavigator` (le rôle MODERATOR avait
      un unique écran placeholder dans le stack générique — insuffisant pour
      un flux liste → détail). `ModeratorDashboardScreen` (E10) :
      `GET /payments/pending`, refetch au focus. `PaymentReviewScreen` (E11) :
      pas de route `GET /payments/:id` côté serveur (seules la liste et la
      capture existent), donc l'objet `PendingPaymentProof` complet est passé
      en paramètre de navigation depuis la liste plutôt que re-fetché par id.
      Affichage de la capture : `<Image>` RN n'envoie pas l'en-tête
      `Authorization` pour une uri distante — récupérée via `apiFetch` en
      `blob()` puis convertie en `data:` URI par `FileReader.readAsDataURL`
      (nouvelle fonction `fetchScreenshotDataUri` dans `api/payments.ts`).
      Boutons Valider (`PATCH /payments/:id/validate`) / Rejeter (motif
      obligatoire ≥ 3 caractères, aligné sur `RejectProofDto`,
      `PATCH /payments/:id/reject`) ; retour à la liste après décision, qui
      se rafraîchit au focus. Ajout mineur : avertissement non bloquant si le
      montant déclaré ne correspond à aucun tarif connu de la formule
      (inspiré de l'exemple de rejet du prototype validé
      `souplesse-prototype-paiement-v3.html`, "le montant ne correspond pas à
      la formule choisie") — purement informatif, ne bloque pas les boutons.

**Aucune route backend nouvelle nécessaire pour les blocs 5-7** : les six
endpoints utilisés (`POST /payments/proof`, `GET /payments/pending`,
`GET /payments/:id/screenshot`, `PATCH /payments/:id/validate`,
`PATCH /payments/:id/reject`, `GET /subscriptions/me`) existaient déjà et
étaient déjà testés côté `souplesse-api` (modules Payments/Subscriptions,
voir décisions plus haut) — vérifié en lisant directement le contrôleur/
service/DTO source avant d'écrire le code mobile, pas seulement `architecture.md`
(qui ne donne que la liste des routes, pas leur contrat exact). Ces trois
blocs sont donc purement frontend mobile.

**Vérification à chaque bloc** : `npx tsc --noEmit` (aucune erreur) +
`npx expo export --platform android` (le bundle Metro se construit sans
erreur — 841 modules après bloc 1-4, 849 après bloc 5-7 avec
`expo-image-picker`) après chaque bloc. **Aucun framework de test mobile
n'existe dans `mobile/`** (pas de config Jest, pas de script `lint`/`test`
dans `mobile/package.json`) — confirmé en vérifiant `package.json` avant de
conclure, cohérent avec `spec.md` section 28 ("Aucune stratégie de test
mobile formalisée à ce stade"). Ces deux vérifications de compilation restent
donc, comme pour tous les blocs précédents, le seul filet automatisé
disponible ; elles ne remplacent pas un test visuel sur device — je n'ai pas
d'accès à un téléphone/émulateur depuis cet outil.

**Blocs 5-7 réalisés d'affilée, sans validation manuelle intermédiaire**, à
la demande explicite d'Ange (un seul test complet de bout en bout prévu sur
Samsung A56 : inscription → paiement → upload → validation modérateur →
retour dashboard client à jour) — contrairement aux blocs 1-4 qui
attendaient une validation à chaque jalon.

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

- 2026-10-03 — Claude Code (VS Code) — `EXPO_PUBLIC_API_URL`
  (`https://souplesse-api.onrender.com`) ajoutée au profil `base` d'`eas.json`
  (option (a), choix d'Ange) — l'APK aurait sinon planté au démarrage
  (`.env` non envoyé à EAS). Vérifié via `eas config` (3 profils) et
  simulation de build sans `.env`. Point futur noté : surcharger la valeur
  dans `production` une fois le VPS de production en place.

- 2026-10-03 — Claude Code (VS Code) — Garde-fou lockfile EAS : script
  `check:lock` (`npm@10.9.8 ci --dry-run`) + Node épinglé `22.23.1` dans
  `eas.json` (profil `base`, embarque npm 10.9.8). Vérifié (exit 0 actuel,
  exit 1 sur l'ancien état, `eas config` OK). Signalé : `EXPO_PUBLIC_API_URL`
  n'atteint pas EAS (`.env` ignoré) → APK planterait au démarrage, en
  attente de décision.

- 2026-10-03 — Claude Code (VS Code) — Diagnostic `npm ci` EAS (`Missing:
  typescript@5.9.3`) : peer optionnelle `typescript ^5` de
  `@expo/require-utils@55.0.8` (arbre d'`eas-cli`) résolue différemment par
  npm 12.2.0 (local) et npm 10.9.8 (EAS). Reproduit, puis confirmé corrigé
  par `77eacca` : `npm ci` OK avec les deux npm sur des copies propres.
  TypeScript laissé en `~6.0.3` (valeur du template SDK 57). Garde-fou
  `npm@10.9.8 ci --dry-run` proposé, en attente.

- 2026-10-03 — Claude Code (VS Code) — `eas-cli` retiré des dépendances de
  `mobile/` (signalé par `expo doctor`, à utiliser via `npx`/global), paquet
  `g` ajouté par erreur retiré aussi, `expo-dev-client` (ajout d'Ange)
  inclus. Lockfile resynchronisé, `npm ls` propre, `tsc` + `expo export` +
  `expo-doctor` (21/21) verts.

- 2026-10-03 — Claude Code (VS Code) — Durcissement sécurité de
  `POST /payments/proof` (`souplesse-api`) : signature de fichier, extension
  déduite du contenu, upload en mémoire avant écriture, rate limit 5/min,
  `trust proxy` 1, remplacement de la preuve `PENDING` sous verrou de ligne
  (testé contre Neon démo). Course Modérateur/remplacement documentée comme
  limite connue acceptée. Commits `souplesse-api@167b335`, `@31361c9`,
  `@113461f` sur `main`, non poussés.

- 2026-10-03 — Claude Code (VS Code) — Correctif bloc 5 : upload de preuve en
  échec (`Unsupported FormDataPart implementation`). Cause : le `fetch` global
  SDK 57 est `expo/fetch`, qui refuse le descripteur RN `{ uri, name, type }`.
  Remplacé par `new File(uri)` d'`expo-file-system` (méthode documentée v57) ;
  `expo-file-system ~57.0.7` ajoutée à `mobile/package.json` (déjà dépendance
  du paquet `expo`, aucun nouveau module natif). Bump `expo` ^57.0.26 /
  `react-native` 0.86.3 / patches déjà présent dans l'arbre de travail inclus
  dans le même commit (demande d'Ange). `tsc --noEmit` + `expo export
  --platform android` verts, `git status` racine propre. En attente du retest
  sur Samsung A56.

- 2026-09-20 — Claude Code (VS Code) — Blocs 5-7 réalisés d'affilée (upload
  preuve, dashboard Client réel, dashboard Modérateur réel) sans validation
  manuelle intermédiaire, à la demande d'Ange. `expo-image-picker` installé.
  Nouveaux fichiers : `api/payments.ts`, `UploadProofScreen`,
  `PaymentStatusScreen`, `PaymentReviewScreen`, `ModeratorNavigator`.
  `ClientDashboardScreen`/`ModeratorDashboardScreen` réécrits (étaient des
  squelettes). Aucune route backend nouvelle (les 6 endpoints consommés
  existaient déjà et étaient déjà testés côté `souplesse-api`). `tsc
  --noEmit` + `expo export --platform android` verts (849 modules), `git
  status` racine vérifié propre après chaque commande. Handoff étape 7
  marquée faite. En attente du test complet d'Ange sur Samsung A56.
- 2026-09-20 — Claude Code (VS Code) — Correctif bloc 3 (`ChooseFormulaScreen`) :
  le toggle Solo/Couple n'apparaissait qu'après sélection d'une carte
  (bloc conditionné à `selectedPlan`, absent du rendu et non juste masqué).
  Déplacé au-dessus de la liste des cartes, rendu sans condition — visible
  dès le premier rendu, s'applique à toutes les cartes à la fois. `tsc
  --noEmit` + `expo export --platform android` verts, `git status` racine
  vérifié propre (pas de récidive de l'effet de bord package.json).
- 2026-09-20 — Claude Code (VS Code) — Correctifs bloc 3 (`ChooseFormulaScreen`)
  suite au test réel d'Ange sur Samsung A56 : prix de carte non réactif au
  toggle Solo/Couple corrigé (calcul par carte à partir de `isCouple`), et
  largeurs durcies en `width: '100%'`/flex explicite (ScrollView, cartes,
  toggle, input, bouton) au lieu du stretch implicite. `tsc --noEmit` +
  `expo export --platform android` verts. Effet de bord détecté et annulé :
  les commandes de vérification avaient modifié `package.json`/
  `package-lock.json` à la racine (garde-fou violé par inadvertance) —
  repéré via `git status`, annulé avant tout commit.
- 2026-09-20 — Claude Code (VS Code) — Root cause confirmée pour l'incident
  JWT_SECRET (Ange avait ajouté les variables à la main avant le déploiement
  manuel réussi — ce n'était pas un comportement différent entre auto-deploy
  et déploiement manuel). Garde-fou ajouté : `env-check.ts` fait échouer le
  démarrage avec un message clair listant les variables manquantes, avant
  même l'instanciation de Nest. Vérifié manuellement + 4 tests. Commit
  `souplesse-api@08686bb`, poussé.
- 2026-09-20 — Claude Code (VS Code) — Render.com déployé par Ange, résolu après
  correctif `render.yaml` (JWT_SECRET/JWT_REFRESH_SECRET jamais générés via
  `generateValue: true` sur un service existant → passage à `sync: false`).
  URL confirmée : `https://souplesse-api.onrender.com`. Audit complet de
  `mobile/` : figé depuis la phase Authentification pré-pivot, seuls
  Login/Register existent (contre l'ancien backend web), les 4 dashboards
  sont des squelettes vides, aucun écran OTP/formule/paiement/upload/
  modération n'existe. Ange a fourni un plan de reconstruction en 7 blocs
  ordonnés (voir "Plan de construction mobile"). Blocs 1 à 4 réalisés dans
  cette session : rebranchement API (`souplesse-api`, `/users/me`, refresh
  token), écran OTP, écran choix de formule (solo/couple), écran instructions
  de paiement (numéros provisoires isolés dans `mobileMoneyNumbers.ts`).
  Vérifié par `tsc --noEmit` + `expo export` (aucun accès device/émulateur
  depuis cet outil — vérification visuelle sur Expo Go laissée à Ange, comme
  demandé pour ce jalon). En attente de son retour avant blocs 5-7.
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
  toute production réelle.
- 2026-09-20 — Claude Code (VS Code) — Validation genre opposé ajoutée pour
  l'abonnement Couple (réplique exacte du Bloc L web, demande explicite
  d'Ange), 51 tests au total. Déploiement Render.com préparé à 100% côté
  code (`render.yaml`, migration au démarrage, bug CORS `origin: ['*']`
  trouvé et corrigé, Node épinglé en 22) — commit `souplesse-api@9d22525`,
  poussé. **Exécution bloquée** : aucun accès Render/Neon (CLI/API) depuis
  cet outil, même contrainte que pour la vérification PITR Neon du
  2026-08-02. Checklist précise laissée à Ange dans STATUS.md et le README
  de `souplesse-api` : créer un nouveau projet Neon (jamais celui du web) et
  déployer via Render Blueprint. En attente de l'URL publique avant de
  pouvoir avancer sur les étapes 7 (branchement mobile) et 8 (build EAS).
- 2026-09-20 — Claude Code (VS Code) — Ange a déployé sur Render mais
  `JWT_SECRET` n'a jamais été généré (crash au démarrage) — seules les 2
  variables DB étaient présentes. Audit complet des variables requises au
  démarrage (`getOrThrow`/`process.env`) : 4 requises au total, toutes déjà
  déclarées dans `render.yaml` — le bug venait de `generateValue: true`,
  fiable seulement à la création initiale du service, pas sur un service
  déjà existant. Remplacé par `sync: false` pour les 2 secrets JWT. Commit
  `souplesse-api@110f544`, poussé. Section "Dépannage" ajoutée au README.
  Reste à faire par Ange : ajouter `JWT_SECRET`/`JWT_REFRESH_SECRET`
  directement dans l'onglet Environment du service Render existant.
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
