# Cahier des charges — Application Mobile Souplesse Fitness

**Version 2.1 — Août 2026**
Application mobile autonome (iOS & Android) — Volet fonctionnel, technique, juridique et conformité App Store / Play Store
Cotonou, République du Bénin — Référence projet : `sonron1/souplesse-spec-kit` — Extension Mobile

> Ce document est la version canonique en Markdown, tenue à jour dans le dépôt.
> Pour l'état d'avancement du projet (ce qui est fait, ce qui reste à faire), voir
> [`STATUS.md`](./STATUS.md) — ne pas dupliquer ces informations ici.

---

## Sommaire

1. [Introduction et contexte](#1-introduction-et-contexte)
2. [Vision produit et périmètre de l'application mobile](#2-vision-produit-et-périmètre-de-lapplication-mobile)
3. [Spécifications fonctionnelles](#3-spécifications-fonctionnelles)
4. [Maquettes et expérience utilisateur (UI/UX)](#4-maquettes-et-expérience-utilisateur-uiux)
5. [Architecture technique](#5-architecture-technique)
6. [Sécurité et conformité technique générale](#6-sécurité-et-conformité-technique-générale)
7. [Aspects juridiques et réglementaires (Bénin / UEMOA)](#7-aspects-juridiques-et-réglementaires-bénin--uemoa)
8. [Conformité Google Play Store (priorité au lancement)](#8-conformité-google-play-store-priorité-au-lancement)
9. [Conformité Apple App Store (Phase 2 — à ne pas oublier)](#9-conformité-apple-app-store-phase-2--à-ne-pas-oublier)
10. [Recommandations stratégiques](#10-recommandations-stratégiques)
11. [Plan de développement et jalons](#11-plan-de-développement-et-jalons)
12. [Prérequis et outils à mettre en place](#12-prérequis-et-outils-à-mettre-en-place)
13. [Annexe — Checklist de soumission](#13-annexe--checklist-de-soumission)

---

## 1. Introduction et contexte

### 1.1 Présentation du projet existant

Souplesse Fitness est une salle de sport et de musculation basée à Cotonou (carrefour Lita), disposant d'une **plateforme web de gestion** (Nuxt 4 / Nitro / Prisma / PostgreSQL) permettant l'inscription des membres, la souscription à des abonnements, la réservation de séances, le suivi des programmes coach, ainsi qu'un tableau de bord d'administration.

Ce document couvre l'application mobile autonome, avec un principe central : **l'application ne traite et ne fait transiter aucun paiement elle-même.** Elle sert exclusivement à recueillir et à faire valider par un modérateur la preuve d'un paiement Mobile Money effectué par le client en dehors de l'application.

### 1.2 Constat et motivation du passage au mobile

- Le public cible utilise les usages Mobile Money classiques (MTN Mobile Money, Moov Money, Celtiis) : transfert direct suivi d'une preuve, plutôt qu'un parcours de paiement en ligne intégré.
- Une application native offre de meilleures performances, des notifications fiables (SMS + push), et une image de marque plus forte que le site web seul.
- Séparer la vérification de paiement du traitement du paiement lui-même simplifie considérablement la conformité réglementaire et la conformité aux règles des stores.

### 1.3 Périmètre du présent document

Ce cahier des charges couvre : les spécifications fonctionnelles (souscription, validation de preuve, notifications, programmes), l'expérience utilisateur, l'architecture technique, les évolutions de la base de données et de l'API existantes, les obligations légales au Bénin/UEMOA, ainsi que les règles de conformité Google Play (priorité de lancement) et Apple App Store (phase 2).

---

## 2. Vision produit et périmètre de l'application mobile

### 2.1 Objectifs

1. Offrir une expérience mobile native fluide pour l'inscription, la souscription, la vérification de paiement, la réservation de séances et le suivi des programmes.
2. Fiabiliser la vérification des paiements Mobile Money par un contrôle humain simple, rapide et traçable — sans que l'application ne manipule elle-même de fonds.
3. Publier en priorité sur Google Play, tout en construisant l'application de façon à pouvoir ajouter l'App Store plus tard sans réécriture complète (voir section 10).
4. Réutiliser au maximum le backend existant (API Nitro / Prisma) pour accélérer le développement.

### 2.2 Rôles utilisateurs

L'application distingue **quatre rôles**, avec un tableau de bord dédié à chacun. C'est une évolution par rapport à l'application web actuelle (qui ne connaît que `CLIENT` / `COACH` / `ADMIN`) : le rôle `ADMIN` y est scindé en deux rôles mobiles distincts, **Modérateur** et **Admin**.

| Rôle | Capacités principales |
|---|---|
| **Client** | Créer un compte, choisir une durée d'abonnement, envoyer une capture d'écran de paiement, suivre le statut de validation, réserver des séances, consulter son programme avec son coach |
| **Coach** | Toutes les capacités Client + créer des séances, gérer les programmes des clients qui lui sont assignés |
| **Modérateur** *(nouveau rôle)* | Consulter la file d'attente des preuves de paiement soumises, valider ou rejeter chaque preuve, consulter l'historique de ses décisions |
| **Admin** | Administration générale : gestion des utilisateurs, assignation coach ↔ client, historique des paiements, export CSV, tableau de bord KPI |

### 2.3 Ce que l'application ne fait PAS

**Point essentiel :** l'application ne collecte aucune information de carte bancaire, ne déclenche aucun transfert Mobile Money, et n'est reliée à aucune API d'agrégateur de paiement. Le client paie de lui-même, depuis son propre téléphone, en dehors de l'application, puis revient uniquement pour soumettre une preuve visuelle (capture d'écran). Cette distinction est structurante pour toute la suite du document — elle simplifie la conformité juridique et la conformité aux stores.

---

## 3. Spécifications fonctionnelles

### 3.1 Parcours Client

1. Inscription (nom, email, téléphone, mot de passe) et connexion (JWT access + refresh, comme sur le web).
2. Écran « Abonnement » : le client choisit une durée parmi **1, 2, 3, 6 ou 12 mois**, avec le tarif correspondant affiché.
3. Écran « Preuve de paiement » : le client envoie la capture d'écran de son paiement Mobile Money (MTN, Moov ou Celtiis) effectué vers le numéro désigné de la salle, avec le montant et la durée choisie rappelés.
4. Statut affiché en temps réel dans l'app : « En attente de vérification » → « Validé » ou « Rejeté ».
5. Réception automatique d'un **SMS et d'une notification push** dès la décision du modérateur (validation ou rejet) — les deux canaux sont envoyés en parallèle.
6. Si validé : un **compteur de jours restants** avant expiration s'affiche sur le tableau de bord, et le client peut dès lors planifier son programme avec son coach et réserver des séances.
7. Si rejeté : le SMS et la notification push précisent le motif ; le client peut soumettre une nouvelle capture d'écran corrigée.

### 3.2 Parcours Coach

- Création et gestion de créneaux de séances.
- Création/mise à jour des programmes pour les clients qui lui sont explicitement assignés par un admin, uniquement une fois l'abonnement du client validé.

### 3.3 Parcours Modérateur — vérification des preuves de paiement

Un tableau de bord dédié présente la file d'attente des preuves soumises :

- Liste des soumissions en attente, triées par date, avec durée d'abonnement choisie, montant attendu, numéro Mobile Money de l'émetteur déclaré, opérateur (MTN / Moov / Celtiis) et capture d'écran jointe.
- Le modérateur ouvre la capture en plein écran, la compare manuellement au paiement attendu (montant, numéro bénéficiaire, date), puis Valide ou Rejette (motif obligatoire en cas de rejet).
- **Validation** : activation immédiate de l'abonnement (statut `ACTIVE`, date d'expiration calculée selon la durée choisie), envoi automatique d'un SMS **et** d'une notification push de confirmation au client.
- **Rejet** : envoi automatique d'un SMS **et** d'une notification push avec le motif ; le client peut soumettre une nouvelle preuve.
- Journal d'audit : chaque décision (qui, quand, quelle décision, quel motif) est historisée — indispensable pour la traçabilité et la gestion des litiges.

### 3.4 Parcours Admin — administration générale

- Tableau de bord KPI : membres actifs, abonnements actifs, revenu du mois, coachs actifs.
- Gestion des utilisateurs (liste paginée, recherche, désactivation de compte).
- Assignation d'un coach à un client (`POST /api/admin/assignments`) et retrait d'assignation.
- Historique des paiements validés, export CSV (utilisateurs + paiements).

### 3.5 Flux détaillé — de la souscription à l'activation

| Étape | Écran / Action |
|---|---|
| 1 | Le client se connecte et ouvre l'option « Abonnement ». |
| 2 | Il choisit une durée : 1, 2, 3, 6 ou 12 mois — le tarif correspondant s'affiche. |
| 3 | Écran « Instructions de paiement » : numéro Mobile Money du bénéficiaire affiché clairement, montant exact à envoyer selon la durée choisie. |
| 4 | Le client effectue lui-même le transfert Mobile Money (MTN, Moov ou Celtiis) depuis son propre téléphone, en dehors de l'application. |
| 5 | Retour dans l'application : il envoie la capture d'écran de confirmation de paiement (caméra ou galerie). |
| 6 | Statut « En attente de vérification » affiché, avec délai indicatif. |
| 7 | Le modérateur traite la demande (voir 3.3) : Valide ou Rejette. |
| 8 | Le client reçoit un SMS et une notification push (validation ou rejet). Si validé, le compteur d'abonnement démarre sur son tableau de bord et il peut planifier son programme avec son coach. |

> **Point d'attention produit :** ce flux introduit un délai (le temps de la vérification manuelle). Il doit être compensé par un traitement rapide côté modération (objectif recommandé : moins de 2h en heures ouvrées) et une communication claire dans l'app et par SMS sur les délais.

---

## 4. Maquettes et expérience utilisateur (UI/UX)

### 4.1 Principes de design

- Identité visuelle : couleur de marque `#EAB308` (celle du site), thème sombre, typographies **Manrope** (titres) + **Inter** (texte).
- Parcours de souscription en 3 à 4 écrans maximum (choix durée → instructions → envoi preuve → statut), avec indicateur de progression.
- États explicites et visibles : « En attente », « Validé », « Rejeté » avec code couleur, sur l'abonnement et l'historique.
- Le compteur de jours restants est mis en avant sur le tableau de bord client dès l'abonnement validé (anneau de progression animé).
- Accessibilité : contrastes suffisants, tailles de police ajustables, zones tactiles ≥ 44×44 dp.

### 4.2 Liste des écrans principaux

| Module | Écrans |
|---|---|
| Onboarding / Auth | Splash, Connexion, Inscription, Mot de passe oublié |
| Abonnement | Choix de la durée (1/2/3/6/12 mois), Récapitulatif tarif, Instructions de paiement, Envoi de la capture, Écran de statut |
| Dashboard Client | Accueil (compteur de jours restants, prochaine séance), Réservation, Programme avec le coach, Historique, Profil |
| Dashboard Coach | Accueil, Clients assignés, Séances à venir, Création de séance |
| Dashboard Modérateur | File d'attente des preuves, Détail + zoom capture, Décision (valider/rejeter), Historique |
| Dashboard Admin | Vue d'ensemble KPI, Gestion des utilisateurs, Paiements, Assignation coach/client, Export CSV |

### 4.3 État des maquettes

Des prototypes cliquables (HTML/CSS/JS autonomes) ont été produits et validés pour l'ensemble des écrans ci-dessus. Voir [`prototypes/`](./prototypes/) dans ce même dossier.

---

## 5. Architecture technique

### 5.1 Stack recommandée

| Composant | Choix recommandé | Justification |
|---|---|---|
| Framework mobile | React Native + Expo (TypeScript) | Un seul code base pour Android et iOS. On publie d'abord uniquement sur Android, mais le même code pourra être soumis sur l'App Store plus tard sans réécriture |
| Backend | Extension de l'API Nitro/Prisma existante | Réutilise l'authentification JWT, les modèles de données et la logique métier déjà testés |
| Base de données | PostgreSQL (inchangée) | Déjà en place, migrations Prisma |
| Stockage des captures d'écran | S3-compatible (AWS S3, Cloudflare R2 ou équivalent) avec URLs signées à durée limitée | Aucune image sensible en accès public ; accès strictement réservé aux modérateurs/admins |
| Notifications | Double canal : passerelle SMS (Africa's Talking, Vonage, ou fournisseur SMS local béninois) **et** Firebase Cloud Messaging (push) | Le SMS garantit la réception même sans connexion data ; le push est instantané. Les deux sont envoyés en parallèle à chaque décision de modération |

### 5.2 Évolutions du modèle de données (Prisma)

- **`User.role`** : ajouter la valeur `MODERATOR` à l'énumération existante (`CLIENT`, `COACH`, `ADMIN`) → `CLIENT`, `COACH`, `MODERATOR`, `ADMIN`.
- **`SubscriptionPlan.durationMonths`** (entier) : 1, 2, 3, 6 ou 12 — remplace/complète l'énumération `PlanType` actuelle.
- **`PaymentProof`** : `id`, `userId`, `subscriptionPlanId`, `amountDeclared`, `senderMobileNumber`, `operator` (`MTN` / `MOOV` / `CELTIIS`), `screenshotUrl`, `status` (`PENDING` / `APPROVED` / `REJECTED`), `reviewedByUserId`, `reviewedAt`, `rejectionReason`, `createdAt`.
- **`ModerationLog`** : `id`, `paymentProofId`, `moderatorId`, `action`, `reason`, `createdAt` — journal d'audit immuable des décisions.
- **`NotificationLog`** : `id`, `userId`, `paymentProofId`, `type` (`APPROVAL` / `REJECTION`), `channel` (`SMS` / `PUSH`), `destination`, `sentAt`, `providerStatus`.
- **`DeviceToken`** : `id`, `userId`, `fcmToken`, `platform` (`ANDROID` / `IOS`), `createdAt`.

### 5.3 Nouvelles routes API

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/payments/proof/upload` | Upload sécurisé de la capture d'écran (multipart, limite de taille/type) |
| `POST` | `/api/payments/proof` | Soumission d'une preuve de paiement (référence à l'upload + durée choisie + numéro émetteur) |
| `GET` | `/api/moderation/proof/pending` | File d'attente des preuves en attente (paginée) — réservé au rôle `MODERATOR` |
| `POST` | `/api/moderation/proof/:id/approve` | Validation → activation atomique de l'abonnement + déclenchement SMS et push |
| `POST` | `/api/moderation/proof/:id/reject` | Rejet avec motif obligatoire + déclenchement SMS et push |
| `POST` | `/api/notifications/register-device` | Enregistrement du token FCM de l'appareil |

### 5.4 Sécurité du stockage des preuves de paiement

- Upload direct vers un bucket privé (jamais public), via URL pré-signée à courte durée de vie.
- Validation stricte du type MIME et de la taille (images uniquement, ≤ 5 Mo).
- Accès en lecture restreint aux rôles Modérateur/Admin, journalisé (qui a consulté quelle preuve, quand).

---

## 6. Sécurité et conformité technique générale

- Authentification JWT (access token courte durée, refresh token stocké haché), identique au système web existant.
- Chiffrement en transit (TLS 1.2+) obligatoire pour toutes les communications, y compris l'upload des captures d'écran.
- Limitation de débit sur les routes d'authentification et de soumission de preuve, pour prévenir le spam de fausses soumissions.
- Détection de doublons : blocage des soumissions réutilisant la même image (hash) ou la même référence, pour limiter la fraude par réutilisation de capture d'écran.
- Tests automatisés couvrant en priorité l'authentification et le module de validation de preuve.

---

## 7. Aspects juridiques et réglementaires (Bénin / UEMOA)

### 7.1 Protection des données à caractère personnel

Le Bénin dispose d'un cadre légal dédié : le **Code du numérique (Loi n°2017-20 du 20 avril 2018)**, dont le Livre III encadre la protection des données à caractère personnel, sous la supervision de l'**Autorité de Protection des Données à caractère Personnel (APDP)**. L'application traite des données sensibles : identité, numéro de téléphone, et des captures d'écran de transactions financières.

- Effectuer une déclaration/autorisation auprès de l'APDP avant le lancement.
- Rédiger une politique de confidentialité claire précisant les données collectées, la finalité, la durée de conservation et les modalités de suppression.
- Prévoir une fonctionnalité de suppression de compte et de données, exigée par la loi béninoise et par Google Play.

### 7.2 Cadre applicable au Mobile Money

Les services de monnaie électronique dans l'UEMOA sont régis par la réglementation de la **BCEAO**. Puisque l'application **n'effectue elle-même aucun mouvement de fonds** — elle affiche uniquement des instructions et collecte une preuve visuelle — Souplesse Fitness n'agit pas comme émetteur de monnaie électronique ni comme prestataire de services de paiement.

- Utiliser un numéro Mobile Money « marchand » (compte professionnel MTN MoMo Business / Moov Money Pro / Celtiis Pro) plutôt qu'un numéro personnel.
- Préciser explicitement dans les CGU/CGV que Souplesse Fitness n'est pas un établissement de monnaie électronique, que le transfert s'effectue directement entre le client et l'opérateur, et que l'application ne fait que vérifier une preuve pour activer l'abonnement.

### 7.3 Obligations fiscales et comptables

- Les paiements reçus doivent être déclarés conformément aux obligations fiscales béninoises (DGI) ; conserver un lien systématique entre chaque preuve validée et une pièce comptable.
- Émission de reçus/factures aux clients recommandée, même de façon simplifiée dans l'app (PDF téléchargeable).

### 7.4 Documents juridiques à produire avant publication

- Conditions Générales d'Utilisation (CGU).
- Conditions Générales de Vente / politique d'abonnement (remboursement, résiliation).
- Politique de confidentialité (URL publique, obligatoire pour Google Play).
- Mentions légales de l'éditeur de l'application.

---

## 8. Conformité Google Play Store (priorité au lancement)

### 8.1 Politique de paiement Google Play Billing

Google Play Billing est en principe requis pour tout achat de contenu ou service numérique effectué à l'intérieur de l'application. Ici, l'application ne propose aucun achat in-app : elle affiche des instructions de paiement externes et collecte une preuve après un paiement déjà effectué hors de l'app, pour un service physique (accès à la salle de sport). Cette configuration correspond à l'exception « biens et services physiques/réels consommés en dehors de l'application ».

### 8.2 Déclaration de transparence dans la Play Console

- Déclarer précisément que l'application ne traite ni ne stocke elle-même les fonds.
- Éviter toute formulation dans l'app ou la fiche store qui laisserait penser que l'application est elle-même un service de paiement.

### 8.3 Data Safety et permissions

- Section « Data Safety » : données de contact, images (preuves de paiement), données financières indirectes.
- Permission caméra/galerie justifiée uniquement pour l'upload de la preuve de paiement.
- Le SMS et le push sont envoyés depuis le backend : l'application n'a besoin d'aucune permission SMS/Appels côté client.
- Politique de suppression de compte et de données accessible in-app ou via une page web dédiée.

### 8.4 Checklist technique Android

- Cible d'API Android récente (Target SDK conforme aux exigences Google Play en vigueur au moment de la soumission).
- Fiche store complète : icône, captures d'écran, description, catégorie « Santé et remise en forme ».
- Compte de démonstration fourni si l'accès nécessite une authentification pour la review.

---

## 9. Conformité Apple App Store (Phase 2 — à ne pas oublier)

> Cette section n'est pas prioritaire pour le lancement initial (Android uniquement), mais elle est conservée intentionnellement : l'App Store est prévu dans un second temps et l'architecture (React Native/Expo, voir section 10) est choisie pour permettre cet ajout sans réécriture.

### 9.1 Paiement in-app (Guideline 3.1)

Apple impose en principe **In-App Purchase** (StoreKit) pour tout contenu numérique consommé à l'intérieur de l'app (Guideline 3.1.1). La Guideline **3.1.3(b)** et l'exception relative aux biens/services physiques consommés en dehors de l'application (accès à une salle de sport) s'appliquent ici, comme pour Google Play.

### 9.2 Autres exigences Apple à anticiper

- Compte de démonstration fonctionnel pour la review.
- Suppression de compte accessible directement depuis l'application (Guideline 5.1.1(v)).
- « App Privacy » (nutrition label) renseignée précisément dans App Store Connect.
- Guideline 4.2 (Minimum Functionality) : l'app doit offrir une expérience native complète, pas un wrapper du site web.
- Demande d'autorisation explicite avant l'accès à l'appareil photo/galerie.

### 9.3 Quand l'activer

Une fois la version Android stabilisée en production et le flux de vérification de preuve éprouvé auprès des premiers utilisateurs réels, la même base React Native pourra être compilée pour iOS (via EAS Build) et soumise à Apple avec un minimum d'adaptations.

---

## 10. Recommandations stratégiques

1. Construire l'application en React Native dès le départ (et non en Kotlin natif), même si seul Android est publié dans un premier temps : cela évite une réécriture complète lorsque l'App Store sera activé (section 9).
2. Fixer un objectif de délai de vérification des preuves (SLA interne, ex. moins de 2h en heures ouvrées) pour compenser l'absence d'activation instantanée, et l'afficher clairement au client.
3. Mettre en place une détection de doublons (hash d'image, référence de transaction) dès la version 1 pour limiter la fraude par réutilisation de captures d'écran.
4. Prévoir, dans le futur, un canal de vérification complémentaire (relevé d'agrégateur ou API opérateur) si le volume de demandes rend la vérification humaine trop lente — à réévaluer une fois le volume réel connu, sans complexifier la version 1.

---

## 11. Plan de développement et jalons

| Phase | Contenu | Durée indicative |
|---|---|---|
| 1. Cadrage & maquettes | Cahier des charges, maquettes haute-fidélité de tous les écrans | ✅ Terminé |
| 2. Socle mobile & Auth | Initialisation React Native/Expo, authentification JWT, navigation, design system | 1 semaine |
| 3. Module abonnement & preuve de paiement | Écrans de souscription (1-12 mois), envoi de preuve, statuts ; API `PaymentProof` + stockage sécurisé | 2 semaines |
| 4. Dashboard Modérateur | File d'attente, validation/rejet, déclenchement SMS/push, journal d'audit | 1 à 2 semaines |
| 5. SMS, push & compteur d'abonnement | Passerelle SMS + Firebase Cloud Messaging, compteur de jours restants | 4 à 6 jours |
| 6. Dashboard Admin, réservation & programmes | KPI, gestion utilisateurs, assignations ; portage sessions/bookings/programmes | 1 à 2 semaines |
| 7. Durcissement & conformité Google Play | Textes légaux, Data Safety, compte démo, suppression de compte | 1 semaine |
| 8. Soumission Google Play | Soumission Play Console, réponses aux retours des reviewers | quelques jours à 2 semaines |
| 9. Phase 2 — App Store (ultérieure) | Build iOS, argumentaire de review Apple, soumission App Store Connect | à planifier après stabilisation Android |

> Le détail au jour le jour (ce qui est en cours, ce qui bloque) vit dans [`STATUS.md`](./STATUS.md), pas dans ce tableau.

---

## 12. Prérequis et outils à mettre en place

- Compte Google Play Console (frais unique ~25 $).
- Compte Expo/EAS (build et soumission automatisée).
- Compte auprès d'une passerelle SMS (Africa's Talking, Vonage, ou fournisseur SMS local béninois).
- Compte Firebase (gratuit) pour les notifications push.
- Bucket de stockage sécurisé (AWS S3, Cloudflare R2 ou équivalent).
- Numéro(s) Mobile Money professionnel(s) MTN MoMo Business, Moov Money Pro et/ou Celtiis Pro.
- Compte Apple Developer Program (99 $/an) — à prévoir en phase 2, non urgent pour le lancement Android.
- Accompagnement juridique local pour la déclaration APDP et la rédaction finale des CGU/CGV.

---

## 13. Annexe — Checklist de soumission

| Élément | Google Play (priorité) | Apple App Store (phase 2) |
|---|---|---|
| Politique de confidentialité (URL publique) | Obligatoire | Obligatoire |
| Compte de démonstration pour la review | Recommandé | Obligatoire |
| Suppression de compte in-app | Obligatoire | Obligatoire (5.1.1(v)) |
| Déclaration Data Safety / App Privacy | Obligatoire | Obligatoire |
| Justification de l'absence de Billing/StoreKit | Obligatoire | Obligatoire |
| CGU / CGV / politique de remboursement | Obligatoire | Obligatoire |
| Permissions caméra/galerie justifiées | Obligatoire | Obligatoire |
| Fiche store complète | Obligatoire | Obligatoire |

---

*Fin du document — Version 2.1*
