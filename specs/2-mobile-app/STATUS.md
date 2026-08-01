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
- Identité visuelle validée : couleur de marque `#EAB308` (celle du site), thème
  sombre, typographies Manrope (titres) + Inter (texte).

## Fichiers de référence

- `specs/2-mobile-app/cahier-des-charges.md` — cahier des charges complet (v2)
- `specs/2-mobile-app/prototypes/` — prototypes HTML cliquables (paiement, auth, dashboards)
- `CLAUDE.md` (racine) — instructions permanentes pour Claude Code

## Dernière session

- **Date/surface** : chat Claude.ai — 2026-08-01
- **Fait** : maquettes cliquables du parcours abonnement/paiement (3 itérations),
  puis connexion/inscription + 4 dashboards. Toutes validées par Ange sans réserve.
- **Pas encore fait** : ces fichiers ne sont pas encore déposés dans le dépôt GitHub
  (ils existent seulement en pièces jointes de la session chat).

## Prochaine étape

1. Déposer le cahier des charges + les prototypes dans `specs/2-mobile-app/` sur GitHub.
2. Mettre à jour `CLAUDE.md` (racine) pour qu'il pointe vers ce fichier STATUS.md.
3. Initialiser le projet React Native/Expo (nouveau dossier `mobile/` ou dépôt séparé —
   à confirmer avec Ange) à partir du système de design déjà validé.

## Historique (ajouter une entrée par session, la plus récente en haut)

- 2026-08-01 — chat — Maquettes validées (paiement, auth, 4 dashboards). Voir ci-dessus.
