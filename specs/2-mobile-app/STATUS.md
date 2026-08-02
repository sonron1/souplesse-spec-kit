# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

Authentification mobile câblée (login/register/logout, navigation par rôle),
mais **bloquée avant validation finale** : il faut ajouter une vérification
SMS bloquante pour les comptes mobile, sans rien changer au web — un vrai
changement de schéma serveur, en phase de proposition avant toute migration.

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

- **Date/surface** : chat Claude.ai — 2026-08-02
- **Fait** : clarification complète avec Ange sur la portée exacte de la
  vérification SMS (voir "Décisions actées" — email/téléphone inchangés sur
  les deux plateformes, SMS = ajout de vérification bloquante mobile
  uniquement, web non affecté). Rédaction de la checklist de proposition
  ci-dessous (non encore exécutée).
- **Pas encore fait** : rien n'est implémenté côté SMS. Le schéma Prisma
  exact et les nouvelles routes restent à **proposer** (pas à créer
  directement — voir garde-fou ci-dessous) avant toute migration de base de
  données. Le diff `89df398..HEAD` de la phase authentification reste
  également à vérifier par Ange (en attente depuis plusieurs sessions).

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
- [ ] **4. ARRÊT.** Ne pas modifier `schema.prisma`, ne pas exécuter de
      migration, ne pas créer les routes. Committer uniquement la
      proposition écrite dans `STATUS.md` et attendre la validation d'Ange
      avant toute exécution.

## Historique (ajouter une entrée par session, la plus récente en haut)

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