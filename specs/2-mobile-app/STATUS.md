# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

Cahier des charges v2 finalisé, maquettes validées, scaffold Expo initialisé,
dépôt nettoyé. Phase Authentification terminée (étapes 1 à 9) : écrans
Login/Register branchés, navigation par rôle en place. ARRÊT OBLIGATOIRE
(étape 10) — en attente de validation d'Ange avant la phase suivante.

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
  `/api/auth/logout`) — aucune nouvelle route d'auth à créer, aucune
  modification du schéma serveur (`server/validators/auth.schemas.ts`).
- **Stockage des tokens sur l'appareil** : `expo-secure-store` (jamais
  `AsyncStorage` pour les tokens — AsyncStorage n'est pas chiffré).
- **URL de base de l'API** : `https://souplessefitness.com/api` en production,
  configurable via la variable d'environnement Expo `EXPO_PUBLIC_API_URL`
  (voir `mobile/.env.example`). Ne jamais coder cette URL en dur dans le code.
  `mobile/.env` est ignoré via le `.gitignore` **racine** (pas celui de
  `mobile/`, qui ne couvre que `.env*.local`).
- **Routage par rôle après connexion** : `CLIENT` → `ClientDashboardScreen`,
  `COACH` → `CoachDashboardScreen`, `MODERATOR` → `ModeratorDashboardScreen`,
  `ADMIN` → `AdminDashboardScreen`. Le rôle vient du champ `role` renvoyé par
  `/api/auth/login`.
- **Champs du formulaire d'inscription (Q1, résolue)** : le contrat réel de
  `POST /api/auth/register` (`server/validators/auth.schemas.ts`) exige
  `firstName`, `lastName` (séparés), `email`, `phone`, `gender`
  (`'MALE' | 'FEMALE'`, obligatoire, sans défaut), `password`,
  `confirmPassword`. `RegisterScreen` mobile doit donc collecter exactement
  ces champs, dans cet ordre : **Prénom, Nom, Email, Téléphone, Genre
  (sélecteur Homme/Femme, obligatoire), Mot de passe, Confirmer**. Les champs
  optionnels serveur `birthDay`/`birthMonth` ne sont **pas** collectés côté
  mobile pour l'instant (optionnels, hors périmètre de cette phase).

## Fichiers de référence

- `specs/2-mobile-app/cahier-des-charges.md` — cahier des charges complet (v2)
- `specs/2-mobile-app/prototypes/` — prototypes HTML cliquables (paiement, auth, dashboards)
- `CLAUDE.md` (racine) — instructions permanentes pour Claude Code

## Dernière session

- **Date/surface** : Claude Code (VS Code) — 2026-08-02 (session 3, Phase
  Authentification, étapes 5-9)
- **Fait** :
  - `mobile/src/api/auth.ts` — `login()`, `register()`, `logout()`, typés,
    utilisant `apiFetch`. `register()` reprend exactement les noms de champs
    du schéma serveur (`firstName`, `lastName`, `email`, `phone`, `gender`,
    `password`, `confirmPassword`).
  - `mobile/src/context/AuthContext.tsx` — `user`, `isLoading`, `login()`,
    `register()`, `logout()`. Restaure la session au montage via
    `GET /api/auth/me` si un `accessToken` existe en secure-store ; en cas
    d'échec (token expiré/invalide), nettoie le stockage et repasse
    `user = null`.
  - `mobile/src/navigation/RootNavigator.tsx` — écran de chargement pendant
    `isLoading`, `AuthStack` (Login/Register) si `user === null`, sinon le
    dashboard du rôle (`CLIENT`/`COACH`/`MODERATOR`/`ADMIN`, avec repli sur
    `ClientDashboardScreen` pour un rôle non mappé — cas défensif, ne devrait
    pas se produire).
  - `LoginScreen.tsx` et `RegisterScreen.tsx` branchés sur `AuthContext`,
    champs exacts prescrits (Register : Prénom, Nom, Email, Téléphone, Genre
    en deux boutons Homme/Femme, Mot de passe, Confirmer), erreur simple en
    texte rouge sous le formulaire.
  - **Ajouts non listés explicitement dans la checklist, mais nécessaires
    pour que les étapes 6-8 aient un effet réel** (signalés ici plutôt que
    faits silencieusement) :
    - `mobile/App.tsx` réécrit pour monter `AuthProvider` +
      `SafeAreaProvider` + `RootNavigator` (sans ça, l'app affichait encore
      l'écran par défaut du template Expo).
    - Un lien de navigation simple entre Login ↔ Register a été ajouté sur
      chaque écran (sinon aucun des deux écrans n'était atteignable depuis
      l'autre).
    - Après une inscription réussie, `RegisterScreen` affiche un message
      inline ("vérifiez votre boîte mail...") au lieu de rediriger vers un
      dashboard — cohérent avec le fait que `POST /api/auth/register`
      **n'émet pas de tokens** (vérification email obligatoire avant
      connexion, cf. CLAUDE.md "Email verification enforced"). Aucun nouvel
      écran créé pour ça, message géré dans `RegisterScreen` lui-même.
  - `npx tsc --noEmit` dans `mobile/` : aucune erreur.
- **Pas encore fait** : ARRÊT OBLIGATOIRE atteint (étape 10). Rien au-delà de
  l'authentification (pas d'écran de durée d'abonnement, pas d'envoi de
  preuve de paiement). La branche `feat/mobile-app` n'est toujours pas
  mergée dans `master`.

## Prochaine étape — Phase Authentification (reprise à l'étape 5)

> Instructions littérales : s'arrêter et écrire dans "Questions en attente"
> (nouvelle section à créer si besoin) en cas de doute plutôt que deviner.
> Les étapes 1 à 4 sont terminées (voir Historique) — ne pas les refaire.

- [x] **1.** `expo-secure-store` installé.
- [x] **2.** `mobile/.env` + `mobile/.env.example` créés et vérifiés.
- [x] **3.** `mobile/src/config/env.ts` créé.
- [x] **4.** `mobile/src/api/client.ts` créé (`apiFetch`).
- [x] **5.** Créer `mobile/src/api/auth.ts` avec trois fonctions typées,
      appelant chacune la route correspondante via `apiFetch` :
      - `login(email: string, password: string)`
      - `register(input: { firstName: string; lastName: string; email: string; phone: string; gender: 'MALE' | 'FEMALE'; password: string; confirmPassword: string })`
      - `logout()`
      Reprendre exactement les noms de champs du schéma serveur
      (`server/validators/auth.schemas.ts`) dans le corps de la requête
      `register` — ne pas renommer les clés JSON envoyées au serveur.
- [x] **6.** Créer `mobile/src/context/AuthContext.tsx` : contexte React
      exposant `user`, `isLoading`, `login()`, `register()`, `logout()`. Au
      montage, restaure la session depuis `expo-secure-store` si des tokens
      existent ; sinon `user = null`.
- [x] **7.** Créer `mobile/src/navigation/RootNavigator.tsx` :
      - si `isLoading` → écran de chargement simple
      - si `user === null` → `AuthStack` (Login, Register,
        `@react-navigation/native-stack`)
      - sinon → le dashboard correspondant à `user.role` (mapping dans
        "Décisions actées")
- [x] **8.** Brancher `LoginScreen.tsx` et `RegisterScreen.tsx` (stubs
      existants) sur `AuthContext` : formulaire contrôlé, appel à `login()` /
      `register()`, erreur simple affichée en cas d'échec (texte rouge sous
      le formulaire, pas de modal).
      - **Login** : Email, Mot de passe.
      - **Register** : Prénom, Nom, Email, Téléphone, Genre (sélecteur
        Homme/Femme — deux boutons ou un segmented control, pas un menu
        déroulant caché), Mot de passe, Confirmer — dans cet ordre exact.
- [x] **9.** Vérifier la compilation :
      ```
      npx tsc --noEmit
      ```
      Corriger toute erreur avant de continuer — pas de `@ts-ignore`.
      **→ Fait, 0 erreur.**
- [x] **10. ARRÊT OBLIGATOIRE.** Ne pas commencer l'écran de choix de durée
      d'abonnement, l'envoi de preuve de paiement, ni aucun appel API autre
      que l'authentification. Committer
      (`git add mobile && git commit -m "feat(mobile): wire authentication and role-based navigation"`),
      mettre à jour ce fichier (Dernière session, cases cochées, Historique),
      et attendre la validation d'Ange.
      **→ Fait. En attente de la validation d'Ange avant de poursuivre.**

## Historique (ajouter une entrée par session, la plus récente en haut)

- 2026-08-02 — Claude Code (VS Code) — Phase Authentification, étapes 5-9 :
  `api/auth.ts`, `context/AuthContext.tsx`, `navigation/RootNavigator.tsx`,
  écrans Login/Register branchés (champs alignés sur Q1), `App.tsx` mis à
  jour pour monter `AuthProvider`/`RootNavigator`. `npx tsc --noEmit` : 0
  erreur. ARRÊT OBLIGATOIRE (étape 10), en attente de validation.
- 2026-08-02 — chat — Q1 tranchée (champs `RegisterScreen` alignés sur le
  vrai schéma serveur : prénom/nom séparés, genre obligatoire,
  confirmPassword). Étapes 5 et 8 de la checklist réécrites en conséquence.
- 2026-08-02 — Claude Code (VS Code) — Phase Authentification, étapes 1-4 :
  `expo-secure-store`, `.env`/`.env.example`, `config/env.ts`, `api/client.ts`.
  Arrêt à l'étape 5 (Q1 : signature `register()` prescrite incompatible avec
  `registerSchema` réel). Question posée dans "Questions en attente".
- 2026-08-02 — Claude Code (VS Code) — Scaffold Expo initialisé (navigation,
  polices, tokens, écrans stub) ; commit `94dd2a2`. Dépôt nettoyé séparément
  (`.claude/`, logs, `env_tmp_val.txt` retirés du suivi Git).
- 2026-08-01 — chat + Claude Code — Docs et prototypes poussés sur
  `feat/mobile-app` (cahier des charges Markdown, STATUS.md, CLAUDE.md,
  prototypes paiement + auth/dashboards).
- 2026-08-01 — chat — Maquettes validées (paiement, auth, 4 dashboards).