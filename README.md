# ImmoBF Africa

Plateforme immobilière open-source dédiée au Burkina Faso, extensible à l'UEMOA et à toute l'Afrique. Catalogue, annonces, transactions sécurisées via mobile money (Orange Money, Moov Money, Wave, CinetPay multi-opérateurs), escrow, estimation IA, multi-langues.

> **Statut**: MVP v0.1 — production-ready pour pilote Ouagadougou / Bobo-Dioulasso. Architecture cloud-native à coût maîtrisé (<100 USD/mois jusqu'à ~10k utilisateurs actifs).

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Architecture](#architecture)
3. [Pré-requis](#pré-requis)
4. [Démarrage rapide (1-clic local)](#démarrage-rapide)
5. [Déploiement production](#déploiement-production)
6. [Structure du repo](#structure-du-repo)
7. [Paiements mobile money](#paiements-mobile-money)
8. [Tests](#tests)
9. [Roadmap](#roadmap)
10. [Contribuer](#contribuer)

## Fonctionnalités

### MVP (v0.1)

- **Catalogue** : recherche par ville, prix FCFA, type (terrain/maison/appartement/bureau), superficie, GPS ; filtres photos 360° et visites virtuelles.
- **Annonces** : publication par propriétaires/agences, modération IA anti-fraude (stub pluggable), photos multiples, géolocalisation.
- **Paiements mobile money** : CinetPay (multi-opérateurs), Orange Money Burkina, Moov Money, Wave. Webhooks signés HMAC, reçus PDF.
- **Escrow** : fonds bloqués jusqu'à signature, libération manuelle ou automatique.
- **Dépôt de garantie/acompte** : 1-10 % du prix, configurable par annonce.
- **Multi-langues** : français, anglais, mooré, dioula (i18next).
- **Multi-devises** : FCFA (XOF) par défaut, USD, EUR ; conversion via taux BCEAO cacheable.
- **Géolocalisation** : PostGIS + OpenStreetMap (Leaflet côté client, gratuit).
- **Chat/visio** : signaling WebRTC (hook prêt pour Daily.co ou Agora).
- **Dashboard agence** : annonces, leads, ventes par ville, export CSV/Excel.
- **PWA offline-first** : annonces cachées côté client, requêtes queue en arrière-plan.
- **Mobile natif** : React Native (Expo) iOS/Android.

### Scalabilité Afrique

- **APIs paiement modulaires** : interface `PaymentProvider` — ajoute MTN MoMo (Ghana/Ouganda/Côte d'Ivoire), Flooz (Togo), M-Pesa (Kenya/Tanzanie) en implémentant une classe.
- **Multi-pays** : table `countries` + règles fiscales/commission par pays.
- **Conformité BCEAO/UEMOA** : journalisation immuable des transactions (Mongo), retention 10 ans.

## Architecture

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour les diagrammes Mermaid détaillés.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Next.js    │     │ React Native│     │ Admin panel │
│  (PWA web)  │     │  (iOS/And.) │     │   (Next.js) │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └─────────┬─────────┴────────┬──────────┘
                 │                  │
           ┌─────▼──────┐    ┌──────▼─────┐
           │ API Gateway│    │  CDN Edge  │
           │  (Node.js) │    │  (images)  │
           └─────┬──────┘    └────────────┘
                 │
     ┌───────────┼───────────┬──────────┬─────────┐
     │           │           │          │         │
┌────▼───┐ ┌─────▼────┐ ┌────▼───┐ ┌───▼────┐ ┌──▼────┐
│Auth svc│ │Property  │ │Payment │ │Escrow  │ │Notif. │
│  JWT   │ │  svc     │ │svc (MM)│ │ svc    │ │ svc   │
└────┬───┘ └─────┬────┘ └────┬───┘ └───┬────┘ └──┬────┘
     │           │           │          │         │
     └─────┬─────┴─────┬─────┴──────────┘         │
           │           │                          │
     ┌─────▼───┐  ┌────▼────┐  ┌──────────┐  ┌───▼────┐
     │Postgres │  │ Redis   │  │ MongoDB  │  │ SMS/   │
     │+PostGIS │  │ cache   │  │tx-logs   │  │ Email  │
     └─────────┘  └─────────┘  └──────────┘  └────────┘
```

## Pré-requis

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14 (avec extension PostGIS)
- **Redis** ≥ 6
- **MongoDB** ≥ 5 (logs transactions, optionnel dev)
- **Docker & docker-compose** (recommandé pour dev local)

## Démarrage rapide

```bash
# 1. Cloner
git clone https://github.com/<your-org>/immobf-africa.git
cd immobf-africa

# 2. Copier les variables d'environnement
cp backend/.env.example backend/.env
cp frontend-web/.env.example frontend-web/.env.local

# 3. Lancer toute la stack (postgres + redis + mongo + api + web)
docker-compose up -d

# 4. Migrations + seed
docker-compose exec api npm run migrate
docker-compose exec api npm run seed

# 5. Ouvrir
#    API:    http://localhost:4000/health
#    Web:    http://localhost:3000
#    Admin:  http://localhost:3000/admin
```

Pour le développement hors Docker :

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend-web && npm install && npm run dev

# Mobile
cd mobile && npm install && npx expo start
```

### Identifiants de seed

| Rôle       | Email                         | Mot de passe |
|------------|-------------------------------|--------------|
| Admin      | admin@immobf.africa            | admin2026    |
| Agence     | agence@demo.bf                 | demo1234     |
| Propriétaire | proprio@demo.bf              | demo1234     |
| Acheteur   | acheteur@demo.bf               | demo1234     |

## Déploiement production

📖 **Runbook complet pas-à-pas : [`docs/DEPLOY_PROD.md`](./docs/DEPLOY_PROD.md)** (durée 2-3 h, coût ~30 USD/mois)

### Option A — Vercel + Railway (recommandé)

```bash
# 1. Push le repo sur GitHub
git push -u origin main

# 2. Setup Railway (backend + Postgres + Redis)
cd backend && railway init && railway up

# 3. Setup Vercel (frontend Next.js)
cd ../frontend-web && vercel --prod

# 4. Configure les secrets en une commande interactive
./scripts/setup-secrets.sh

# 5. À chaque push sur main, GitHub Actions redéploie auto
git push origin main

# 6. Smoke test la prod
./scripts/smoke-prod.sh https://api.immobf.africa
```

Templates `.env` détaillés :
- [`backend/.env.production.example`](./backend/.env.production.example)
- [`frontend-web/.env.production.example`](./frontend-web/.env.production.example)

Workflows CI/CD :
- [`.github/workflows/deploy-backend.yml`](./.github/workflows/deploy-backend.yml) — tests + Railway deploy
- [`.github/workflows/deploy-frontend.yml`](./.github/workflows/deploy-frontend.yml) — build + Vercel deploy

### Option B — VPS AWS Lightsail / Scaleway / Hetzner (~15-20 USD/mois)

Voir [`docs/DEPLOY_VPS.md`](./docs/DEPLOY_VPS.md) pour le guide nginx + pm2 + certbot.

### Go-live

Avant d'annoncer publiquement, dérouler [`docs/GO_LIVE_CHECKLIST.md`](./docs/GO_LIVE_CHECKLIST.md) — smoke tests, paiement live 100 FCFA par opérateur, monitoring.

## Structure du repo

```
immobf-africa/
├── backend/              # API Node.js/Express
│   ├── src/
│   │   ├── server.js
│   │   ├── config/
│   │   ├── models/       # User, Property, Transaction, Agency…
│   │   ├── routes/       # REST endpoints
│   │   ├── controllers/
│   │   ├── services/     # CinetPay, OrangeMoney, Moov, Wave…
│   │   ├── middleware/
│   │   └── utils/
│   ├── migrations/
│   └── tests/
├── frontend-web/         # Next.js PWA
├── mobile/               # React Native Expo
├── docs/                 # API.md, DATABASE.md, PAYMENTS.md…
├── ARCHITECTURE.md
├── ROADMAP.md
├── WIREFRAMES.md
├── docker-compose.yml
└── LICENSE
```

## Paiements mobile money

Chaque opérateur implémente l'interface `PaymentProvider` (voir `backend/src/services/PaymentProvider.js`).

Flux standard :

1. Client POST `/api/v1/payments/initiate` avec `provider`, `amount`, `property_id`, `purpose` (`deposit` | `escrow` | `boost`).
2. Backend crée une `transaction` en statut `pending`, appelle le provider.
3. Provider renvoie un `ussd_code` ou un `payment_url` (pour Wave / CinetPay web).
4. Utilisateur valide l'OTP/PIN sur son téléphone.
5. Provider POST webhook `/api/v1/payments/webhooks/<provider>` signé HMAC.
6. Backend vérifie la signature, met à jour la transaction, génère le reçu PDF, notifie l'acheteur et le vendeur, crédite l'escrow si applicable.

Détails : [docs/PAYMENTS.md](./docs/PAYMENTS.md).

## Tests

```bash
cd backend && npm test              # Jest + supertest, couverture > 70 %
cd frontend-web && npm test         # Jest + React Testing Library
cd mobile && npm test               # Jest
```

CI configurée dans `.github/workflows/ci.yml` : lint + tests + build sur chaque push.

## Roadmap

Voir [ROADMAP.md](./ROADMAP.md).

**V2** (Q3 2026) : valuation IA, visites VR (WebXR), titres fonciers sur blockchain (intégration SNEA/DPI), matching acheteur/vendeur par embeddings.

## Contribuer

1. Fork, branche feature, PR.
2. `npm run lint` + `npm test` verts avant PR.
3. Commits conventionnels (`feat:`, `fix:`, `docs:`…).
4. Issues étiquetées `good-first-issue` pour démarrer.

## Licence

MIT — voir [LICENSE](./LICENSE).

## Contact

- Email : contact@immobf.africa
- Communauté : [Discord](https://discord.gg/immobf) · [Twitter](https://twitter.com/immobf_africa)
