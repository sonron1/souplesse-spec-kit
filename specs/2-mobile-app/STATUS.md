# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

Migration SMS/OTP validée en local, incident de sécurité Neon clos.
**Migration production NON exécutée** : impossible de vérifier le PITR Neon
depuis cet outil (pas d'accès dashboard/API) — en attente qu'Ange confirme
lui-même dans le dashboard avant que `prisma migrate deploy` soit lancé
contre la production.

## Décisions actées (ne pas rouvrir sans le dire explicitement)

- App mobile **autonome**, pas un wrapper du site web.
- **Aucun paiement in-app** : preuve (capture d'écran) d'un paiement Mobile
  Money (MTN, Moov, Celtiis) fait hors app.
- Durées d'abonnement : 1, 2, 3, 6, 12 mois.
- Notifications (modération des paiements) : SMS **et** push, en parallèle.
- 4 rôles / 4 dashboards distincts : **Client, Coach, Modérateur, Admin**.
- Priorité de publication : **Google Play d'abord**. Apple App Store = phase 2.
- Stack : React Native + Expo, backend = extension de l'API Nitro/Prisma existante.
- **Monorepo** : `mobile/` à la racine du dépôt.
- Identité visuelle validée : `#EAB308`, thème sombre, Manrope + Inter.
- **Authentification mobile** câblée (login/register/logout, navigation par
  rôle, tokens via `expo-secure-store`).
- **Vérification de compte** : email inchangé pour le web ; SMS bloquant
  ajouté pour les comptes mobile uniquement (`registeredVia: WEB | MOBILE`).
- **Schéma SMS/OTP appliqué en local et testé avec succès** : enum
  `RegisteredVia { WEB MOBILE }` + 6 champs sur `User` (`registeredVia`,
  `phoneVerified`, `phoneVerificationCodeHash`,
  `phoneVerificationCodeCreatedAt`, `phoneVerificationAttempts`,
  `phoneVerificationLockedUntil`). Code OTP haché (bcrypt).
- **Routes prévues** : `POST /api/auth/phone/send-code`,
  `POST /api/auth/phone/verify-code` — pas encore créées.
- **Passerelle SMS recommandée** : Africa's Talking (compte pas encore créé —
  fonction d'envoi à stuber en attendant).
- **Test Neon-branch sauté délibérément** (option retenue) : migration
  purement additive, déjà testée sur Postgres 16 local identique, et les
  migrations passent déjà par la connexion directe (`directUrl`), pas le
  pooler — ce qui limite le risque déjà identifié par le passé sur ce
  fournisseur. Filet de sécurité retenu à la place : vérifier que le
  Point-in-Time Recovery (PITR) Neon est actif avant de migrer (voir
  checklist).
- **Incident de sécurité clos (2026-08-02)** : `DATABASE_URL` et
  `DIRECT_DATABASE_URL` de production affichés en clair dans une sortie
  d'outil pendant l'investigation (pas dans un commit ni dans STATUS.md).
  Mot de passe Neon régénéré, `.env` local et variables Vercel (Production)
  mis à jour par Ange, site vérifié fonctionnel après redéploiement.
  **Aucune action supplémentaire requise sur ce point.**

## Fichiers de référence

- `specs/2-mobile-app/cahier-des-charges.md` — cahier des charges complet (v2)
- `specs/2-mobile-app/prototypes/` — prototypes HTML cliquables
- `CLAUDE.md` (racine) — instructions permanentes pour Claude Code

## Dernière session

- **Date/surface** : Claude Code (VS Code) — 2026-08-02 (tentative migration
  production, étapes 1-4)
- **Fait** : vérifié qu'aucun accès Neon (dashboard, `neonctl` authentifié,
  clé API) n'est disponible dans cette session pour confirmer le PITR
  (étape 1). Conformément au texte de la checklist elle-même ("avant de
  continuer") et au garde-fou sur les actions difficiles à annuler,
  **je n'ai pas exécuté `prisma migrate deploy` contre la production** —
  arrêt avant l'étape 2. Étape 4 (vérifier le site) également documentée
  comme non vérifiable par moi (pas d'accès réseau/navigateur), sans
  attendre d'y arriver, pour que ce soit clair d'avance.
- **Pas encore fait** : migration non appliquée en production (aucune
  commande exécutée contre elle). Routes SMS non créées. En attente
  qu'Ange confirme le PITR dans le dashboard Neon. Le diff `89df398..6166173`
  de la phase authentification (très ancienne demande, plusieurs sessions en
  attente) reste à vérifier par Ange — à ne pas oublier indéfiniment.

## Garde-fous pour cette phase

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

## Prochaine étape — Migrer la production, puis créer les routes SMS

- [x] **1. ⚠️ NON VÉRIFIABLE PAR CLAUDE CODE.** Vérifier (lecture seule,
      dashboard Neon ou doc si l'accès dashboard n'est pas possible depuis
      l'outil) que le Point-in-Time Recovery est actif sur le projet de
      production, et noter la fenêtre de rétention (ex. "7 jours"). Si
      l'information n'est pas accessible depuis Claude Code, l'indiquer
      clairement et demander à Ange de vérifier lui-même dans le dashboard
      avant de continuer.
      **→ Tenté, impossible depuis cet outil** (voir "Résultat — étape 1").
      **Conséquence : je ne passe pas aux étapes 2-4 tant qu'Ange n'a pas
      confirmé le PITR** — le texte même de cette étape conditionne la
      suite à cette confirmation ("avant de continuer").
- [ ] **2.** Exécuter contre la production :
      ```
      npx prisma migrate deploy
      ```
      en s'assurant que la variable d'environnement utilisée est bien celle
      mise à jour avec le nouveau mot de passe (sans l'afficher).
      **→ Non exécuté — bloqué par l'étape 1, voir ci-dessous.**
- [ ] **3.** Vérifier le succès :
      ```
      npx prisma migrate status
      ```
      Documenter le résultat exact dans STATUS.md.
      **→ Non exécuté (dépend de l'étape 2).**
- [ ] **4.** Vérifier que le site web fonctionne toujours normalement après
      la migration (une connexion existante réussit, pas d'erreur 500) —
      demander à Ange de confirmer si Claude Code n'a pas de moyen de
      tester le site déployé directement.
      **→ Non exécuté (dépend de l'étape 2) ; de toute façon également non
      vérifiable par moi (pas d'accès navigateur/site déployé — voir
      "Résultat — étape 4").**
- [x] **5. ARRÊT.** Ne pas créer les routes `/api/auth/phone/*` dans cette
      même étape. Committer uniquement la documentation du résultat de
      migration, et attendre la confirmation d'Ange que le site web
      fonctionne toujours avant de passer à l'implémentation des routes SMS.
      **→ Fait, par anticipation : arrêt avant l'étape 2 elle-même
      (production non touchée), documentation committée, en attente d'Ange
      sur le PITR avant de reprendre.**

## Résultat — étape 1 (PITR Neon)

**Je n'ai aucun moyen technique, dans cette session, de vérifier l'état du
Point-in-Time Recovery sur le projet Neon de production** :
- Pas d'accès navigateur/dashboard Neon depuis cet outil.
- `neonctl` non authentifié (revérifié cette session — toujours aucune
  configuration d'auth trouvée).
- Aucune clé API Neon (`NEON_API_KEY` ou équivalent) dans `.env` ni dans
  l'environnement du shell (la rotation de mot de passe confirmée par Ange
  concernait le mot de passe de connexion Postgres, pas une clé API de
  gestion du projet — ce sont deux choses différentes chez Neon).

**Je ne suppose donc pas que le PITR est actif.** Conformément au texte même
de l'étape 1 ("demander à Ange de vérifier lui-même... avant de continuer")
et au garde-fou général sur les actions difficiles à annuler touchant la
production, **je n'exécute pas `prisma migrate deploy` contre la production
tant que ce point n'est pas confirmé.**

**Demande à Ange** : peux-tu vérifier dans le dashboard Neon (Project →
Settings → Backup/Restore, ou section équivalente) que le Point-in-Time
Recovery est actif, et me confirmer la fenêtre de rétention (nombre de
jours) ? Une fois confirmé, je reprendrai à l'étape 2 (`migrate deploy`)
directement, sans revenir sur l'étape 1.

## Résultat — étape 4 (site déployé après migration)

Egalement documenté par anticipation, puisque non atteint : je n'ai pas non
plus de moyen de visiter/tester le site déployé en production depuis cet
outil (pas de navigateur, pas d'accès réseau sortant vers
`souplessefitness.com`). Une fois la migration effectivement exécutée
(étape 2), il faudra qu'Ange confirme lui-même que le site fonctionne
toujours normalement (connexion existante, pas d'erreur 500) avant de passer
aux routes `/api/auth/phone/*` — exactement comme le prévoit déjà l'étape 5.

## Historique (ajouter une entrée par session, la plus récente en haut)

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