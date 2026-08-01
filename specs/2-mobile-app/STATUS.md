# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

Cahier des charges v2 finalisé, maquettes validées, scaffold Expo initialisé et
dépôt nettoyé. La phase authentification (écrans + navigation par rôle) reste
à câbler.

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
  `/api/auth/logout`) — aucune nouvelle route d'auth à créer.
- **Stockage des tokens sur l'appareil** : `expo-secure-store` (jamais
  `AsyncStorage` pour les tokens — AsyncStorage n'est pas chiffré).
- **URL de base de l'API** : `https://souplessefitness.com/api` en production,
  configurable via la variable d'environnement Expo `EXPO_PUBLIC_API_URL`
  (voir `mobile/.env.example`). Ne jamais coder cette URL en dur dans le code.
- **Routage par rôle après connexion** : `CLIENT` → `ClientDashboardScreen`,
  `COACH` → `CoachDashboardScreen`, `MODERATOR` → `ModeratorDashboardScreen`,
  `ADMIN` → `AdminDashboardScreen`. Le rôle vient du champ `role` renvoyé par
  `/api/auth/login`.

## Fichiers de référence

- `specs/2-mobile-app/cahier-des-charges.md` — cahier des charges complet (v2)
- `specs/2-mobile-app/prototypes/` — prototypes HTML cliquables (paiement, auth, dashboards)
- `CLAUDE.md` (racine) — instructions permanentes pour Claude Code

## Dernière session

- **Date/surface** : Claude Code (VS Code) — 2026-08-02 (session 2, Phase Authentification)
- **Fait** : étapes 1 à 4 de la checklist "Phase Authentification" terminées :
  `expo-secure-store` installé, `mobile/.env.example` + `mobile/.env` créés
  (vérifié empiriquement via `git check-ignore` / `git add --dry-run` que
  `mobile/.env` est bien ignoré et `mobile/.env.example` bien suivi, grâce au
  `.gitignore` racine — `mobile/.gitignore` seul ne suffit pas, il n'ignore que
  `.env*.local`), `mobile/src/config/env.ts` (erreur explicite si
  `EXPO_PUBLIC_API_URL` absent), `mobile/src/api/client.ts` (`apiFetch` avec
  préfixe `API_URL` + en-tête `Authorization: Bearer` depuis
  `expo-secure-store`). `npx tsc --noEmit` dans `mobile/` : aucune erreur.
- **Bloqué à l'étape 5** : voir "Questions en attente" ci-dessous — le
  signature `register(name, email, phone, password)` prescrite à l'étape 5 ne
  correspond pas au contrat réel de `POST /api/auth/register`. Arrêt avant de
  créer `mobile/src/api/auth.ts`, donc étapes 5 à 9 non commencées (pas de
  `AuthContext`, pas de `RootNavigator`, écrans Login/Register non branchés).
- **Pas encore fait** : tout ce qui est listé ci-dessus comme bloqué. La
  branche `feat/mobile-app` n'est toujours pas mergée dans `master`.

## Questions en attente

### Q1 — Champs requis par `POST /api/auth/register` vs signature prescrite à l'étape 5

L'étape 5 de la Phase Authentification demande de créer
`register(name, email, phone, password)`, et l'étape 8 liste les champs de
`RegisterScreen` comme "nom complet, email, téléphone, mot de passe,
confirmation" (repris des prototypes `souplesse-auth-dashboards.html`).

En lisant le schéma réel côté serveur
(`server/validators/auth.schemas.ts`, `registerSchema`, lignes 4-34) et
`server/services/auth.service.ts`, `POST /api/auth/register` exige en fait :

- `firstName` **et** `lastName` séparés (pas un `name` unique) — min. 2 caractères chacun
- `email`
- `phone` (regex E.164-like, ex. `+229 97 00 00 00`)
- `gender` : `'MALE' | 'FEMALE'` — **obligatoire, sans valeur par défaut**
- `password` + `confirmPassword` (le serveur revalide déjà l'égalité, mais les
  deux champs doivent être envoyés)
- `birthDay` / `birthMonth` : optionnels (nombres), non mentionnés dans le
  cahier des charges mobile ni dans les prototypes auth

Sans `gender`, l'appel à `/api/auth/register` échoue systématiquement
(validation Zod côté serveur) — impossible d'implémenter `register()` ni
l'écran d'inscription tels que décrits littéralement à l'étape 5/8 sans
d'abord trancher ce point. Conformément aux garde-fous, je ne modifie pas le
schéma serveur pour l'assouplir.

**Question pour Ange** : comment veux-tu gérer `gender` (et
`birthDay`/`birthMonth`) sur `RegisterScreen` mobile ?

- (a) Ajouter un sélecteur "Homme / Femme" (`MALE`/`FEMALE`) à l'écran
  d'inscription mobile, en plus de nom/prénom séparés, email, téléphone, mot
  de passe + confirmation — et ignorer `birthDay`/`birthMonth` pour l'instant
  (optionnels côté serveur) ?
- (b) Autre approche (à préciser) ?

Je reprendrai l'étape 5 dès que ce point est tranché, sans rouvrir le reste
de la checklist.

## Prochaine étape — Phase Authentification (à exécuter dans cet ordre exact)

> Instructions littérales : s'arrêter et écrire dans "Questions en attente"
> (nouvelle section à créer si besoin) en cas de doute plutôt que deviner.

- [x] **1.** Depuis `mobile/`, installer :
      ```
      npx expo install expo-secure-store
      ```
- [x] **2.** Créer `mobile/.env.example` avec cette ligne exacte :
      ```
      EXPO_PUBLIC_API_URL=https://souplessefitness.com/api
      ```
      Créer aussi `mobile/.env` (mêmes valeurs) — vérifier qu'il est bien
      ignoré par `mobile/.gitignore` (le template Expo l'ignore par défaut ;
      confirmer, ne pas supposer).
      **→ Fait, avec correction** : `mobile/.gitignore` seul n'ignore que
      `.env*.local`, pas `.env` nu. Vérifié via `git check-ignore -v` et
      `git add --dry-run` : `mobile/.env` est bien ignoré (grâce au
      `.gitignore` **racine**, règle `.env` non ancrée donc valable à toute
      profondeur) et `mobile/.env.example` est bien suivi (règle
      `!.env.example`).
- [x] **3.** Créer `mobile/src/config/env.ts` qui exporte
      `API_URL = process.env.EXPO_PUBLIC_API_URL`, avec une erreur explicite
      au démarrage si la variable est absente.
- [x] **4.** Créer `mobile/src/api/client.ts` : wrapper `fetch` qui préfixe
      `API_URL`, ajoute `Authorization: Bearer <accessToken>` s'il existe, et
      expose `apiFetch(path, options)`.
- [ ] **5. ⚠️ BLOQUÉ — voir "Questions en attente" / Q1.** Créer
      `mobile/src/api/auth.ts` avec `login(email, password)`,
      `register(name, email, phone, password)`, `logout()`, chacune appelant
      la route correspondante via `apiFetch`.
- [ ] **6.** Créer `mobile/src/context/AuthContext.tsx` : contexte React
      exposant `user`, `isLoading`, `login()`, `register()`, `logout()`. Au
      montage, restaure la session depuis `expo-secure-store` si des tokens
      existent ; sinon `user = null`.
- [ ] **7.** Créer `mobile/src/navigation/RootNavigator.tsx` :
      - si `isLoading` → écran de chargement simple
      - si `user === null` → `AuthStack` (Login, Register,
        `@react-navigation/native-stack`)
      - sinon → le dashboard correspondant à `user.role` (mapping ci-dessus)
- [ ] **8.** Brancher `LoginScreen.tsx` et `RegisterScreen.tsx` (stubs
      existants) sur `AuthContext` : formulaire contrôlé, appel à `login()` /
      `register()`, erreur simple affichée en cas d'échec. Champs identiques
      aux prototypes (`souplesse-auth-dashboards.html`) : Login = email + mot
      de passe ; Register = nom complet, email, téléphone, mot de passe,
      confirmation.
- [ ] **9.** Vérifier la compilation :
      ```
      npx tsc --noEmit
      ```
      Corriger toute erreur avant de continuer — pas de `@ts-ignore`.
- [ ] **10. ARRÊT OBLIGATOIRE.** Ne pas commencer l'écran de choix de durée
      d'abonnement, l'envoi de preuve de paiement, ni aucun appel API autre
      que l'authentification. Committer
      (`git add mobile && git commit -m "feat(mobile): wire authentication and role-based navigation"`),
      mettre à jour ce fichier (Dernière session, cases cochées, Historique),
      et attendre la validation d'Ange.

## Historique (ajouter une entrée par session, la plus récente en haut)

- 2026-08-02 — Claude Code (VS Code) — Phase Authentification, étapes 1-4 :
  `expo-secure-store`, `.env`/`.env.example`, `config/env.ts`, `api/client.ts`.
  Arrêt à l'étape 5 (Q1 : signature `register()` prescrite incompatible avec
  `registerSchema` réel — `gender` obligatoire, `firstName`/`lastName`
  séparés, `confirmPassword`). Question posée dans "Questions en attente",
  en attente de décision d'Ange avant de continuer.
- 2026-08-02 — Claude Code (VS Code) — Scaffold Expo initialisé (navigation,
  polices, tokens, écrans stub) ; commit `94dd2a2`. Dépôt nettoyé séparément
  (`.claude/`, logs, `env_tmp_val.txt` retirés du suivi Git).
- 2026-08-01 — chat + Claude Code — Docs et prototypes poussés sur
  `feat/mobile-app` (cahier des charges Markdown, STATUS.md, CLAUDE.md,
  prototypes paiement + auth/dashboards).
- 2026-08-01 — chat — Maquettes validées (paiement, auth, 4 dashboards).