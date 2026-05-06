# Getting started — parcours développeur (7 sessions × 1h)

Guide séquencé pour lancer ImmoBF Africa en local, tester le MVP de bout en bout, puis te positionner pour la suite. Chaque session dure environ 1h et se termine par un **check de validation** : si tu le réussis, passe à la suivante.

## Pré-requis (à faire une seule fois)

- **Node.js 20** (via `nvm install 20 && nvm use 20`)
- **Docker Desktop** (ou Docker Engine + compose)
- **Git**, un éditeur (VS Code recommandé), un client HTTP (Postman, Insomnia, ou `curl` + `jq`)
- Un dossier de travail dédié. Clone ou copie `immobf-africa/` dedans.

---

## Session 1 — Lancer la stack en local (~60 min)

### 1.1 Vérifier les pré-requis

```bash
node -v          # doit afficher v20.x
docker -v        # doit afficher 20+ ou 24+
docker compose version
```

### 1.2 Copier les variables d'environnement

```bash
cd immobf-africa
cp backend/.env.example backend/.env
cp frontend-web/.env.example frontend-web/.env.local
```

Ouvre `backend/.env` et laisse toutes les clés providers vides pour l'instant — le backend passe automatiquement en **mode stub** sans secret.

### 1.3 Lancer la stack complète

```bash
docker compose up -d
```

Cette commande démarre 5 conteneurs : postgres+postgis, redis, mongo, api, web. Vérifie qu'ils tournent tous :

```bash
docker compose ps
```

Les 5 services doivent apparaître en `running`. Si un conteneur redémarre en boucle, lis les logs : `docker compose logs api` (ou `postgres`, `web`).

### 1.4 Appliquer les migrations + seed

```bash
docker compose exec api npm run migrate
docker compose exec api npm run seed
```

Tu dois voir `All migrations applied.` puis `Seed complete.` avec 4 comptes démo.

### ✅ Check de validation

```bash
curl http://localhost:4000/api/v1/health
# → { "ok": true, "ts": 1713...  }

curl "http://localhost:4000/api/v1/properties?limit=3" | head -c 500
# → { "items": [ { "id": "...", "title": "Villa moderne...", ... } ] }
```

Ouvre `http://localhost:3000` dans ton navigateur : tu dois voir l'accueil ImmoBF avec les 5 annonces seed.

**Si ça marche : session 1 terminée.** Si bloqué, voir « Dépannage » en bas.

---

## Session 2 — Explorer l'API (~45 min)

Objectif : comprendre le modèle d'API REST en faisant les appels à la main.

### 2.1 Inscription + login (flow complet)

```bash
# Inscription
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+22670111111","password":"test1234","full_name":"Jean Test","role":"buyer"}'
```

Le backend renvoie l'utilisateur + un message disant qu'un OTP a été envoyé. En mode dev, regarde les logs de l'API : `docker compose logs api | grep OTP` — tu verras le code OTP en clair (normal, pas de Twilio configuré).

```bash
# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+22670000004","password":"demo1234"}'
```

Copie le champ `access` de la réponse. C'est ton JWT pour les prochains appels.

```bash
export TOKEN="eyJhbGciOi…"       # colle le access token

curl http://localhost:4000/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

### 2.2 Créer une annonce

```bash
curl -X POST http://localhost:4000/api/v1/properties \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "type":"land",
    "title":"Parcelle 500m² à Koudougou",
    "description":"Parcelle titrée, proche route bitumée, eau ONEA raccordable.",
    "price":5500000,
    "area_m2":500,
    "country_code":"BF",
    "city":"Koudougou",
    "lat":12.245,"lng":-2.362,
    "deposit_pct":5
  }'
```

Note l'`id` renvoyé. Publie l'annonce :

```bash
curl -X POST http://localhost:4000/api/v1/properties/<ID>/publish \
  -H "Authorization: Bearer $TOKEN"
```

### 2.3 Rechercher avec filtres géo

```bash
# Toutes les annonces à ≤ 50 km d'Ouaga
curl "http://localhost:4000/api/v1/properties?lat=12.37&lng=-1.52&radius_km=50" | jq '.items[] | {city, title, price}'
```

### 2.4 Estimation de prix IA (naïve)

```bash
curl -X POST http://localhost:4000/api/v1/properties/estimate \
  -H 'Content-Type: application/json' \
  -d '{"country_code":"BF","city":"Ouagadougou","type":"house","area_m2":300}'
```

### ✅ Check

Tu as créé une annonce, l'as publiée, et elle apparaît dans la recherche. Tu comprends le pattern JWT + JSON + REST.

---

## Session 3 — Tester le flow paiement end-to-end (~60 min)

C'est la partie la plus importante : comprendre comment un paiement mobile money circule dans le système, même en mode stub.

### 3.1 Lister les providers

```bash
curl "http://localhost:4000/api/v1/payments/providers?country=BF" | jq
```

Tu dois voir CinetPay, Orange Money BF, Moov Money BF, Wave.

### 3.2 Initier un paiement (acompte)

Prends l'id d'une annonce seed (ou la tienne). L'acompte par défaut est 5 % — pour une annonce à 85 M FCFA, ça fait 4 250 000 FCFA.

```bash
curl -X POST http://localhost:4000/api/v1/payments/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "provider":"orange_money_bf",
    "amount":4250000,
    "currency":"XOF",
    "property_id":"<ID_ANNONCE>",
    "purpose":"deposit",
    "customer_phone":"+22670000004",
    "description":"Acompte villa Ouaga"
  }'
```

Réponse attendue :
```json
{
  "transaction_id": "uuid",
  "reference": "IMO-1713...-ABCD1234",
  "provider": "orange_money_bf",
  "status": "pending",
  "payment_url": "http://localhost:3000/mock-checkout?ref=IMO-…",
  "ussd_code": "*144*4*6#"
}
```

Copie la `reference`.

### 3.3 Simuler la confirmation du webhook

En prod, c'est Orange Money qui enverrait un POST sur `/payments/webhooks/orange_money_bf`. En dev on simule :

```bash
curl -X POST http://localhost:4000/api/v1/payments/mock/<REFERENCE>/succeed
```

### 3.4 Vérifier le résultat

```bash
# Le statut passe à "succeeded"
curl http://localhost:4000/api/v1/payments -H "Authorization: Bearer $TOKEN" | jq '.items[0]'

# Un escrow a été créé automatiquement (purpose=deposit)
docker compose exec postgres psql -U immobf -d immobf -c \
  "SELECT id, status, release_due_at FROM escrows ORDER BY id DESC LIMIT 3;"

# Un reçu PDF a été généré
docker compose exec api ls -la /app/uploads/receipts/
```

### ✅ Check

Tu as suivi toute la chaîne : `initiate → transaction pending → mock webhook → transaction succeeded → escrow held → receipt PDF`. Tu comprends pourquoi le flow marchera pareil avec les vraies clés (le mode stub et le mode prod appellent la **même méthode** `provider.parseWebhook`).

---

## Session 4 — Parcourir l'UI web (~30 min)

### 4.1 Accueil et catalogue

`http://localhost:3000` → hero + 6 annonces récentes.
`http://localhost:3000/properties?city=Ouagadougou` → filtres + liste.
Clique sur une annonce : page détail avec photo, prix, bouton « Payer l'acompte ».

### 4.2 Payer depuis l'UI

1. Clic « Payer l'acompte en mobile money ».
2. Modal : choisis Orange Money, entre `+22670000004`, valide.
3. Le dialog affiche le code USSD + la référence (mode stub).
4. Dans un autre terminal :
   ```bash
   curl -X POST http://localhost:4000/api/v1/payments/mock/<REFERENCE>/succeed
   ```
5. Recharge la page `/payment/callback?ref=<REFERENCE>` : le status bascule sur "succeeded".

### 4.3 Changer de langue

Clic sur le sélecteur FR/EN/Mooré/Dioula dans le header. Vérifie que les labels se traduisent bien.

### 4.4 Publier depuis l'UI

Connecte-toi (via `/login` avec `+22670000003 / demo1234`), va sur `/sell`, remplis le formulaire, publie. L'annonce apparaît immédiatement sur `/properties`.

### ✅ Check

Tu as cliqué partout dans l'app, tu sais où est quoi. Bon moment pour lire les pages `frontend-web/pages/*.js` — elles sont courtes et directes.

---

## Session 5 — App mobile Expo (~45 min, optionnel)

### 5.1 Installer Expo CLI

```bash
cd mobile
npm install
```

### 5.2 Lancer en dev

```bash
npx expo start
```

Scanne le QR code avec **Expo Go** (iOS App Store / Google Play) sur ton téléphone. Si ton téléphone n'est pas sur le même réseau Wi-Fi que ton PC : ajoute `--tunnel`.

Par défaut l'app mobile pointe sur `http://10.0.2.2:4000` (Android emulator). Sur un vrai téléphone, il faut remplacer cette URL par celle de ton PC sur le LAN (ex : `http://192.168.1.42:4000`). Édite `mobile/lib/api.js` :

```js
const baseURL = "http://192.168.1.42:4000"; // ← ton IP locale
```

### 5.3 Tester les écrans

- Onglet **Parcourir** : tire vers le bas pour rafraîchir.
- Tape sur une annonce : page détail.
- Bouton « Payer » : écran de paiement, choisis un opérateur, entre un numéro, valide.
- Onglet **Compte** : login.

### ✅ Check

L'app fonctionne sur ton téléphone. Si ça ne charge pas : c'est 99 % un problème de réseau (firewall macOS/Windows qui bloque le port 4000, ou IP locale incorrecte).

---

## Session 6 — Lire et comprendre le code (~60 min)

Suggestion de lecture dans cet ordre (fichiers courts, 50-150 lignes chacun) :

1. `backend/src/server.js` — point d'entrée, middlewares, routing.
2. `backend/src/routes/index.js` — la carte de toute l'API en 30 lignes.
3. `backend/src/middleware/auth.js` — comment JWT est signé et vérifié.
4. `backend/src/services/PaymentProvider.js` — l'interface abstraite.
5. `backend/src/services/OrangeMoneyProvider.js` — une implémentation complète (avec mode stub).
6. `backend/src/controllers/paymentsController.js` — la **pièce centrale** : initiate + webhook + escrow. Lis-la attentivement.
7. `backend/src/models/Property.js` — requêtes SQL + PostGIS géospatial.
8. `frontend-web/components/PaymentDialog.js` — comment l'UI consomme l'API.
9. `ARCHITECTURE.md` — reviens-y avec les yeux du code.

### Lancer les tests

```bash
cd backend && npm install && npm test
```

Les 3 suites (`moderation`, `paymentProviders`, `health`) doivent passer.

### ✅ Check

Tu peux expliquer à voix haute ce que fait chaque répertoire. Tu sais où modifier le code pour :
- ajouter un opérateur de paiement → `services/NewProvider.js` + enregistrer dans `PaymentProviderRegistry.js`
- ajouter un champ à une annonce → migration SQL + `models/Property.js` + schéma Joi
- ajouter une page web → `frontend-web/pages/<route>.js`

---

## Session 7 — Planifier la suite (~30 min)

Maintenant que tu maîtrises le MVP, trois voies possibles. Choisis celle qui matche ton énergie actuelle.

### Voie A — Obtenir les vraies clés paiement (commercial)

**Effort** : 2-6 semaines, beaucoup d'emails, peu de code.

1. **CinetPay** (le plus rapide) : créer un compte marchand sur https://cinetpay.com, soumettre RCCM + IFU, obtenir `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `CINETPAY_SECRET_KEY` en 1-2 semaines.
2. **Orange Money Burkina** : accord direct via Orange Business Services BF — rendez-vous commercial, négociation des frais, contrat marchand, intégration 4-8 semaines.
3. **Moov Africa Burkina** et **Wave** : contacts via leurs sites partenaires.

Pendant que ces dossiers avancent, tu peux tout de même lancer un pilote avec **CinetPay seulement** qui couvre Orange+Moov+Wave en un seul contrat.

### Voie B — Déployer en staging public

**Effort** : 1 week-end, 0 € si gratuit (Vercel + Neon + Upstash).

Étapes dans l'ordre :
1. Créer un repo GitHub, push le code.
2. **DB** : crée un projet gratuit sur https://neon.tech (PostgreSQL + PostGIS gratuit), récupère la connection string.
3. **Redis** : https://upstash.com gratuit.
4. **Backend** : push sur https://railway.app (connect repo, pick `backend/`, add env vars, deploy). Lance les migrations depuis le shell Railway.
5. **Frontend** : https://vercel.com (connect repo, pick `frontend-web/`, add `NEXT_PUBLIC_API_URL=https://immobf-api.railway.app`).
6. Configure le domaine (OVH, Namecheap, Gandi) : `immobf.africa` → Vercel, `api.immobf.africa` → Railway.

Résultat : un lien que tu peux montrer à des partenaires potentiels (agences Ouaga, investisseurs).

### Voie C — Enrichir les fonctionnalités

**Effort** : continu, ~5-10h par semaine.

Priorités suggérées pour consolider le MVP avant le pilote :
1. **Upload photos** : aujourd'hui le modèle `property_photos` existe mais il n'y a pas encore d'endpoint d'upload. Ajoute `POST /properties/:id/photos` avec `multer` (déjà dans `package.json`).
2. **Carte Leaflet** sur la page catalogue avec pins cliquables (module `react-leaflet` déjà en dépendance).
3. **Notifications SMS** réelles via l'API Orange SMS BF (payante mais ~0,02 € par SMS).
4. **Tests e2e Playwright** pour sécuriser les régressions.

Voir `ROADMAP.md` pour la liste complète.

---

## Dépannage rapide

| Symptôme                                             | Cause probable                                   | Solution                                                   |
|------------------------------------------------------|--------------------------------------------------|------------------------------------------------------------|
| `docker compose up` fail : `Cannot connect to daemon`| Docker Desktop pas démarré                       | Démarrer Docker Desktop / `sudo systemctl start docker`    |
| `npm run migrate` : `relation "postgis" does not exist` | image postgres simple au lieu de postgis         | Vérifier `image: postgis/postgis:15-3.3` dans compose      |
| `404` sur `GET /properties`                          | Migrations non appliquées                        | `docker compose exec api npm run migrate`                  |
| Login renvoie `Identifiants invalides`               | Mauvais mot de passe seed                        | Utiliser `demo1234` (ou `admin2026` pour admin)            |
| Frontend ne voit pas l'API                           | CORS ou `NEXT_PUBLIC_API_URL` incorrect          | Vérifier `.env.local` : `http://localhost:4000`            |
| `expo start` : le téléphone ne charge pas            | Firewall LAN / mauvaise IP                       | Utiliser `--tunnel` ou mettre à jour `mobile/lib/api.js`   |
| Webhook `mock/succeed` renvoie 404                   | Mauvaise `reference` ou env = production         | Prendre la `reference` retournée par `initiate`            |

## Ressources

- Doc API complète : [docs/API.md](./docs/API.md)
- Modèle de données : [docs/DATABASE.md](./docs/DATABASE.md)
- Paiements en détail : [docs/PAYMENTS.md](./docs/PAYMENTS.md)
- Déploiement VPS : [docs/DEPLOY_VPS.md](./docs/DEPLOY_VPS.md)
- Roadmap V2 : [ROADMAP.md](./ROADMAP.md)

Bon courage. Contact pour questions : ouvre une issue GitHub.
