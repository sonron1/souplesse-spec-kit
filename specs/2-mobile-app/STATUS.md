# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

Cahier des charges v2 finalisé + maquettes validées (parcours abonnement/paiement,
connexion/inscription, 4 dashboards). Le code n'a pas encore commencé.

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

  ## BLOC A 
 
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

- **Date/surface** : Claude Code (VS Code) — 2026-08-02
- **Fait** : scaffold Expo initialisé dans `mobile/` (`create-expo-app@latest`,
  template `blank-typescript`), navigation React Navigation installée
  (`native`, `native-stack`, `bottom-tabs`, `react-native-screens`,
  `react-native-safe-area-context`), polices installées (`expo-font`,
  `@expo-google-fonts/manrope`, `@expo-google-fonts/inter`), `mobile/src/theme/tokens.ts`
  créé (copie exacte de `specs/2-mobile-app/mobile-theme-tokens.ts`), 6 écrans
  stub créés dans `mobile/src/screens/` (Login, Register, ClientDashboard,
  CoachDashboard, ModeratorDashboard, AdminDashboard). Committé sur
  `feat/mobile-app` (commit `94dd2a2` — "chore: init expo project scaffold").
  Le `package.json` racine (Nuxt) n'a pas été touché ; `mobile/node_modules`
  est ignoré via le `.gitignore` racine (règle `node_modules` non ancrée).
  Note : le template Expo a lui-même généré `mobile/AGENTS.md`,
  `mobile/CLAUDE.md` (qui référence `AGENTS.md`) et `mobile/.claude/settings.json`
  — fichiers standards du scaffold `blank-typescript`, non modifiés par ailleurs.
  Prompt interactif de `create-expo-app` ("Skip initializing a new git repo?")
  résolu automatiquement sur son défaut (Oui) car aucun `.git` n'a été créé
  dans `mobile/` — comportement conforme à l'attente monorepo.
- **Pas encore fait** : ARRÊT OBLIGATOIRE atteint (étape 8) — aucun écran de
  connexion, navigation par rôle ou appel API n'a été implémenté. La branche
  `feat/mobile-app` n'est toujours pas mergée dans `master`.

## Prochaine étape — à exécuter dans cet ordre exact, une case à la fois

> Ces instructions sont volontairement littérales (commandes exactes, noms de
> paquets exacts, chemins exacts). Si une commande produit un résultat différent
> de ce qui est décrit, ou si un choix non couvert ici se présente : **s'arrêter
> et poser la question plutôt que de deviner.**

- [x] **1.** Se placer à la racine du dépôt (dossier contenant `CLAUDE.md` et le
      `package.json` de Nuxt) — ne pas exécuter les commandes suivantes ailleurs.
- [x] **2.** Lancer exactement :
      ```
      npx create-expo-app@latest mobile --template blank-typescript
      ```
      Le flag `--template blank-typescript` est obligatoire : sans lui, la
      commande pose une question interactive. Ne pas omettre ce flag.
- [x] **3.** Vérifier que `mobile/package.json` a été créé avec son propre
      `package.json` indépendant. **Ne pas** fusionner ses dépendances avec
      celles du `package.json` racine (Nuxt) : ce sont deux projets Node
      séparés dans le même dépôt.
- [x] **4.** Depuis `mobile/`, installer la navigation :
      ```
      npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
      ```
- [x] **5.** Depuis `mobile/`, installer les polices :
      ```
      npx expo install expo-font @expo-google-fonts/manrope @expo-google-fonts/inter
      ```
- [x] **6.** Créer `mobile/src/theme/tokens.ts` avec le contenu exact fourni dans
      `specs/2-mobile-app/mobile-theme-tokens.ts` (copier ce fichier tel quel,
      ne pas réinventer les valeurs de couleur).
- [x] **7.** Créer des écrans vides (stub) — un fichier par écran, aucune logique
      dedans pour l'instant, juste un `<View>` avec le titre de l'écran en texte :
      `mobile/src/screens/LoginScreen.tsx`, `RegisterScreen.tsx`,
      `ClientDashboardScreen.tsx`, `CoachDashboardScreen.tsx`,
      `ModeratorDashboardScreen.tsx`, `AdminDashboardScreen.tsx`.
- [x] **8. ARRÊT OBLIGATOIRE.** Une fois les points 1 à 7 terminés : ne pas
      continuer sur l'écran de connexion, la navigation par rôle, ou l'API —
      committer ce qui existe (`git add mobile && git commit -m "chore: init expo project scaffold"`),
      mettre à jour ce fichier (`Dernière session` + cocher les cases ci-dessus),
      et attendre la validation d'Ange avant d'aller plus loin.
      **→ Fait. En attente de la validation d'Ange avant de poursuivre.**

## Historique (ajouter une entrée par session, la plus récente en haut)

- 2026-08-02 — Claude Code — Scaffold Expo initialisé dans `mobile/` (navigation,
  polices, tokens de thème, 6 écrans stub). Commit `94dd2a2` sur `feat/mobile-app`.
  Étapes 1-7 de la checklist terminées, arrêt obligatoire à l'étape 8, en attente
  de validation.
- 2026-08-01 — chat + Claude Code — Docs et prototypes poussés sur `feat/mobile-app`
  (cahier des charges Markdown, STATUS.md, CLAUDE.md, prototypes paiement + auth/dashboards).
- 2026-08-01 — chat — Maquettes validées (paiement, auth, 4 dashboards). Voir ci-dessus.