# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

Authentification mobile câblée (login/register/logout, navigation par rôle).
Proposition écrite du mécanisme SMS/OTP (schéma Prisma, routes, passerelle)
terminée et documentée ci-dessous — **rien n'est implémenté**, en attente de
validation d'Ange avant toute exécution (migration Prisma, création de
routes).

## Décisions actées (ne pas rouvrir sans le dire explicitement)

- App mobile **autonome**, pas un wrapper du site web.
- **Aucun paiement in-app** : l'app valide une preuve (capture d'écran) d'un paiement
  Mobile Money (MTN, Moov, Celtiis) fait hors app. Voir `specs/2-mobile-app/cahier-des-charges.md`.
- Durées d'abonnement : 1, 2, 3, 6, 12 mois.
- Notifications (modération des paiements) : SMS **et** push, envoyées en
  parallèle à chaque décision de modération.
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
  Genre (Homme/Femme, obligatoire), Mot de passe, Confirmer — **identiques
  sur web et mobile, aucun champ retiré nulle part.**
- **Vérification de compte — décision finale confirmée (2026-08-02)** :
  - Email et téléphone restent tous deux collectés à l'inscription, sur web
    **et** sur mobile — inchangé.
  - Le mécanisme email existant reste **inchangé pour le web**
    (`emailVerified`, `GET /api/auth/verify-email`, login web bloqué en 403
    tant que non vérifié) — on n'y touche pas, on ne retire rien.
  - Pour les comptes créés **depuis l'app mobile**, on **ajoute** une
    vérification bloquante par **SMS/OTP** : le login mobile est bloqué tant
    que le téléphone n'est pas vérifié, indépendamment de l'état de
    `emailVerified`.
  - Conséquence structurelle : le serveur doit pouvoir distinguer un compte
    créé via le web d'un compte créé via le mobile, pour savoir quelle
    condition de blocage appliquer au login (probable champ
    `registeredVia: WEB | MOBILE` sur `User` — à confirmer dans la
    proposition ci-dessous, pas à décider unilatéralement par Claude Code).

## Fichiers de référence

- `specs/2-mobile-app/cahier-des-charges.md` — cahier des charges complet (v2)
- `specs/2-mobile-app/prototypes/` — prototypes HTML cliquables
- `CLAUDE.md` (racine) — instructions permanentes pour Claude Code

## Dernière session

- **Date/surface** : Claude Code (VS Code) — 2026-08-02 (proposition
  mécanisme SMS/OTP, étapes 1-3)
- **Fait** : proposition écrite complète dans la nouvelle section
  "Proposition — mécanisme SMS/OTP" :
  1. Schéma Prisma (enum `RegisteredVia`, champs `registeredVia`,
     `phoneVerified`, `phoneVerificationCodeHash`,
     `phoneVerificationCodeCreatedAt`, `phoneVerificationAttempts`,
     `phoneVerificationLockedUntil` sur `User`) — texte uniquement,
     `schema.prisma` non modifié.
  2. Nouvelles routes `POST /api/auth/phone/send-code` et
     `POST /api/auth/phone/verify-code`, point d'insertion identifié dans
     `authService.register()` (déclenchement SMS si `platform: 'MOBILE'`) et
     dans `authService.login()` (blocage `phoneVerified` additionnel pour
     les comptes mobile uniquement) — décrits en texte, aucun fichier créé
     ou modifié.
  3. Passerelle SMS recommandée : **Africa's Talking** (réutilisable pour
     les futures notifications de modération de paiement, meilleure
     couverture MTN/Moov Bénin que Vonage).
  - Aucune commande `prisma migrate`, aucune création/modification de fichier
    de code — uniquement `STATUS.md`.
- **Pas encore fait** : rien n'est implémenté côté SMS — tout reste à
  valider par Ange avant exécution. Le diff `89df398..6166173` de la phase
  authentification reste également à vérifier par Ange (en attente depuis
  plusieurs sessions).

## Garde-fou supplémentaire pour cette phase (production, base de données)

> Cette phase touche pour la première fois le **schéma de base de données en
> production**, pas seulement du code mobile. Le niveau de prudence monte en
> conséquence :

- **Ne jamais exécuter `prisma migrate dev` ou `prisma migrate deploy`** dans
  cette session. La checklist ci-dessous s'arrête à la *proposition* du
  schéma et des routes, pas à leur exécution.
- Ne pas modifier les routes `server/api/auth/*` existantes (email) —
  uniquement ajouter de nouvelles routes dédiées au SMS, en parallèle.
- Ne pas modifier `server/api/auth/register.post.ts` pour changer son
  comportement email — seulement identifier où/comment y ajouter, à terme,
  le déclenchement de l'envoi du SMS pour les comptes mobile (proposition
  écrite uniquement à ce stade, pas d'implémentation).

## Prochaine étape — Proposer (ne pas exécuter) le mécanisme SMS/OTP

- [ ] **1.** Proposer, sous forme de diff textuel dans une nouvelle
      sous-section "Proposition — schéma Prisma SMS" de ce fichier (pas
      encore dans `schema.prisma` lui-même), les champs à ajouter :
      - sur le modèle `User` (ou un modèle séparé `PhoneVerification` lié à
        `User` — proposer les deux options et recommander laquelle) : un
        champ distinguant l'origine du compte (ex. `registeredVia: WEB |
        MOBILE`), un booléen de vérification téléphone (ex.
        `phoneVerified`), un code OTP, une date d'expiration, un compteur de
        tentatives.
      - proposer les noms exacts des champs et leurs types Prisma, pas
        seulement le principe.
- [ ] **2.** Proposer les nouvelles routes (méthode, chemin, payload,
      réponse) :
      - une route d'envoi du code OTP (à déclencher après
        `POST /api/auth/register` uniquement si le compte est mobile —
        proposer comment le client mobile signale cette origine à l'appel
        d'inscription, ex. un champ `platform` dans le payload)
      - une route de vérification du code OTP
      - la modification exacte (mais non appliquée) qu'il faudrait apporter
        à la logique du login pour bloquer les comptes mobile non vérifiés
        par téléphone, sans toucher au comportement des comptes web
- [ ] **3.** Indiquer quelle passerelle SMS serait utilisée (réutiliser celle
      déjà prévue pour les notifications de paiement — cahier des charges
      §5.1 — ou une autre ; dire laquelle et pourquoi).
- [x] **4. ARRÊT.** Ne pas modifier `schema.prisma`, ne pas exécuter de
      migration, ne pas créer les routes. Committer uniquement la
      proposition écrite dans `STATUS.md` et attendre la validation d'Ange
      avant toute exécution.
      **→ Fait. Voir "Proposition — mécanisme SMS/OTP" ci-dessous —
      `schema.prisma` non touché, aucune commande `prisma migrate`
      exécutée, aucune route créée.**

## Proposition — mécanisme SMS/OTP (écrite uniquement, rien d'exécuté)

> Convention suivie : réutiliser exactement les patterns déjà en place dans
> le dépôt pour la vérification email (`emailVerified` /
> `emailVerificationToken` / `emailVerificationTokenCreatedAt` sur `User`,
> `crypto.randomBytes` pour les tokens, `loginAttempts`/`lockedUntil` pour le
> lockout de compte T0217, `rateLimitMiddleware` pour les routes sensibles),
> plutôt que d'inventer un style différent.

### 1. Proposition — schéma Prisma SMS (texte, pas appliqué à `schema.prisma`)

**Nouvel enum** (à ajouter dans la section "Enums" de `schema.prisma`,
au même niveau que `enum Gender`) :

```prisma
enum RegisteredVia {
  WEB
  MOBILE
}
```

**Nouveaux champs sur le modèle `User`** (à ajouter dans la section
"Security fields", juste après le bloc `emailVerified` existant) :

```prisma
// Origin + SMS/OTP verification (mobile accounts only)
registeredVia                   RegisteredVia @default(WEB)
phoneVerified                   Boolean       @default(false)
phoneVerificationCodeHash       String?
phoneVerificationCodeCreatedAt  DateTime?     // TTL anchor — 10 min
phoneVerificationAttempts       Int           @default(0)
phoneVerificationLockedUntil    DateTime?
```

- `registeredVia` : `@default(WEB)` — les comptes existants (migration)
  deviennent tous `WEB` sans casser le login actuel ; seuls les nouveaux
  comptes créés depuis l'app mobile passeront `MOBILE` explicitement.
- `phoneVerified` : miroir exact de `emailVerified`, mais ne concerne que les
  comptes `registeredVia = MOBILE` (voir modification du login, section 2).
- `phoneVerificationCodeHash` : **recommandation — stocker le code haché**
  (`bcrypt`, déjà une dépendance du projet via `passwordHash`), pas en clair
  comme `emailVerificationToken`. Différence de contexte : le token email
  fait 64 caractères hex (non devinable par force brute), alors qu'un OTP
  SMS classique fait 4 à 6 chiffres — bien plus exposé si la base fuite.
  Alternative plus simple (comme l'email, en clair) possible si Ange préfère
  la cohérence stricte avec le pattern existant plutôt que le hachage —
  **à trancher par Ange**, les deux options sont documentées ici, aucune
  n'est implémentée.
- `phoneVerificationCodeCreatedAt` : TTL recommandé **10 minutes** (à
  comparer aux 24h du token email — un OTP SMS doit être saisi presque
  immédiatement, contrairement à un lien email qu'on peut ouvrir plus tard).
- `phoneVerificationAttempts` / `phoneVerificationLockedUntil` : même
  mécanique que `loginAttempts`/`lockedUntil` (T0217) — proposition :
  verrouillage après 5 tentatives échouées, 15 minutes de blocage, mêmes
  constantes que `MAX_LOGIN_ATTEMPTS`/`LOCKOUT_DURATION_MS` dans
  `auth.service.ts` pour rester cohérent.

**Option alternative non recommandée mais documentée** : un modèle séparé
`PhoneVerification` (1-1 avec `User`) au lieu de champs inline. Écartée ici
par cohérence avec le pattern `emailVerified*` déjà inline sur `User` — ne
vaudrait le coup que si un historique multi-tentatives (plusieurs lignes) ou
un futur changement de numéro post-vérification était nécessaire, ce qui
n'est pas demandé actuellement.

### 2. Proposition — nouvelles routes SMS/OTP (texte, aucun fichier créé)

**a. `server/validators/auth.schemas.ts` — champ à ajouter à `registerSchema`**
(texte seulement, fichier non modifié) :

```ts
platform: z.enum(['WEB', 'MOBILE']).optional().default('WEB'),
```

C'est ainsi que le client mobile signale son origine à l'inscription — la
mutation minimale du payload existant (`RegisterInput`), sans renommer les
champs déjà en place. `mobile/src/api/auth.ts` (`RegisterInput`, `register()`)
devrait alors envoyer `platform: 'MOBILE'` — **non fait dans cette session**
(interdiction de créer/modifier du code ici).

**b. `server/services/auth.service.ts` — point d'insertion identifié dans
`register()`, non implémenté** :
juste après la ligne `void sendVerificationEmail(user.email, emailVerificationToken)`
(actuellement ligne 87), on ajouterait un bloc conditionnel :

```ts
if (input.platform === 'MOBILE') {
  const phoneCode = generateOtpCode() // ex. 6 chiffres aléatoires
  const phoneVerificationCodeHash = await bcrypt.hash(phoneCode, BCRYPT_ROUNDS)
  await userRepository.update(user.id, {
    registeredVia: 'MOBILE',
    phoneVerificationCodeHash,
    phoneVerificationCodeCreatedAt: new Date(),
  })
  void sendVerificationSms(user.phone, phoneCode) // non-bloquant, même pattern que l'email
}
```

Ceci répond au garde-fou "ne pas modifier `register.post.ts`" : la
modification se ferait dans `auth.service.ts` (le handler de route
`register.post.ts` lui-même n'a pas besoin de changer, il délègue déjà tout
à `authService.register()`).

**c. Nouvelle route `POST /api/auth/phone/send-code`**
(`server/api/auth/phone/send-code.post.ts` — dossier `phone/` nouveau, même
convention de nesting que `server/api/admin/subscriptions/`) :
- Payload : `{ phone: string }`.
- Comportement : régénère un nouveau code (réinitialise aussi
  `phoneVerificationAttempts`), renvoie systématiquement
  `{ success: true, message: '...' }` que le numéro existe ou non côté
  compte mobile (anti-énumération, même logique que
  `resend-verification.post.ts`).
- Rate-limit proposé : 3 requêtes / 10 min / IP+numéro (plus large que les
  3/min de `resend-verif` car un SMS coûte de l'argent — limite plus stricte
  justifiée).
- Usage : appelée automatiquement en interne par `authService.register()`
  (2.b ci-dessus) pour l'envoi initial, **et** exposée en HTTP pour un
  "renvoyer le code" côté app mobile.

**d. Nouvelle route `POST /api/auth/phone/verify-code`**
(`server/api/auth/phone/verify-code.post.ts`) :
- Payload : `{ phone: string, code: string }`.
- Comportement : vérifie `bcrypt.compare(code, phoneVerificationCodeHash)` et
  le TTL (10 min) ; incrémente `phoneVerificationAttempts` en cas d'échec,
  verrouille (`phoneVerificationLockedUntil`) après 5 échecs (même
  constantes que le lockout de login) ; en cas de succès, met
  `phoneVerified = true` et efface le code/les compteurs.
- Réponse succès : `{ success: true }`. Réponse échec : HTTP 401 (code
  invalide) ou HTTP 423 (verrouillé), même style que `login()` actuel.
- **Ne délivre pas de tokens** — symétrique avec `register()` qui n'en émet
  pas non plus : l'utilisateur mobile doit ensuite appeler `login()`
  normalement une fois vérifié, exactement comme le flux email actuel.

**e. Modification (texte, non appliquée) de `authService.login()`** —
`server/services/auth.service.ts`, juste après le bloc existant qui vérifie
`user.emailVerified` (lignes ~128-133), sans y toucher :

```ts
if (user.registeredVia === 'MOBILE' && !user.phoneVerified) {
  throw createError({
    statusCode: 403,
    message: 'Veuillez vérifier votre numéro de téléphone avant de vous connecter.',
  })
}
```

Comportement résultant : les comptes `WEB` ne voient **aucun changement**
(seul `emailVerified` compte, comme aujourd'hui) ; les comptes `MOBILE`
doivent satisfaire **les deux** conditions (`emailVerified` **et**
`phoneVerified`) avant de pouvoir se connecter — conforme à la décision
actée ("email inchangé pour le web ... SMS bloquant ajouté pour le mobile").

### 3. Proposition — passerelle SMS

Le cahier des charges (§5.1) liste trois options sans trancher : **Africa's
Talking**, **Vonage**, ou un fournisseur SMS local béninois — la même
passerelle est de toute façon prévue pour une fonctionnalité distincte et
pas encore construite : les notifications SMS+push envoyées par le
Modérateur lors de la validation/rejet d'une preuve de paiement (§3.3, §5.1).

**Recommandation : Africa's Talking**, pour cette vérification OTP **et**
en réutilisation future pour les notifications de modération — une seule
intégration, un seul jeu de identifiants API, un seul point de supervision
des coûts/livraison, au lieu de deux passerelles distinctes à maintenir.
Africa's Talking est la plateforme SMS/USSD pan-africaine la plus utilisée
sur les corridors MTN/Moov en Afrique de l'Ouest francophone (dont le
Bénin), ce qui en fait le choix le plus sûr pour la délivrabilité locale par
rapport à Vonage (plus généraliste/international, routes africaines moins
directes).

**Ce qui reste à faire avant toute exécution, quoi qu'il soit décidé** :
créer un compte chez le fournisseur retenu, obtenir des identifiants API, et
les ajouter aux variables d'environnement serveur (aucune n'existe encore
pour un fournisseur SMS — à créer, ex. `SMS_GATEWAY_API_KEY`,
`SMS_GATEWAY_SENDER_ID` — noms exacts à confirmer avec Ange, non ajoutés au
`.env` dans cette session). Ceci correspond au prérequis déjà identifié dans
le cahier des charges §12 ("Compte auprès d'une passerelle SMS").

**Rien de ce qui précède n'a été exécuté** : `schema.prisma` est inchangé,
aucune commande `prisma migrate` n'a été lancée, aucun fichier de route n'a
été créé, `register.post.ts` et `login()` n'ont pas été modifiés. En attente
de la validation d'Ange sur cette proposition avant toute implémentation.

## Historique (ajouter une entrée par session, la plus récente en haut)

- 2026-08-02 — Claude Code (VS Code) — Proposition écrite du mécanisme
  SMS/OTP (schéma Prisma, routes send-code/verify-code, passerelle Africa's
  Talking recommandée). Rien exécuté (pas de migration, pas de route créée).
  En attente de validation d'Ange.
- 2026-08-02 — chat — Décision finale confirmée avec Ange après
  clarification : email/téléphone collectés identiquement sur web et
  mobile ; SMS = vérification bloquante ajoutée uniquement pour le mobile,
  web inchangé. Checklist de proposition (schéma + routes, sans exécution)
  rédigée, garde-fou renforcé (pas de migration Prisma sans validation).
- 2026-08-02 — Claude Code (VS Code) — Investigation confirmée : aucun
  mécanisme SMS existant côté serveur, uniquement email. Commit `aec87d7`.
- 2026-08-02 — chat — Erreur identifiée : hypothèse "vérifiez votre email"
  à corriger, investigation demandée avant toute correction de code.
- 2026-08-02 — Claude Code (VS Code) — Phase Authentification, étapes 5-9
  terminées. Commit `6166173`.
- 2026-08-02 — chat — Q1 tranchée (champs `RegisterScreen`).
- 2026-08-02 — Claude Code (VS Code) — Phase Authentification, étapes 1-4.
- 2026-08-02 — Claude Code (VS Code) — Scaffold Expo initialisé ; commit
  `94dd2a2`. Dépôt nettoyé séparément.
- 2026-08-01 — chat + Claude Code — Docs et prototypes poussés sur
  `feat/mobile-app`.
- 2026-08-01 — chat — Maquettes validées (paiement, auth, 4 dashboards).