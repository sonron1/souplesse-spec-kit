---
description: 'Suppléments fonctionnels v2 — Souplesse Fitness'
created: '2026-03-06'
status: 'in-progress'
---

# Tasks: Suppléments Fonctionnels v2

> Chaque tâche est atomique, testable indépendamment, et ordonnée par dépendance.  
> Légende : `[DB]` base de données · `[API]` route serveur · `[UI]` page/composant · `[TEST]` test · `[P]` peut être parallélisé

---

## BLOC A — Modèle de données utilisateur étendu

- [ ] A001 [DB] Ajouter les champs `firstName`, `lastName`, `phone` (String unique), `gender` (enum `MALE | FEMALE`), `birthDay` (Int?), `birthMonth` (Int?), `avatarUrl` (String?) au modèle `User` dans `prisma/schema.prisma`
- [ ] A002 [DB] Créer l'enum Prisma `Gender { MALE FEMALE }` dans `prisma/schema.prisma`
- [ ] A003 [DB] Générer et appliquer la migration `npx prisma migrate dev --name add-user-profile-fields`
- [ ] A004 [DB] Mettre à jour `prisma/seed.js` pour renseigner `firstName`, `lastName`, `phone`, `gender` sur les utilisateurs existants
- [ ] A005 [API] Mettre à jour le schéma Zod `RegisterBody` dans `server/validators/auth.schemas.ts` : ajouter `firstName`, `lastName`, `phone`, `gender`, `birthDay?`, `birthMonth?`
- [ ] A006 [API] Mettre à jour le schéma Zod `UpdateProfileBody` dans `server/validators/auth.schemas.ts` pour l'édition profil (tous champs sauf email/role)
- [ ] A007 [API] Mettre à jour `server/services/auth.service.ts` → `register()` : persister les nouveaux champs
- [ ] A008 [API] Vérifier unicité du `phone` dans `register()` : si déjà utilisé, lever une erreur `phone_taken`
- [ ] A009 [API] Vérifier unicité de l'`email` dans `register()` (déjà géré) : s'assurer que le message retourné est `email_taken`
- [ ] A010 [API] Créer `GET /api/auth/me` → retourner le profil complet de l'utilisateur connecté
- [ ] A011 [API] Créer `PATCH /api/auth/me` → mettre à jour le profil (firstName, lastName, phone, gender, birthDay, birthMonth, avatarUrl)
- [ ] A012 [API] Créer `POST /api/auth/avatar` → upload d'image profil (multipart, stockage Vercel Blob ou URL externe)

---

## BLOC B — Formulaire d'inscription amélioré

- [ ] B001 [UI] Refactoriser `app/pages/register.vue` : ajouter champs Nom, Prénom, Téléphone, Sexe (radio ou select)
- [ ] B002 [UI] Ajouter validation en temps réel (reactive) sur chaque champ avec messages d'erreur inline
- [ ] B003 [UI] Ajouter indicateur de force du mot de passe (faible / moyen / fort) basé sur : ≥8 chars, 1 majuscule, 1 chiffre, 1 caractère spécial
- [ ] B004 [UI] Ajouter champ "Confirmation du mot de passe" avec validation de correspondance
- [ ] B005 [UI] Mettre à jour le schéma Zod côté client pour inclure les nouvelles règles de mot de passe
- [ ] B006 [UI] Afficher message d'erreur spécifique si `email_taken` ou `phone_taken` retourné par l'API

---

## BLOC C — Sécurité des sessions (session unique)

- [ ] C001 [DB] Ajouter le champ `sessionToken` (String?, unique) et `sessionTokenIssuedAt` (DateTime?) au modèle `User`
- [ ] C002 [DB] Générer et appliquer la migration `npx prisma migrate dev --name add-session-token`
- [ ] C003 [API] Dans `server/services/auth.service.ts` → `login()` : générer un `sessionToken` UUID, le persister sur l'utilisateur, l'inclure dans le JWT payload
- [ ] C004 [API] Dans `server/middleware/auth.middleware.ts` → `requireAuth()` : vérifier que le `sessionToken` du JWT correspond à celui en base ; si différent, rejeter avec 401 `session_revoked`
- [ ] C005 [API] Dans `logout()` : effacer le `sessionToken` en base (null)
- [ ] C006 [UI] Dans `app/composables/useAuth.ts` : intercepter l'erreur 401 `session_revoked` et déclencher la déconnexion locale + redirection `/login` avec message "Votre session a été fermée sur cet appareil"

---

## BLOC D — Déconnexion automatique (inactivité 30 min)

- [ ] D001 [UI] Dans `app/layouts/default.vue` : remplacer le timer 20 min par 30 min (déjà implémenté, modifier la constante `IDLE_TIMEOUT`)
- [ ] D002 [UI] S'assurer que les événements `mousemove`, `keydown`, `click`, `scroll`, `touchstart` réinitialisent le timer (déjà partiellement fait — vérifier exhaustivité)
- [ ] D003 [UI] Afficher un avertissement "Déconnexion dans 2 min" à 28 min d'inactivité avec un bouton "Rester connecté"

---

## BLOC E — Page Profil `/profile`

- [ ] E001 [UI] Créer `app/pages/profile.vue` (accessible à tous les rôles, middleware `auth`)
- [ ] E002 [UI] Section "Informations personnelles" : avatar, nom, prénom, email, téléphone, sexe, date anniversaire, rôle (badge coloré)
- [ ] E003 [UI] Bouton "Modifier le profil" → formulaire inline ou modal avec champs éditables
- [ ] E004 [UI] Upload avatar : input file avec prévisualisation circulaire, appel `POST /api/auth/avatar`
- [ ] E005 [UI] Section CLIENT uniquement : abonnement actif (copie du widget de `dashboard/subscriptions.vue`)
- [ ] E006 [UI] Section CLIENT uniquement : 3 stats rapides (séances totales, réservations actives, jours restants abonnement)
- [ ] E007 [UI] Section CLIENT uniquement : liste des 5 dernières réservations avec statut
- [ ] E008 [UI] Section COACH uniquement : spécialité + liste des séances créées (5 dernières)
- [ ] E009 [UI] Section ADMIN uniquement : lien vers `/admin/users`, `/admin/sessions`, stats plateforme rapides
- [ ] E010 [UI] Ajouter lien "Mon profil" dans le menu de navigation (default.vue) pour tous les rôles
- [ ] E011 [UI] Déplacer le menu "Abonnement" après "Profil" dans la nav client

---

## BLOC F — Catalogue abonnements (tarifs officiels)

- [ ] F001 [DB] Mettre à jour `prisma/seed.js` avec les formules officielles (remplacer les données de test) :
  - Séance (1 500 FCFA, 1 jour)
  - Carnet 10 séances (10 000 FCFA, 30 jours)
  - Carnet 15 séances (20 000 FCFA, 90 jours)
  - Abonnement 1 mois — solo 15 000 / couple 25 000, 30 jours
  - Suivi personnel — solo 20 000 / couple 40 000, 30 jours, 1 report
  - Abonnement 3 mois — solo 40 000 / couple 75 000, 90 jours, 2 reports
  - Abonnement 6 mois — solo 70 000 / couple 120 000, 180 jours, 2 reports
  - Abonnement 1 an — solo 120 000 / couple 200 000, 365 jours, 3 reports
  - Fit Dance (10 000, 30 jours)
  - Taekwondo (10 000, 30 jours)
  - Boxe (10 000, 30 jours)
- [ ] F002 [DB] Ajouter le champ `maxPauses` (Int, default 0) au modèle `SubscriptionPlan` dans `prisma/schema.prisma`
- [ ] F003 [DB] Générer et appliquer la migration `npx prisma migrate dev --name add-plan-max-pauses`
- [ ] F004 [API] Mettre à jour `GET /api/subscription-plans` pour retourner `maxPauses`
- [ ] F005 [UI] Mettre à jour `app/pages/subscribe.vue` : afficher la devise FCFA (déjà XOF, adapter le label affiché en "FCFA"), afficher le nombre de reports si > 0

---

## BLOC G — Réservation conditionnée à l'abonnement

- [ ] G001 [API] Dans `server/services/booking.service.ts` → `createBooking()` : vérifier qu'un abonnement `ACTIVE` et non expiré existe pour l'utilisateur avant tout — sinon lever `subscription_required`
- [ ] G002 [API] Dans `POST /api/bookings` : retourner HTTP 402 avec `{ error: 'subscription_required' }` si pas d'abonnement actif
- [ ] G003 [UI] Dans `app/pages/sessions/index.vue` (ou où se trouve le bouton Réserver) : si erreur `subscription_required`, afficher une modale "Abonnez-vous pour réserver" avec lien vers `/subscribe`
- [ ] G004 [UI] Après paiement réussi sur `/subscribe`, rediriger vers `/dashboard` (déjà `/dashboard/subscriptions`, changer vers `/dashboard`)

---

## BLOC H — Expiration et accès abonnement

- [ ] H001 [API] Créer un cron ou endpoint interne `GET /api/internal/expire-subscriptions` protégé par `INTERNAL_API_SECRET` qui marque `status = EXPIRED` et `isActive = false` pour tous les abonnements dépassant `expiresAt`
- [ ] H002 [API] Configurer un Vercel Cron Job (`vercel.json`) pour appeler cet endpoint chaque jour à 00:00 UTC
- [ ] H003 [UI] Dans `app/pages/dashboard/subscriptions.vue` : si aucun abonnement actif, afficher un bandeau "Votre abonnement a expiré — Renouvelez maintenant" avec lien `/subscribe`
- [ ] H004 [UI] Désactiver le bouton "Réserver" sur les pages sessions si `activeSub` est null ou expiré

---

## BLOC I — Rappel d'expiration abonnement (J-3)

- [ ] I001 [API] Dans le cron `expire-subscriptions` : pour chaque abonnement expirant dans ≤ 3 jours, appeler `sendExpirationReminderEmail(user, subscription)`
- [ ] I002 [API] Créer `server/utils/email.ts` → fonction `sendExpirationReminderEmail()` utilisant Resend
- [ ] I003 [DB] Ajouter le champ `reminderSentAt` (DateTime?) au modèle `Subscription` pour éviter les doublons d'envoi
- [ ] I004 [DB] Générer et appliquer la migration `npx prisma migrate dev --name add-subscription-reminder`
- [ ] I005 [UI] Ajouter une bannière in-app si l'abonnement expire dans ≤ 3 jours (vérifier dans `subscriptions.vue` au chargement)

---

## BLOC J — Report / Pause abonnement

- [ ] J001 [DB] Ajouter `pauseCount` (Int, default 0) et `pausedAt` (DateTime?) et `pausedUntil` (DateTime?) au modèle `Subscription`
- [ ] J002 [DB] Générer et appliquer la migration `npx prisma migrate dev --name add-subscription-pause`
- [ ] J003 [API] Créer `POST /api/subscriptions/:id/pause` : vérifie `pauseCount < plan.maxPauses`, incrémente `pauseCount`, met `status = PAUSED`, enregistre `pausedAt`
- [ ] J004 [API] Créer `POST /api/subscriptions/:id/resume` : remet `status = ACTIVE`, calcule nouveau `expiresAt` (ajoute la durée de pause), efface `pausedAt`
- [ ] J005 [API] Notifier l'admin par email à chaque pause (utiliser Resend)
- [ ] J006 [UI] Dans `app/pages/dashboard/subscriptions.vue` : afficher bouton "Mettre en pause" si `pauseCount < plan.maxPauses` et abonnement ACTIVE
- [ ] J007 [UI] Afficher le statut PAUSED avec la date de reprise prévue
- [ ] J008 [UI] Dans `app/pages/admin/users/[id].vue` (ou drawer users) : afficher le nombre de reports utilisés/disponibles

---

## BLOC K — Cumul d'abonnements

- [ ] K001 [API] Dans `server/services/payments.service.ts` → `confirmPayment()` : avant de créer un nouvel abonnement, vérifier si un abonnement ACTIVE existe déjà pour ce plan ou un plan équivalent
- [ ] K002 [API] Si abonnement actif existant : au lieu de créer un nouveau, étendre `expiresAt` du existant en ajoutant `plan.validityDays` jours
- [ ] K003 [UI] Dans `app/pages/dashboard/subscriptions.vue` : si extension, afficher "Votre abonnement a été prolongé jusqu'au [date]"

---

## BLOC L — Abonnement couple amélioré

- [ ] L001 [UI] Dans `app/pages/subscribe.vue` pour les plans couple : vérifier que le partenaire est de sexe opposé (erreur si même genre — requires champ `gender` dans le profil)
- [ ] L002 [API] Dans `POST /api/payments/confirm` : si `partnerUserId`, vérifier que les deux utilisateurs ont des genres opposés (`MALE`/`FEMALE`) ; sinon rejeter avec `incompatible_genders`
- [ ] L003 [UI] Améliorer le sélecteur partenaire : permettre la recherche par email OU téléphone, afficher nom/prénom du partenaire trouvé pour confirmation

---

## BLOC M — Gestion des séances améliorée

- [ ] M001 [API] Dans `GET /api/sessions` : trier par `startsAt DESC` (les plus récentes en premier)
- [ ] M002 [API] Corriger l'erreur serveur à l'annulation de réservation (`DELETE /api/bookings/:id`) — vérifier le handler et tracer l'erreur
- [ ] M003 [UI] Dans `app/pages/dashboard/bookings.vue` : afficher séances confirmées et séances annulées dans deux onglets séparés (déjà partiellement fait — finaliser)
- [ ] M004 [UI] Retirer le calendrier permanent de la page sessions — le remplacer par une icône calendrier ouvrant un date-picker popup (composant natif ou `<input type="date">` stylisé)
- [ ] M005 [UI] Si l'utilisateur a déjà une réservation active pour une séance : désactiver le bouton "Réserver" et afficher "Déjà réservé"

---

## BLOC N — Interface Sessions : filtres dates

- [ ] N001 [UI] Dans le panneau filtres des sessions : ajouter validation `dateFin >= dateDébut`
- [ ] N002 [UI] Corriger la logique de filtrage multi-jours : `startsAt >= dateDebut AND startsAt <= dateFin + 23:59:59`
- [ ] N003 [API] Dans `GET /api/sessions` : accepter les paramètres `from` (ISO date) et `to` (ISO date) et les appliquer côté serveur (Prisma `gte`/`lte`)

---

## BLOC O — Pagination

- [ ] O001 [API] Ajouter pagination `?page=1&limit=20` à `GET /api/admin/users`
- [ ] O002 [API] Ajouter pagination `?page=1&limit=20` à `GET /api/sessions`
- [ ] O003 [API] Ajouter pagination `?page=1&limit=20` à `GET /api/bookings`
- [ ] O004 [UI] Composant `<Pagination>` réutilisable : prev / numéros / next
- [ ] O005 [UI] Intégrer `<Pagination>` dans la page admin utilisateurs
- [ ] O006 [UI] Intégrer `<Pagination>` dans la page sessions client
- [ ] O007 [UI] Intégrer `<Pagination>` dans la page réservations client

---

## BLOC P — Messagerie : scroll + édition

- [ ] P001 [UI] Dans `app/pages/dashboard/messages.vue` (ou équivalent) : ajouter `overflow-y-auto max-h-[calc(100vh-200px)]` sur la liste des messages pour empêcher le dépassement du footer
- [ ] P002 [UI] Ajouter bouton "Modifier" sur les messages envoyés par l'utilisateur connecté
- [ ] P003 [API] Créer `PATCH /api/messages/:id` : vérifier que `message.userId === currentUser.id`, mettre à jour le contenu

---

## BLOC Q — Mise à jour dynamique (polling)

- [ ] Q001 [UI] Dans `app/pages/sessions/index.vue` : polling toutes les 30s via `setInterval` + `refresh()` de `useFetch`
- [ ] Q002 [UI] Dans `app/pages/dashboard/bookings.vue` : polling toutes les 30s
- [ ] Q003 [UI] Créer composable `app/composables/usePolling.ts` : encapsule `setInterval` + cleanup `onUnmounted`
- [ ] Q004 [UI] Ajouter indicateur visuel discret "Actualisation en cours…" pendant le polling

---

## BLOC R — Tests

- [ ] R001 [TEST] Tests unitaires `server/services/auth.service.ts` : couvrir `phone_taken`, `email_taken`, champs profil
- [ ] R002 [TEST] Tests unitaires `server/services/booking.service.ts` : couvrir `subscription_required`
- [ ] R003 [TEST] Tests unitaires `server/services/payments.service.ts` : couvrir cumul abonnement, pause/reprise
- [ ] R004 [TEST] Tests intégration `POST /api/auth/register` avec nouveaux champs obligatoires
- [ ] R005 [TEST] Tests intégration `POST /api/subscriptions/:id/pause` et `resume`

---

## Ordre d'exécution recommandé

```
A (DB user) → B (register form) → C (session unique) → D (idle timer)
→ E (profile page) → F (plans catalog) → G (booking gate) → H (expiration)
→ I (reminder email) → J (pause) → K (cumul) → L (couple check)
→ M (sessions fixes) → N (filtres dates) → O (pagination)
→ P (messages) → Q (polling) → R (tests)
```

Blocs parallélisables une fois les dépendances DB satisfaites : `E // F // G // H`
