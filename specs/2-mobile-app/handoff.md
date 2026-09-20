# NOTE DE PASSATION — Claude Code (VS Code)
## Souplesse Fitness Mobile — Finalisation en local + APK de démonstration

---

## 0. À lire en premier

Ce document est une note de passation, pas une spécification figée : quand une information manque, fais une hypothèse raisonnable, documente-la clairement dans ton commit/PR, et continue — ne bloque pas le travail pour une question mineure. En revanche, respecte strictement la section 3 (Garde-fous) : ce sont des limites, pas des suggestions.

### Priorité entre documents en cas de conflit

Le dépôt contient un fichier `STATUS.md` qui documentait l'état du projet **avant** la décision de pivot architectural décrite ici (extraction du backend dans un nouveau dépôt `souplesse-api` en NestJS, hébergement provisoire sur Render.com). `STATUS.md` est donc **partiellement obsolète** sur les points liés à cette décision — par exemple, s'il indique que le backend reste une extension de l'API Nitro/Prisma existante dans le monorepo, cette information est dépassée.

**Ce `handoff.md`, ainsi que `spec.md` et `architecture.md` fournis dans le même dossier, sont la source de vérité la plus récente et priment sur `STATUS.md` en cas de contradiction.** Règle à appliquer systématiquement :
1. Si tu rencontres une divergence entre `STATUS.md` et ces trois documents, **applique la version décrite ici**.
2. **Mets à jour `STATUS.md` en conséquence**, avec un court paragraphe expliquant que le pivot a été décidé (backend extrait vers `souplesse-api`, hébergement Render.com le temps de la démo, mobile inchangé dans `souplesse-speckit`).
3. **Ne t'arrête pas pour redemander confirmation sur ce point** — le pivot est déjà tranché et documenté ; poursuis le travail. Ne t'arrête que pour une divergence qui n'est couverte par **aucun** des trois documents de référence (voir garde-fou 7 de la section 3).

---

## 1. Objectif immédiat

**Produire une application mobile Android fonctionnelle de bout en bout, livrée sous forme d'un APK installable, pour une démonstration à des investisseurs/partenaires en vue d'obtenir le financement du déploiement en production.**

Il ne s'agit pas encore d'un lancement public : l'objectif est un produit qui **fonctionne réellement** sur les parcours principaux, démontrable sur un téléphone Android sans dépendre du Play Store ni d'infrastructure payante.

**Pas de budget disponible actuellement** — toute solution retenue pendant cette phase doit être gratuite ou déjà existante (Neon, Vercel, comptes Expo/GitHub gratuits). Ne provisionne aucune ressource payante (VPS, plan payant d'un service tiers, etc.) sans validation explicite préalable.

---

## 2. Contexte du projet

- Souplesse Fitness est une salle de sport à Cotonou, Bénin. Une plateforme web existe déjà (Nuxt/Nitro/Prisma/PostgreSQL) — **ne pas y toucher**, elle continue de fonctionner indépendamment.
- L'application mobile (Expo/React Native) est un produit **exclusivement mobile**, distinct du web, avec un flux de **paiement Mobile Money manuel** (aucun paiement in-app) : le client transfère l'argent hors application puis soumet une capture d'écran de confirmation, validée par un rôle Modérateur.
- 4 rôles/dashboards : Client, Coach, Modérateur, Admin.
- Décision architecturale prise (voir `architecture.md` fourni avec cette note) : séparer complètement le backend du web existant, dans un **nouveau backend NestJS**, dans un **nouveau dépôt GitHub indépendant** nommé `souplesse-api`, sans historique lié à l'ancien monorepo.
- Auth (inscription, connexion, vérification par SMS/OTP haché bcrypt via Africa's Talking) était déjà largement fonctionnelle dans l'ancien code — à **réimplémenter proprement** dans la nouvelle structure NestJS, pas à réinventer.

---

## 3. Garde-fous — à respecter impérativement

Ces règles priment sur toute instruction de vitesse ou d'autonomie. « Carte blanche » signifie que tu peux prendre des décisions d'implémentation sans redemander confirmation à chaque étape — cela ne signifie pas ignorer ces limites.

1. **Ne jamais toucher à la plateforme web existante ni à sa base de données de production directement.** Toute évolution du schéma Prisma partagé doit être faite via une migration versionnée, jamais par une commande destructive manuelle (`prisma db push --force-reset`, `DROP TABLE`, etc.).
2. **Ne jamais exécuter de migration de schéma contre la base de production sans vérification préalable du point de restauration (PITR Neon)** — travailler sur une base de développement/test séparée pendant cette phase, jamais directement sur les données réelles des membres.
3. **Ne jamais committer de secret** (clés API Africa's Talking, identifiants Neon, JWT secret, etc.) dans le dépôt Git — utiliser des fichiers `.env` non versionnés et un `.env.example` documenté.
4. **Ne provisionner aucune ressource payante** (VPS, plan payant d'un service cloud, compte Expo/EAS payant) sans validation explicite préalable — rester sur les offres gratuites existantes (Render.com gratuit pour l'API de démo, Neon gratuit, EAS Build gratuit).
5. **Ne pas supprimer de code ou de branche existante** sans une raison documentée dans le commit — en cas de doute sur l'utilité d'un fichier, le déplacer dans un dossier `legacy/` plutôt que le supprimer.
6. **Respecter les règles métier déjà validées**, notamment :
   - pas de nouvelle demande de paiement/abonnement tant qu'un abonnement est actif ou en pause ;
   - suppression de la capture d'écran de paiement uniquement après validation ou rejet définitif ;
   - vérification par SMS obligatoire et bloquante pour tout compte mobile.
7. **Si une décision structurante non couverte par ce document se présente** (ex. choix d'une librairie majeure non mentionnée, changement d'ORM, changement de la structure de rôles), documente ton choix et la raison dans le commit plutôt que de t'arrêter — mais signale-le clairement dans le résumé de fin de tâche pour validation ultérieure.
8. **Teste avant de considérer une fonctionnalité terminée** : au minimum, un test manuel du parcours de bout en bout sur l'app compilée (ou en mode dev Expo Go) avant de passer au module suivant.

---

## 4. Périmètre de travail pour cette phase (ordre recommandé)

0. **Consolider la documentation existante avant toute chose.** Le dépôt contient actuellement des fichiers `.md` dispersés dans `specs/2-mobile-app/` et dans `docs/` à la racine. Fais l'inventaire du contenu réel des deux dossiers, puis consolide selon cette structure :
   - `specs/2-mobile-app/spec.md` : cahier des charges fonctionnel (le fichier `spec.md` fourni avec cette note est la version de référence à intégrer/fusionner avec l'existant)
   - `specs/2-mobile-app/architecture.md` : architecture cible backend (le fichier `architecture.md` fourni avec cette note est la version de référence à intégrer/fusionner avec l'existant)
   - `specs/2-mobile-app/handoff.md` : ce présent document
   - `specs/2-mobile-app/compliance/` : dossier APDP et politique de confidentialité
   - `docs/` à la racine : conserver uniquement ce qui concerne le monorepo global ou le web, pas ce qui est spécifique au mobile
   Ne supprime aucun fichier existant sans être sûr qu'il est bien dupliqué ailleurs après fusion — en cas de doute, déplace-le dans `specs/2-mobile-app/legacy/` plutôt que de le supprimer. Fais un commit dédié à cette réorganisation, séparé des commits de code.
1. Créer le dépôt `souplesse-api` (nouveau, sans historique), scaffold NestJS selon la structure définie dans `architecture.md` (modules : auth, users, subscriptions, payments, coaching, notifications).
2. Réimplémenter le module **Auth** (inscription, connexion, vérification OTP SMS) en réutilisant le schéma Prisma existant, avec Africa's Talking derrière l'interface `SmsProvider` définie dans le document d'architecture.
3. Implémenter le module **Subscriptions** (formules 1/2/3/6/12 mois, statut actif/en pause/expiré, règle de non-renouvellement tant qu'actif).
4. Implémenter le module **Payments** (soumission de preuve, file de modération, validation/rejet, notification SMS + push via l'interface `PushProvider`, suppression de la capture après traitement).
5. Implémenter le module **Coaching** (planification de créneaux Client/Coach) si le temps le permet pour cette démo — sinon, le signaler comme non couvert dans cette itération plutôt que de le bâcler.
6. Déployer `souplesse-api` sur **Render.com (offre gratuite)** pour que l'app mobile compilée en APK puisse s'y connecter (voir section 9bis du document d'architecture).
7. Brancher l'application mobile (`EXPO_PUBLIC_API_URL`) sur cette instance Render.
8. Générer l'APK via `eas build --platform android --profile preview`.
9. Valider manuellement le parcours complet sur un appareil Android réel avant de livrer l'APK : inscription → OTP → connexion → choix de formule → upload de preuve de paiement → validation côté Modérateur → notification → dashboard Client à jour.

---

## 5. Definition of done pour cette phase

- [ ] `souplesse-api` déployé et accessible publiquement (Render.com)
- [ ] APK Android généré et installable, testé sur un appareil réel
- [ ] Parcours Client complet fonctionnel de bout en bout (inscription → paiement → validation → dashboard)
- [ ] Dashboard Modérateur fonctionnel (file de validation, validation/rejet)
- [ ] Aucun secret commité dans le dépôt
- [ ] `.env.example` à jour et documenté
- [ ] Résumé de fin de tâche listant : ce qui est fait, ce qui reste (ex. Coaching si non couvert), et toute décision structurante prise en autonomie à valider par Ange

---

## 6. Documents de référence fournis avec cette note

- `architecture.md` — architecture technique cible complète (stack, structure de dossiers, contrat d'API, plan de migration, infrastructure).
- `spec.md` — cahier des charges fonctionnel complet (personas, fonctionnalités, écrans, règles métier, conformité).
- `compliance/apdp-dossier.docx` et `compliance/privacy-policy.docx` — non prioritaires pour cette phase de démo, à connaître mais pas à intégrer techniquement maintenant (pas de champ requis dans l'app mobile pour cette itération, au-delà d'un lien vers la politique de confidentialité si le temps le permet).
