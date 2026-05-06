# Roadmap ImmoBF Africa

## Vue d'ensemble des jalons

| Version | Horizon     | Focus                                                       |
|---------|-------------|-------------------------------------------------------------|
| v0.1 MVP | Q2 2026    | Pilote Ouagadougou / Bobo-Dioulasso                         |
| v0.2    | Q3 2026     | Production BF + extension Côte d'Ivoire                     |
| v1.0    | Q4 2026     | UEMOA (SN, ML, TG, BJ, NE) + agences premium                |
| v1.5    | Q1 2027     | Ghana, Kenya (MTN MoMo, M-Pesa)                             |
| v2.0    | Q2-Q3 2027  | IA valuation avancée, VR tours, blockchain titres fonciers  |

## v0.1 — MVP (présent livrable)

- Catalogue avec recherche avancée + PostGIS.
- Publication d'annonces (propriétaire/agence) modérée par IA règles + heuristiques.
- Paiements : CinetPay, Orange Money BF, Moov Money BF, Wave — flow dépôt/escrow.
- Escrow manuel avec libération par admin/agent.
- Dashboard admin agrégats par ville + export CSV.
- Multi-langues FR/EN/Mooré/Dioula. Multi-devises XOF/USD/EUR.
- App mobile React Native (Expo) iOS + Android avec cache offline.
- PWA installable, service worker stale-while-revalidate.

## v0.2 — Production BF + CI (Q3 2026)

- **Agences** : abonnement mensuel (paiement récurrent CinetPay), dashboard lead/CRM.
- **KYC** : OCR pièce d'identité (Onfido / Veriff) pour vendeurs au-delà de 50 000 FCFA.
- **Chat** temps réel (Ably ou WebSocket natif) entre acheteur / vendeur / agent.
- **Notifications push** (Expo Push + FCM) et SMS via API Orange SMS BF.
- **Réconciliation automatique** des paiements pending > 24 h (cron).
- **Calculateur prêt bancaire** — partenariats pilote avec Coris Bank et UBA BF (API statique de taux).
- **Analytics** : Plausible auto-hébergé + dashboard interne (rétention cohort).
- **Extension CI** : activation des villes d'Abidjan + Bouaké, ajout MTN MoMo CI.

## v1.0 — UEMOA (Q4 2026)

- **Pays supportés** : BF, CI, SN, ML, TG, BJ, NE.
- **Flooz** (Togo) en provider direct, **MTN MoMo** (CI) en provider direct.
- **Multi-currency** affichage avec taux BCEAO cachés (refresh quotidien).
- **Escrow automatisé** avec libération planifiée (30 j) et clause litige.
- **Titres fonciers** : import lecture seule de la base SNEA / DPI (Burkina) via API Web ; mise en correspondance par numéro de titre foncier.
- **Visites 360°** hébergement natif (upload équirectangulaire + Pannellum/Marzipano).
- **Boost premium** : coût dynamique selon ville (Ouaga > Bobo).
- **App mobile** : notifications géolocalisées (« nouvelles annonces à 5 km »).

## v1.5 — Afrique anglophone (Q1 2027)

- **Pays** : GH, KE, TZ, UG, RW.
- **MTN MoMo Ghana / Kenya / Rwanda**, **M-Pesa Safaricom**, **Airtel Money**.
- **Multi-currency étendu** : GHS, KES, TZS, UGX, RWF.
- **Services additionnels** :
  - matching acheteur/vendeur par embeddings (OpenAI text-embedding ou local) et filtres comportementaux ;
  - calculateur de mensualités avec API banques partenaires (3+ banques par pays).
- **Pricing dynamique** du boost selon saisonnalité et volume.

## v2.0 — Innovation (Q2-Q3 2027)

### Valuation IA avancée

- Modèle ML (XGBoost → LightGBM → DNN selon volume) entraîné sur les ventes confirmées.
- Features : type, surface, localisation (géohash + embeddings quartier), équipements, indice prix ville BCEAO.
- API `POST /properties/estimate-ai` qui remplace l'estimation naïve actuelle.
- Intervalle de confiance et comparables cliquables.

### Visites VR / 3D

- Upload direct depuis smartphone avec stabilisation (WebXR A-Frame côté web).
- Support casques Meta Quest 3 : tours immersifs commentés par l'agent.
- Génération automatique de plans 2D à partir des visites 360° (LiDAR iPhone + photogrammétrie).

### Blockchain & titres fonciers

- Smart contract (Polygon PoS ou Hedera, faible empreinte carbone) pour enregistrer :
  - la promesse de vente signée numériquement ;
  - la libération de l'escrow ;
  - le transfert de titre foncier (si SNEA/DPI exposent une API de notarisation).
- Wallet custodial pour les utilisateurs non-crypto (clé gérée côté plateforme, signature déléguée).
- Conformité juridique locale : validation pilote avec notaires de Ouagadougou.

### Open banking & crédit

- Connexion comptes bancaires (partenariats Coris, UBA, Ecobank) pour évaluer le pouvoir d'achat.
- Pré-approbation prêt en 48 h directement depuis l'annonce.

### Expansion latérale

- **ImmoBF Rentals** : module location longue durée + courte durée (concurrent léger d'Airbnb Afrique).
- **ImmoBF Pro** : outils agents (signature électronique, génération de contrats, agenda visites).

## KPI cibles par version

| Version | MAU      | Annonces actives | Transactions/mois | CA brut/mois     |
|---------|----------|------------------|-------------------|------------------|
| v0.1    | 2 000    | 500              | 40                | 1,5 M FCFA       |
| v0.2    | 10 000   | 2 500            | 250               | 12 M FCFA        |
| v1.0    | 50 000   | 15 000           | 1 500             | 80 M FCFA        |
| v1.5    | 250 000  | 80 000           | 8 000             | 500 M FCFA       |
| v2.0    | 1 M      | 350 000          | 40 000            | 3 Mds FCFA       |

## Backlog ouvert (issues `good-first-issue`)

- [ ] Tests e2e Playwright (scénario recherche + paiement mock)
- [ ] Import d'annonces depuis Afribaba / Jumia (scrapers respectueux)
- [ ] Mode sombre (préférence système + toggle)
- [ ] Composant carte avec clustering Leaflet.markercluster
- [ ] Export PDF liste d'annonces pour agences
- [ ] Widget WhatsApp Business pour contact direct
- [ ] Intégration Expo Push Notifications
- [ ] Script de réconciliation cron (`backend/scripts/reconcile.js`)
- [ ] Pipeline de génération de plans 2D depuis 360°
- [ ] Dashboard équipe support (tickets, SLA)

## Dépendances critiques (à sécuriser)

1. **Accords marchand** directs avec Orange BF, Moov BF, Wave. Sinon rester sur CinetPay.
2. **Partenariat SNEA/DPI** pour accès titres fonciers (conventions ministère de l'habitat).
3. **Banque partenaire d'escrow** conforme BCEAO (Coris ou Ecobank) pour le compte séquestre réel.
4. **Certification PCI-DSS** non requise (paiements via agrégateurs), mais audit sécurité annuel recommandé.
