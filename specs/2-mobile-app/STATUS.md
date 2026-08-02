# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

Authentification câblée (login/register/logout, navigation par rôle).
Investigation terminée sur la vérification post-inscription : **le serveur
ne vérifie que par email aujourd'hui, aucune vérification SMS n'existe dans
le code** — voir "Contrat de vérification SMS". Décision à trancher par Ange
avant toute implémentation.

## Décisions actées (ne pas rouvrir sans le dire explicitement)

- App mobile **autonome**, pas un wrapper du site web.
- **Aucun paiement in-app** : l'app valide une preuve (capture d'écran) d'un paiement
  Mobile Money (MTN, Moov, Celtiis) fait hors app. Voir `specs/2-mobile-app/cahier-des-charges.md`.
- Durées d'abonnement : 1, 2, 3, 6, 12 mois.
- Notifications : SMS **et** push, envoyées en parallèle à chaque décision de modération.
- 4 rôles / 4 dashboards distincts : **Client, Coach, Modérateur, Admin**
  (Modérateur = validation des preuves ; Admin = administration générale — ce sont
  deux rôles séparés, contrairement à l'app web actuelle qui n'a que CLIENT/COACH/ADMIN).
- Priorité de publication : **Google Play d'abord**. Apple App Store = phase 2,
  prévu dès le départ dans l'architecture (React Native/Expo, pas de code natif
  spécifique à une seule plateforme) pour ne pas devoir réécrire plus tard.
- Stack : React Native + Expo, backend = extension de l'API Nitro/Prisma existante.
- **Monorepo** : le projet React Native vit dans `mobile/` à la racine de ce même
  dépôt (`souplesse-speckit`), pas dans un dépôt séparé.
- Identité visuelle validée : couleur de marque `#EAB308` (celle du site), thème
  sombre, typographies Manrope (titres) + Inter (texte).
- **Authentification mobile** : réutilise telle quelle l'API JWT existante
  (`/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`,
  `/api/auth/logout`, `/api/auth/me`) — aucune nouvelle route d'auth à créer,
  aucune modification du schéma serveur.
- **Stockage des tokens sur l'appareil** : `expo-secure-store`.
- **URL de base de l'API** : `https://souplessefitness.com/api` en production,
  configurable via `EXPO_PUBLIC_API_URL`. `mobile/.env` ignoré via le
  `.gitignore` **racine**.
- **Routage par rôle après connexion** : `CLIENT` → `ClientDashboardScreen`,
  `COACH` → `CoachDashboardScreen`, `MODERATOR` → `ModeratorDashboardScreen`,
  `ADMIN` → `AdminDashboardScreen`.
- **Champs du formulaire d'inscription** : Prénom, Nom, Email, Téléphone,
  Genre (sélecteur Homme/Femme, obligatoire), Mot de passe, Confirmer —
  alignés sur `server/validators/auth.schemas.ts`
  (`firstName`/`lastName`/`gender`/`confirmPassword`).
- **Vérification post-inscription : par SMS/téléphone, PAS par email.**
  Correction actée le 2026-08-02 après signalement d'Ange — le message
  "vérifiez votre email" actuellement affiché sur `RegisterScreen` est
  erroné et doit être corrigé. Le contrat exact (endpoint(s) d'envoi/validation
  du code OTP) reste à documenter précisément depuis le code serveur avant
  toute implémentation (voir "Prochaine étape").

## Fichiers de référence

- `specs/2-mobile-app/cahier-des-charges.md` — cahier des charges complet (v2)
- `specs/2-mobile-app/prototypes/` — prototypes HTML cliquables (paiement, auth, dashboards)
- `CLAUDE.md` (racine) — instructions permanentes pour Claude Code

## Dernière session

- **Date/surface** : Claude Code (VS Code) — 2026-08-02 (session
  investigation, étapes 1-2 "Correction : vérification par SMS").
- **Fait** : recherche exhaustive dans `server/` (routes `auth/`,
  `auth.service.ts`, `auth.schemas.ts`, `schema.prisma`, grep insensible à la
  casse sur otp/sms/verif/code/twilio/vonage/africastalking/nexmo dans tout
  le dépôt). **Résultat : aucune vérification par SMS/téléphone n'existe
  dans le code serveur** — le mécanisme réel est entièrement email
  (`emailVerified`, `verify-email.get.ts`, `resend-verification.post.ts`,
  blocage HTTP 403 au login si non vérifié). La seule mention de "SMS" dans
  le dépôt concerne les notifications de décision de modération de preuve de
  paiement (fonctionnalité mobile pas encore implémentée), pas la
  vérification de compte. Détail complet dans "Contrat de vérification SMS".
  **Aucun fichier de code modifié** (ni `RegisterScreen.tsx`, ni aucun
  autre) — investigation et documentation uniquement, conformément à la
  consigne.
- **Pas encore fait** : la décision (garder l'email, migrer vers SMS,
  combiner les deux) n'est pas tranchée — voir "Conclusion" dans "Contrat de
  vérification SMS". Rien à implémenter tant que ce n'est pas fait. Le diff
  de la session précédente (`89df398..6166173`) n'a toujours pas été vérifié
  par Ange.

## Prochaine étape — Correction : vérification par SMS

> Ne pas deviner le contrat de vérification. L'objectif de cette étape est
> uniquement d'**investiguer et documenter**, pas d'implémenter l'écran de
> saisie du code — l'implémentation sera une checklist séparée, une fois le
> contrat confirmé avec Ange.

- [x] **1.** Chercher dans le code serveur tout ce qui concerne la
      vérification par téléphone/SMS après inscription. Points de départ
      suggérés (à confirmer/corriger en explorant réellement le code, ne pas
      se limiter à cette liste) :
      - `server/api/auth/` (lister tous les fichiers du dossier)
      - `server/services/auth.service.ts`
      - `server/validators/auth.schemas.ts`
      - toute référence à "otp", "sms", "verify", "code" dans `server/`
- [x] **2.** Pour chaque route trouvée liée à la vérification, documenter
      dans ce fichier (nouvelle sous-section "Contrat de vérification SMS",
      juste en dessous de cette checklist) :
      - la méthode et le chemin exact de la route
      - le payload attendu (champs, types)
      - la réponse en cas de succès / échec
      - à quel moment elle est déclenchée (automatiquement après
        `POST /api/auth/register` ? ou faut-il un appel explicite ?)
      - si le compte est utilisable (login possible) avant vérification, ou
        si la vérification est strictement bloquante
- [x] **3. ARRÊT.** Ne pas modifier `RegisterScreen.tsx` ni créer d'écran de
      saisie de code dans cette session. Une fois le contrat documenté,
      committer uniquement la documentation
      (`git add specs/2-mobile-app/STATUS.md && git commit -m "docs: document SMS verification contract"`)
      et attendre la prochaine checklist validée par Ange.
      **→ Fait. Voir "Contrat de vérification SMS" ci-dessous — aucun code
      modifié.**

## Contrat de vérification SMS

**⚠️ Résultat de l'investigation : aucune vérification par SMS/téléphone
n'existe dans le code serveur actuel.** Le mécanisme de vérification de
compte réellement implémenté est **entièrement basé sur l'email**, pas sur
le téléphone. Détail ci-dessous.

### Ce qui a été cherché

- Tous les fichiers de `server/api/auth/` : `avatar.post.ts`,
  `login.post.ts`, `logout.post.ts`, `me.get.ts`, `me.patch.ts`,
  `password.patch.ts`, `refresh.post.ts`, `register.post.ts`,
  `resend-verification.post.ts`, `session.get.ts`, `verify-email.get.ts`.
- `server/services/auth.service.ts` (register/login/verifyEmail/
  resendVerification/getProfile/updateProfile).
- `server/validators/auth.schemas.ts` (tous les schémas Zod du module auth).
- `prisma/schema.prisma` — modèle `User`.
- Recherche texte insensible à la casse dans `server/` pour : `otp`, `sms`,
  `verif*`, `code`, `phoneVerif*`, `verificationCode`, `twilio`, `vonage`,
  `africastalking`, `nexmo`.

### Ce qui existe réellement

- **Champs Prisma** (`prisma/schema.prisma`, modèle `User`) :
  `emailVerified: Boolean @default(false)`,
  `emailVerificationToken: String? @unique`,
  `emailVerificationTokenCreatedAt: DateTime?`. **Aucun champ**
  `phoneVerified`, `phoneVerificationCode`, `smsCode` ou équivalent n'existe
  dans le schéma.
- **`GET /api/auth/verify-email?token=<hex-token>`**
  (`server/api/auth/verify-email.get.ts`) :
  - Payload : query param `token` (string, hex 64 caractères généré par
    `crypto.randomBytes(32).toString('hex')` à l'inscription).
  - Succès : `{ success: true, email, message: 'Adresse email vérifiée avec succès.' }`.
  - Échec (token manquant) : `{ success: false, message: 'Token de vérification manquant.' }`
    (pas de code HTTP d'erreur levé dans ce cas précis — à vérifier si ça
    compte pour l'app mobile). Token invalide/déjà consommé → HTTP 404
    (`authService.verifyEmail`, via `createError`).
  - Déclenchement : le lien contenant ce token est envoyé **par email**
    (`sendVerificationEmail`, `server/utils/email.ts`) automatiquement à la
    fin de `authService.register()` — pas d'appel explicite requis côté
    client pour l'envoi initial.
  - Le commentaire du fichier confirme explicitement : *"should be delivered
    to the user via email (email provider integration required for
    production)"*.
- **`POST /api/auth/resend-verification`**
  (`server/api/auth/resend-verification.post.ts`) : body `{ email: string }`,
  renvoie un nouveau lien de vérification par email. Réponse toujours
  `{ success: true, message: '...' }` que l'email existe ou non (anti
  énumération). Rate-limit : 3/min/IP.
- **Blocage réel avant vérification** : `authService.login()`
  (`server/services/auth.service.ts:119-133`) lève une erreur `403` si
  `user.emailVerified === false`, avec le message *"Veuillez vérifier votre
  adresse email avant de vous connecter."* → la vérification est
  **strictement bloquante pour le login**, mais c'est l'email qui est
  vérifié, pas le téléphone.
- **Le champ `phone`** (`findByPhone` dans `user.repository.ts`) n'est
  utilisé que pour une **vérification d'unicité** à l'inscription (rejet
  HTTP 409 si le numéro est déjà pris) — aucune route ne l'utilise pour
  envoyer ou valider un code.
- **La seule mention de "SMS" dans tout le dépôt** (hors ce fichier et le
  cahier des charges lui-même) est dans
  `specs/2-mobile-app/cahier-des-charges.md`, et elle concerne un sujet
  **différent** : la notification **SMS + push envoyée au client par le
  Modérateur** lors de la validation/rejet d'une **preuve de paiement**
  (section 3.1 point 5, section 3.3, section 5.1) — pas la vérification du
  compte à l'inscription. Cette fonctionnalité n'est pas encore implémentée
  côté serveur (pas de passerelle SMS intégrée, pas de route
  `/api/notifications/*` — voir cahier des charges section 5.3).

### Conclusion (pour trancher avec Ange, ne rien implémenter avant)

- Si l'app mobile doit vraiment vérifier le compte par SMS/téléphone (plutôt
  que par email comme le fait le serveur aujourd'hui), c'est un **changement
  de contrat côté serveur** (nouveau champ Prisma, nouvelle route d'envoi de
  code, nouvelle route de validation de code, intégration d'une passerelle
  SMS) — pas juste un texte à corriger sur `RegisterScreen`. Conformément aux
  garde-fous (CLAUDE.md), je ne modifie pas le schéma/serveur sans validation
  explicite.
- Alternative : garder la vérification par email côté serveur (déjà
  fonctionnelle, testée) et corriger uniquement le **texte** affiché sur
  `RegisterScreen` mobile pour qu'il soit exact ("vérifiez votre email" est
  en fait déjà correct par rapport à ce qui existe réellement — c'est
  l'affirmation "vérification par SMS" qui ne correspond à aucun code
  existant).
- Une troisième option existe si le besoin réel est différent de ces deux cas
  (ex. vérification par SMS en plus de l'email, migration complète de
  l'email vers le SMS, etc.) — à préciser par Ange.

**Ce fichier ne tranche rien lui-même** : la prochaine checklist devra
indiquer explicitement laquelle de ces options (ou une autre) est retenue
avant toute implémentation.

## Historique (ajouter une entrée par session, la plus récente en haut)

- 2026-08-02 — Claude Code (VS Code) — Investigation vérification SMS
  (étapes 1-2) : aucune vérification par SMS/téléphone trouvée dans le code
  serveur, mécanisme réel = email uniquement. Documenté dans "Contrat de
  vérification SMS", aucun code modifié. En attente de décision d'Ange.
- 2026-08-02 — chat — Erreur identifiée : vérification par SMS/téléphone, pas
  par email. Nouvelle étape d'investigation ajoutée avant toute correction de
  code.
- 2026-08-02 — Claude Code (VS Code) — Phase Authentification, étapes 5-9
  terminées (auth.ts, AuthContext, RootNavigator, écrans branchés, App.tsx).
  Commit `6166173`.
- 2026-08-02 — chat — Q1 tranchée (champs `RegisterScreen` alignés sur le
  vrai schéma serveur).
- 2026-08-02 — Claude Code (VS Code) — Phase Authentification, étapes 1-4.
  Arrêt à l'étape 5 (Q1).
- 2026-08-02 — Claude Code (VS Code) — Scaffold Expo initialisé ; commit
  `94dd2a2`. Dépôt nettoyé séparément.
- 2026-08-01 — chat + Claude Code — Docs et prototypes poussés sur
  `feat/mobile-app`.
- 2026-08-01 — chat — Maquettes validées (paiement, auth, 4 dashboards).