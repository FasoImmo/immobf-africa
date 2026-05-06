# Mise en production — ImmoBF Africa (Vercel + Railway)

Objectif : avoir une **URL publique fonctionnelle ce week-end** avec paiements réels actifs (Orange Money, Moov Money, Wave) sur Burkina Faso.

Coût estimé : ~30 à 50 USD/mois.

Temps total : 2 h à 3 h si vous suivez ce runbook dans l'ordre.

---

## Vue d'ensemble

```
┌─────────────────────┐                ┌─────────────────────┐
│ Vercel (Frontend)   │   HTTPS        │ Railway (Backend)   │
│ immobf.africa       │ ────────────► │ api.immobf.africa   │
│ Next.js 14, PWA     │                │ Express + Postgres  │
└─────────────────────┘                │ + Redis + PostGIS   │
                                        └──────────┬──────────┘
                                                   │ webhooks HMAC
                                        ┌──────────▼──────────┐
                                        │ Orange / Moov / Wave│
                                        └─────────────────────┘
```

Vous gérez 3 plateformes :
1. **GitHub** : repo + secrets CI/CD.
2. **Railway** : backend Node + base Postgres + Redis.
3. **Vercel** : frontend Next.js, SSL automatique.

---

## Phase 0 — Pré-requis (15 min)

### 0.1 Outils locaux

```bash
# Versions minimales
node --version   # >= 20
git --version    # >= 2.30
docker --version # optionnel mais utile

# Installer les CLI (une seule fois)
npm install -g @railway/cli@3 vercel@latest
```

### 0.2 Comptes à créer (gratuits)

| Service           | URL                              | Plan recommandé              |
|-------------------|----------------------------------|------------------------------|
| GitHub            | github.com                       | Free (privé OK)              |
| Railway           | railway.app                      | Hobby $5 + usage             |
| Vercel            | vercel.com                       | Hobby (gratuit)              |
| MongoDB Atlas     | cloud.mongodb.com                | M0 Free (transaction log)    |
| Domaine           | porkbun.com / namecheap.com      | ~12 USD/an pour `.africa`    |

### 0.3 Pré-requis paiement

**Provider principal : FedaPay** (compte en cours d'activation sur https://live.fedapay.com).
- Tant que le KYC FedaPay n'est pas validé : démarrer en **mode sandbox** (clés `sk_sandbox_…`).
- Une fois activé : passer en mode live (`FEDAPAY_LIVE=true`).
- Procédure complète : voir [FEDAPAY_ACTIVATION.md](./FEDAPAY_ACTIVATION.md).

**Contrats directs (optionnel)** : Orange Money, Moov Money, Wave restent activables en parallèle quand vous aurez les clés. URLs webhook à déclarer dans chaque dashboard :
- `https://api.immobf.africa/api/v1/payments/webhooks/fedapay`
- `https://api.immobf.africa/api/v1/payments/webhooks/orange-money`
- `https://api.immobf.africa/api/v1/payments/webhooks/moov-money`
- `https://api.immobf.africa/api/v1/payments/webhooks/wave`

---

## Phase 1 — Push sur GitHub (10 min)

```bash
cd /chemin/vers/immobf-africa

# Initialise et pousse
git init
git checkout -b main
git add .
git commit -m "feat: initial commit ImmoBF Africa MVP"

# Crée le repo sur github.com (privé conseillé pour la prod)
# puis :
git remote add origin git@github.com:VOTRE-COMPTE/immobf-africa.git
git push -u origin main

# Branche develop pour la suite
git checkout -b develop
git push -u origin develop
```

**Checkpoint** : vous voyez vos fichiers sur github.com/VOTRE-COMPTE/immobf-africa.

---

## Phase 2 — Backend sur Railway (30 min)

### 2.1 Créer le projet

```bash
cd backend
railway login            # ouvre un onglet navigateur
railway init             # crée le projet "immobf-africa"
```

Choisir **"Empty Project"** puis nom `immobf-africa`.

### 2.2 Ajouter Postgres + Redis

Dans le dashboard Railway (UI web) :

1. Cliquer **+ Create** → **Database** → **PostgreSQL**.
2. Sur le service Postgres, onglet **Settings** → **Postgres → Plugins** → activer **PostGIS** si disponible. **Si PostGIS n'est pas listé**, voir Phase 2.6 ci-dessous (alternative).
3. Cliquer **+ Create** → **Database** → **Redis**.

Les variables `DATABASE_URL` et `REDIS_URL` sont automatiquement injectées dans les services qui les référencent.

### 2.3 Déployer le service backend

Toujours dans le dashboard Railway :

1. **+ Create** → **Empty Service** → nommer `backend`.
2. Onglet **Settings** :
   - **Source** : Connect Repo → choisir `immobf-africa`, branche `main`, **Root directory** = `backend`.
   - **Build** : Dockerfile, path `backend/Dockerfile.prod`.
   - **Networking** → **Generate domain** : Railway donne une URL `backend-production-xxxx.up.railway.app`, notez-la.

### 2.4 Variables d'environnement

Onglet **Variables** du service `backend`, coller (ajuster valeurs) :

```
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# Référence directe aux services Railway (auto-injection)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

JWT_SECRET=<openssl rand -hex 32>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

CORS_ORIGINS=https://immobf.africa,https://www.immobf.africa
PUBLIC_API_URL=https://api.immobf.africa
PUBLIC_WEB_URL=https://immobf.africa

MONGODB_URI=<voir Phase 2.5>

# Paiements - URLs webhook (à déclarer dans dashboards opérateurs ensuite)
FEDAPAY_NOTIFY_URL=https://api.immobf.africa/api/v1/payments/webhooks/fedapay
FEDAPAY_RETURN_URL=https://immobf.africa/payment/return
CINETPAY_NOTIFY_URL=https://api.immobf.africa/api/v1/payments/webhooks/cinetpay
OM_NOTIFY_URL=https://api.immobf.africa/api/v1/payments/webhooks/orange-money
MOOV_NOTIFY_URL=https://api.immobf.africa/api/v1/payments/webhooks/moov-money
WAVE_NOTIFY_URL=https://api.immobf.africa/api/v1/payments/webhooks/wave

# Clés FedaPay (sandbox au démarrage, live après KYC validé)
FEDAPAY_LIVE=false
FEDAPAY_PUBLIC_KEY=pk_sandbox_...
FEDAPAY_SECRET_KEY=sk_sandbox_...
FEDAPAY_WEBHOOK_SECRET=...

# Clés directes opérateurs (optionnel — laisser vide tant que pas de contrat)
OM_MERCHANT_KEY=...
OM_CLIENT_ID=...
OM_CLIENT_SECRET=...
OM_WEBHOOK_SECRET=...
OM_USSD_CODE=*144*4*6#

MOOV_MERCHANT_ID=...
MOOV_API_KEY=...
MOOV_API_SECRET=...
MOOV_WEBHOOK_SECRET=...
MOOV_USSD_CODE=*555*6#

WAVE_API_KEY=...
WAVE_WEBHOOK_SECRET=...

# Premier déploiement seulement - mettre false ensuite
SEED_ON_START=true
```

> 💡 **Astuce sécurité** : ne jamais commit ces valeurs. Le fichier `.env.production.example` ne contient que les noms de variables.

### 2.5 MongoDB Atlas (transaction log)

1. cloud.mongodb.com → **Build a Database** → **M0 Free**, région **Frankfurt** ou **Paris**.
2. **Database Access** → ajouter un user `immobf` avec mot de passe fort.
3. **Network Access** → ajouter `0.0.0.0/0` (Railway sort sur des IPs dynamiques).
4. **Connect** → **Drivers** → copier la chaîne, remplacer `<password>` et coller dans `MONGODB_URI` côté Railway.

### 2.6 Si PostGIS n'est pas dispo sur Railway

Deux options :

**Option A** (recommandée) — Utiliser **Neon** au lieu du Postgres Railway :
1. neon.tech → projet free tier.
2. SQL editor → `CREATE EXTENSION postgis;`
3. Copier la connection string et la coller dans `DATABASE_URL` sur Railway.

**Option B** — Image Docker Postgres+PostGIS sur Railway :
1. Dans le service Postgres, **Settings** → **Source** → image Docker `postgis/postgis:15-3.3`.
2. Variables : `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

### 2.7 Premier déploiement

```bash
# Déclenche le déploiement
git push origin main

# Suivre les logs
railway logs --service backend
```

Le script `start-prod.sh` :
1. Vérifie/crée l'extension PostGIS.
2. Lance `npm run migrate`.
3. Si `SEED_ON_START=true`, lance `npm run seed`.
4. Démarre `node src/server.js`.

**Checkpoint** :
```bash
curl https://backend-production-xxxx.up.railway.app/api/v1/health
# → {"status":"ok","db":"ok","redis":"ok"}
```

Une fois OK, mettre `SEED_ON_START=false` dans Railway pour ne pas re-seeder à chaque deploy.

---

## Phase 3 — Frontend sur Vercel (20 min)

### 3.1 Importer le projet

```bash
cd ../frontend-web
vercel login
vercel link            # crée le projet, choisir scope perso/team
```

Confirmer : root directory = `frontend-web`, framework = Next.js.

### 3.2 Variables d'environnement

```bash
# Production env
vercel env add NEXT_PUBLIC_API_URL production
# Coller : https://backend-production-xxxx.up.railway.app
# (avant DNS) ou https://api.immobf.africa (après DNS)

vercel env add NEXT_PUBLIC_SITE_URL production
# Coller : https://immobf.africa

vercel env add NEXT_PUBLIC_DEFAULT_LOCALE production
# Coller : fr
```

Ou tout faire dans le dashboard : **Project Settings → Environment Variables**.

### 3.3 Premier déploiement

```bash
vercel --prod
```

Vercel donne une URL `https://immobf-africa-xxx.vercel.app`. Tester dans le navigateur — vous devriez voir l'accueil avec le hero vert sahélien.

**Checkpoint** : la page d'accueil charge et affiche les annonces seed.

---

## Phase 4 — Domaine et DNS (15 min)

### 4.1 Acheter le domaine

`immobf.africa` chez Porkbun ou Namecheap (~12 USD/an). Vous pouvez utiliser un autre TLD si `.africa` est pris : `immobf.com`, `immobf.bf`.

### 4.2 Pointer vers Vercel (frontend)

Dashboard Vercel → **Project → Settings → Domains** :

1. Ajouter `immobf.africa`.
2. Ajouter `www.immobf.africa` (redirect 301 vers `immobf.africa`).

Vercel donne 2 enregistrements DNS à créer chez votre registrar :

```
Type   Host    Valeur
A      @       76.76.21.21
CNAME  www     cname.vercel-dns.com
```

### 4.3 Pointer api vers Railway

Dashboard Railway → **service backend → Settings → Networking → Custom Domain** :

1. Ajouter `api.immobf.africa`.
2. Railway donne un CNAME, par exemple `backend-production-xxxx.up.railway.app`.

DNS chez le registrar :
```
Type   Host    Valeur
CNAME  api     backend-production-xxxx.up.railway.app
```

### 4.4 SSL

- Vercel : automatique via Let's Encrypt, prêt en ~30 s.
- Railway : automatique aussi.

**Checkpoint** :
```bash
curl https://immobf.africa            # frontend OK
curl https://api.immobf.africa/api/v1/health  # backend OK
```

### 4.5 Mettre à jour les vars d'env

Maintenant que `api.immobf.africa` répond :

- Vercel : `NEXT_PUBLIC_API_URL=https://api.immobf.africa` (redéployer).
- Railway : `CORS_ORIGINS=https://immobf.africa,https://www.immobf.africa` (déjà fait normalement).

---

## Phase 5 — Configuration des opérateurs paiement (30 min en sandbox)

### 5.1 FedaPay (provider principal — recommandé)

Voir le guide détaillé : [`FEDAPAY_ACTIVATION.md`](./FEDAPAY_ACTIVATION.md).

Étapes minimales :

1. Activer le compte sur https://live.fedapay.com/auth/activate-account (KYC : RCCM, IFU, RIB UEMOA, CNIB dirigeant).
2. Tant que le KYC est en cours, basculer en **Sandbox** dans le dashboard.
3. Récupérer `pk_sandbox_…` et `sk_sandbox_…` (onglet **API Keys**).
4. **Webhooks** → **Add endpoint** :
   - URL : `https://api.immobf.africa/api/v1/payments/webhooks/fedapay`
   - Events : `transaction.approved`, `transaction.declined`, `transaction.canceled`, `transaction.refunded`
   - Copier le signing secret affiché.
5. Coller dans Railway :

```bash
railway variables set --service backend \
  FEDAPAY_LIVE=false \
  FEDAPAY_PUBLIC_KEY=pk_sandbox_xxxx \
  FEDAPAY_SECRET_KEY=sk_sandbox_xxxx \
  FEDAPAY_WEBHOOK_SECRET=whsec_xxxx
```

6. Test 100 FCFA en sandbox depuis l'app (FedaPay fournit un numéro Orange Money de test).
7. Une fois le KYC validé : refaire avec les clés `pk_live_…` / `sk_live_…` et `FEDAPAY_LIVE=true`.

### 5.2 Orange Money Burkina (contrat direct, optionnel)

À faire seulement si vous avez le contrat marchand direct :

1. **Webhook URL (callback)** : `https://api.immobf.africa/api/v1/payments/webhooks/orange-money`
2. **Return URL (success)** : `https://immobf.africa/payment/return?status=success`
3. **Return URL (failure)** : `https://immobf.africa/payment/return?status=failed`
4. Activer la signature HMAC-SHA256 avec le secret `OM_WEBHOOK_SECRET`.
5. Mode **TEST** d'abord — transaction de 100 FCFA, vérifier les logs Railway.

### 5.3 Moov Money Burkina (contrat direct, optionnel)

Mêmes étapes, URL = `/api/v1/payments/webhooks/moov-money`. Secret HMAC = `MOOV_WEBHOOK_SECRET`.

### 5.4 Wave (contrat direct, optionnel)

Dashboard business.wave.com → **Settings → Webhooks** :

1. URL : `https://api.immobf.africa/api/v1/payments/webhooks/wave`
2. Secret généré par Wave → `WAVE_WEBHOOK_SECRET`.
3. Évènements : `checkout.session.completed`, `checkout.session.failed`.

### 5.5 Tester le flow complet

```bash
# 1. Créer un compte test
curl -X POST https://api.immobf.africa/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@immobf.africa","password":"Pass1234!","name":"Test"}'

# 2. Lister les annonces seed
curl https://api.immobf.africa/api/v1/properties

# 3. Initier un paiement FedaPay (sandbox)
curl -X POST https://api.immobf.africa/api/v1/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "property_id":"<uuid>",
    "provider":"fedapay",
    "amount":100,
    "currency":"XOF",
    "purpose":"deposit",
    "customer_phone":"+22670000000",
    "customer_email":"test@immobf.africa",
    "preferred_operator":"orange"
  }'
```

Composer le code USSD reçu sur un téléphone test, vérifier dans le dashboard admin (`/admin`) que la transaction passe à `succeeded`.

---

## Phase 6 — Secrets GitHub Actions (10 min)

Repo GitHub → **Settings → Secrets and variables → Actions → New repository secret** :

| Secret                       | Valeur                                                          |
|------------------------------|-----------------------------------------------------------------|
| `RAILWAY_TOKEN`              | `railway login --token` puis copier (ou compte Railway → Tokens) |
| `RAILWAY_BACKEND_SERVICE`    | `backend`                                                       |
| `VERCEL_TOKEN`               | vercel.com → Account → Tokens → Create                          |
| `VERCEL_ORG_ID`              | `cat frontend-web/.vercel/project.json` (champ `orgId`)         |
| `VERCEL_PROJECT_ID`          | idem (champ `projectId`)                                        |
| `PUBLIC_API_URL`             | `https://api.immobf.africa`                                     |

À partir de maintenant, chaque `git push origin main` déclenche un déploiement automatique :
- Modif dans `backend/**` → workflow `deploy-backend.yml`.
- Modif dans `frontend-web/**` → workflow `deploy-frontend.yml`.

---

## Phase 7 — Sauvegardes automatiques (10 min)

### 7.1 Postgres

Railway → service Postgres → **Backups** : activer les **daily backups** (inclus à partir du plan Hobby).

### 7.2 Export manuel optionnel

```bash
# Local backup ad hoc avant un changement risqué
railway run --service postgres pg_dump -Fc > immobf-$(date +%F).dump
```

### 7.3 MongoDB Atlas

Atlas inclut des snapshots quotidiens 2 jours sur le M0 Free.

---

## Phase 8 — Monitoring minimal (15 min)

### 8.1 Uptime

UptimeRobot (gratuit, 50 moniteurs / 5 min) :
- `https://immobf.africa/` (status 200).
- `https://api.immobf.africa/api/v1/health` (keyword `"ok"`).
- Alerte email + SMS sur down > 2 min.

### 8.2 Logs

Railway garde 7 j de logs par défaut. Pour aller plus loin :

```bash
# Rediriger vers Better Stack (gratuit < 1 GB/mois)
railway variables set BETTER_STACK_TOKEN=...
# Puis configurer le drain dans Project → Settings → Log drains
```

### 8.3 Erreurs frontend

Sentry (gratuit jusqu'à 5k events/mois) :
1. sentry.io → projet Next.js.
2. Copier le DSN dans `NEXT_PUBLIC_SENTRY_DSN` (Vercel env vars).
3. Redéployer.

---

## Phase 9 — Go-live final

Voir [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md) pour la checklist complète à dérouler avant d'annoncer publiquement.

---

## Coûts mensuels estimés

| Poste                     | Coût        |
|---------------------------|-------------|
| Railway Hobby (base)      | 5 USD       |
| Railway usage (CPU/RAM)   | ~10-15 USD  |
| Railway Postgres + Redis  | ~5 USD      |
| Vercel Hobby              | 0 USD       |
| MongoDB Atlas M0          | 0 USD       |
| UptimeRobot               | 0 USD       |
| Sentry                    | 0 USD       |
| Domaine `.africa`         | ~1 USD      |
| **Total**                 | **~25-30 USD/mois** |

Ajoutez ~15 USD/mois si vous prenez Vercel Pro (analytics, password protection préview, équipe > 1).

---

## Rollback en cas de problème

```bash
# Backend - revenir à la version précédente
railway redeploy --service backend --version <previous_id>

# Frontend - rollback Vercel
vercel rollback https://immobf-africa.vercel.app

# DB - restore depuis backup Railway (UI uniquement)
```

---

## Prochaines étapes après le go-live

Quand l'app tourne stable depuis ~1 semaine :

1. **Mode pilote restreint** : whitelist d'IPs ou code d'accès pour les premiers 50 testeurs.
2. **Stress test** : `k6 run scripts/load-test.js` pour vérifier 100 RPS sustained.
3. **Audit sécurité** : OWASP ZAP scan + revue des secrets en log.
4. **Conformité** : valider RGPD-like + BCEAO avec un avocat local.
5. **Lancement public** : article LinkedIn + relations presse Burkina24, Sidwaya.

Voir [ROADMAP.md](../ROADMAP.md) pour la roadmap v0.2 → v2.0.
