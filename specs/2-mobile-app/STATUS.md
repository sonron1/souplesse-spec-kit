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

## Fichiers de référence

- `specs/2-mobile-app/cahier-des-charges.md` — cahier des charges complet (v2)
- `specs/2-mobile-app/prototypes/` — prototypes HTML cliquables (paiement, auth, dashboards)
- `CLAUDE.md` (racine) — instructions permanentes pour Claude Code

## Dernière session

- **Date/surface** : chat Claude.ai + Claude Code (VS Code) — 2026-08-01
- **Fait** : cahier des charges (v2.1, Markdown), STATUS.md, CLAUDE.md mis à jour,
  et les prototypes cliquables (paiement/abonnement + auth/dashboards) déposés et
  poussés sur la branche `feat/mobile-app` (commit `82038b1`, complété par un second
  commit ajoutant le prototype de paiement). Confirmé pushé sur GitHub par Ange.
- **Pas encore fait** : la branche `feat/mobile-app` n'est pas encore mergée dans
  `master`. Aucun code de l'application mobile (React Native) n'a encore été écrit —
  seuls les documents et prototypes existent à ce stade.

## Prochaine étape — à exécuter dans cet ordre exact, une case à la fois

> Ces instructions sont volontairement littérales (commandes exactes, noms de
> paquets exacts, chemins exacts). Si une commande produit un résultat différent
> de ce qui est décrit, ou si un choix non couvert ici se présente : **s'arrêter
> et poser la question plutôt que de deviner.**

- [ ] **1.** Se placer à la racine du dépôt (dossier contenant `CLAUDE.md` et le
      `package.json` de Nuxt) — ne pas exécuter les commandes suivantes ailleurs.
- [ ] **2.** Lancer exactement :
      ```
      npx create-expo-app@latest mobile --template blank-typescript
      ```
      Le flag `--template blank-typescript` est obligatoire : sans lui, la
      commande pose une question interactive. Ne pas omettre ce flag.
- [ ] **3.** Vérifier que `mobile/package.json` a été créé avec son propre
      `package.json` indépendant. **Ne pas** fusionner ses dépendances avec
      celles du `package.json` racine (Nuxt) : ce sont deux projets Node
      séparés dans le même dépôt.
- [ ] **4.** Depuis `mobile/`, installer la navigation :
      ```
      npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
      ```
- [ ] **5.** Depuis `mobile/`, installer les polices :
      ```
      npx expo install expo-font @expo-google-fonts/manrope @expo-google-fonts/inter
      ```
- [ ] **6.** Créer `mobile/src/theme/tokens.ts` avec le contenu exact fourni dans
      `specs/2-mobile-app/mobile-theme-tokens.ts` (copier ce fichier tel quel,
      ne pas réinventer les valeurs de couleur).
- [ ] **7.** Créer des écrans vides (stub) — un fichier par écran, aucune logique
      dedans pour l'instant, juste un `<View>` avec le titre de l'écran en texte :
      `mobile/src/screens/LoginScreen.tsx`, `RegisterScreen.tsx`,
      `ClientDashboardScreen.tsx`, `CoachDashboardScreen.tsx`,
      `ModeratorDashboardScreen.tsx`, `AdminDashboardScreen.tsx`.
- [ ] **8. ARRÊT OBLIGATOIRE.** Une fois les points 1 à 7 terminés : ne pas
      continuer sur l'écran de connexion, la navigation par rôle, ou l'API —
      committer ce qui existe (`git add mobile && git commit -m "chore: init expo project scaffold"`),
      mettre à jour ce fichier (`Dernière session` + cocher les cases ci-dessus),
      et attendre la validation d'Ange avant d'aller plus loin.

## Historique (ajouter une entrée par session, la plus récente en haut)

- 2026-08-01 — chat + Claude Code — Docs et prototypes poussés sur `feat/mobile-app`
  (cahier des charges Markdown, STATUS.md, CLAUDE.md, prototypes paiement + auth/dashboards).
- 2026-08-01 — chat — Maquettes validées (paiement, auth, 4 dashboards). Voir ci-dessus.