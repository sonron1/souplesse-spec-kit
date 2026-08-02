# STATUS — Application Mobile Souplesse Fitness

> Ce fichier est le point de synchronisation unique entre les sessions de travail,
> qu'elles se passent ici (chat Claude.ai) ou dans Claude Code / VS Code.
> RÈGLE : avant toute action, lire ce fichier en entier. Après toute action
> significative, le mettre à jour (section "Dernière session" + "Prochaine étape").

---

## Où on en est (résumé en une phrase)

**Migration SMS/OTP appliquée en production avec succès** (PITR 6h confirmé
avant coup, `migrate deploy` + `migrate status` : OK). Aucune route ni code
applicatif ne l'utilise encore — comportement du site inchangé en théorie.
En attente de la confirmation d'Ange que `souplessefitness.com` fonctionne
toujours normalement avant de créer les routes `/api/auth/phone/*`.

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
  checklist). **Confirmé par Ange : PITR actif, fenêtre de 6 heures (plan
  gratuit).**
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

- **Date/surface** : Claude Code (VS Code) — 2026-08-02 (migration
  production, étapes 1-4)
- **Fait** : PITR confirmé par Ange (6h, plan gratuit) → `npx prisma migrate
  deploy` exécuté contre la production (Neon) : succès, une seule migration
  en attente appliquée (`20260802132750_add_phone_verification`), les 16
  précédentes étaient déjà en place. `npx prisma migrate status` confirme
  "Database schema is up to date!". Aucune valeur de `DATABASE_URL` affichée
  en clair (seul le nom d'hôte apparaît dans la sortie Prisma, jamais les
  identifiants). Étape 4 (site déployé) documentée comme non vérifiable par
  moi (pas d'accès réseau sortant) — demande explicite de confirmation à
  Ange avant de créer les routes SMS.
- **Pas encore fait** : confirmation d'Ange que le site fonctionne toujours
  normalement après la migration. Routes `/api/auth/phone/*` non créées
  (dépendent de cette confirmation). Le diff `89df398..6166173` de la phase
  authentification (très ancienne demande, plusieurs sessions en attente)
  reste à vérifier par Ange — à ne pas oublier indéfiniment.

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

- [x] **1.** Vérifier (lecture seule, dashboard Neon ou doc si l'accès
      dashboard n'est pas possible depuis l'outil) que le Point-in-Time
      Recovery est actif sur le projet de production, et noter la fenêtre de
      rétention (ex. "7 jours"). Si l'information n'est pas accessible
      depuis Claude Code, l'indiquer clairement et demander à Ange de
      vérifier lui-même dans le dashboard avant de continuer.
      **→ Confirmé par Ange : PITR actif, fenêtre de restauration de
      6 heures (plan gratuit Neon).**
- [x] **2.** Exécuter contre la production :
      ```
      npx prisma migrate deploy
      ```
      en s'assurant que la variable d'environnement utilisée est bien celle
      mise à jour avec le nouveau mot de passe (sans l'afficher).
      **→ Fait, succès.** Voir "Résultat — étape 2".
- [x] **3.** Vérifier le succès :
      ```
      npx prisma migrate status
      ```
      Documenter le résultat exact dans STATUS.md.
      **→ Fait — "Database schema is up to date!".** Voir "Résultat — étape 3".
- [ ] **4.** Vérifier que le site web fonctionne toujours normalement après
      la migration (une connexion existante réussit, pas d'erreur 500) —
      demander à Ange de confirmer si Claude Code n'a pas de moyen de
      tester le site déployé directement.
      **→ Non vérifiable par moi** (pas d'accès réseau sortant vers
      `souplessefitness.com` depuis cet outil) — voir "Résultat — étape 4".
      **Demande explicite à Ange de confirmer.**
- [x] **5. ARRÊT.** Ne pas créer les routes `/api/auth/phone/*` dans cette
      même étape. Committer uniquement la documentation du résultat de
      migration, et attendre la confirmation d'Ange que le site web
      fonctionne toujours avant de passer à l'implémentation des routes SMS.
      **→ Fait. Migration production terminée et vérifiée côté base de
      données ; en attente uniquement de la confirmation d'Ange que le site
      fonctionne toujours avant de créer les routes SMS.**

## Résultat — étape 1 (PITR Neon)

**Confirmé par Ange** (vérification dashboard Neon, hors de portée de
Claude Code — pas d'accès navigateur/API disponible dans cette session) :
Point-in-Time Recovery **actif**, fenêtre de restauration **6 heures** (plan
gratuit Neon). Filet de sécurité jugé suffisant pour cette migration
purement additive → passage à l'étape 2.

## Résultat — étape 2 (`prisma migrate deploy` contre la production)

Exécuté directement (variable d'environnement du `.env` racine, déjà mise à
jour par Ange après la rotation — jamais affichée en clair ; seul le nom
d'hôte apparaît dans la sortie de Prisma, jamais les identifiants) :

```
Datasource "db": PostgreSQL database "neondb", schema "public" at "ep-jolly-leaf-airya666.c-4.us-east-1.aws.neon.tech"

17 migrations found in prisma/migrations

Applying migration `20260802132750_add_phone_verification`

All migrations have been successfully applied.
```

Une seule migration était en attente — les 16 précédentes étaient déjà
appliquées en production (normal, c'est la base qui fait tourner le site
depuis le début). **Succès, aucune erreur.**

## Résultat — étape 3 (`prisma migrate status`)

```
Datasource "db": PostgreSQL database "neondb", schema "public" at "ep-jolly-leaf-airya666.c-4.us-east-1.aws.neon.tech"

17 migrations found in prisma/migrations

Database schema is up to date!
```

Confirme que les 17 migrations (dont la nouvelle) sont bien enregistrées et
appliquées en production. **Le schéma SMS/OTP est maintenant en place sur la
base de production** (`RegisteredVia`, `registeredVia`, `phoneVerified`,
`phoneVerificationCodeHash`, `phoneVerificationCodeCreatedAt`,
`phoneVerificationAttempts`, `phoneVerificationLockedUntil` sur `User`) —
mais **aucune route ni aucun code applicatif ne les utilise encore** :
tous les comptes existants ont `registeredVia = WEB` (défaut), donc **le
comportement de login actuel n'est pas affecté** (la nouvelle vérification
`phoneVerified` ne s'appliquera qu'aux comptes `MOBILE`, qui n'existent pas
encore puisque les routes ne sont pas créées).

## Résultat — étape 4 (site déployé après migration)

**Non vérifiable par moi** : pas d'accès réseau sortant vers
`souplessefitness.com` depuis cet outil, pas de navigateur. Étant donné que
la migration est additive (nouvelles colonnes avec défaut/nullable, aucune
colonne existante modifiée ou supprimée) et que le code applicatif actuel
n'y fait encore aucune référence, le risque de régression est faible en
théorie — mais **je ne l'affirme pas comme vérifié**.

**Demande explicite à Ange** : merci de confirmer que
`souplessefitness.com` fonctionne toujours normalement (connexion d'un
compte existant, pas d'erreur 500 sur les pages usuelles) avant que je
crée les routes `/api/auth/phone/*`.

## Historique (ajouter une entrée par session, la plus récente en haut)

- 2026-08-02 — Claude Code (VS Code) — PITR confirmé (6h) par Ange. Migration
  SMS/OTP appliquée en production avec succès (`migrate deploy` +
  `migrate status` OK). Site déployé non vérifiable par moi — en attente de
  confirmation d'Ange avant de créer les routes `/api/auth/phone/*`.
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