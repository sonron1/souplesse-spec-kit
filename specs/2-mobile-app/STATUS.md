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

## Prochaine étape

1. Initialiser le projet Expo dans `mobile/` à la racine du dépôt :
   ```
   npx create-expo-app@latest mobile --template
   ```
   (choisir le template TypeScript blank).
2. Reprendre le système de design déjà validé (couleur `#EAB308`, Manrope/Inter,
   composants des prototypes HTML) comme base des composants React Native —
   commencer par un fichier de thème/tokens partagé (`mobile/src/theme/`).
3. Commencer par l'authentification (JWT, réutilise l'API existante) + navigation,
   avant le module d'abonnement/preuve de paiement (voir section 11 du cahier des
   charges pour l'ordre des phases).

## Historique (ajouter une entrée par session, la plus récente en haut)

- 2026-08-01 — chat + Claude Code — Docs et prototypes poussés sur `feat/mobile-app`
  (cahier des charges Markdown, STATUS.md, CLAUDE.md, prototypes paiement + auth/dashboards).
- 2026-08-01 — chat — Maquettes validées (paiement, auth, 4 dashboards). Voir ci-dessus.
