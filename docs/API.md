# API ImmoBF Africa — référence v1

Base URL : `http://localhost:4000/api/v1` (dev) · `https://api.immobf.africa/api/v1` (prod).

Authentification : header `Authorization: Bearer <access_token>`. Les tokens d'accès durent 15 minutes, les refresh tokens 30 jours.

## Santé

```
GET /health
→ 200 { "ok": true, "ts": 1713693600000 }
```

## Auth

### Inscription

```
POST /auth/register
Content-Type: application/json

{
  "email": "proprio@demo.bf",
  "phone": "+22670000003",
  "password": "demo1234",
  "full_name": "Proprio Demo",
  "role": "seller",
  "country_code": "BF",
  "locale": "fr"
}

→ 201 { "user": { ... }, "message": "OTP envoyé au numéro" }
```

Un code OTP est envoyé au téléphone. Vérifier avec `POST /auth/otp/verify`.

### Connexion

```
POST /auth/login
{ "phone": "+22670000003", "password": "demo1234" }

→ 200 { "user": {...}, "access": "jwt…", "refresh": "jwt…" }
```

### Profil

```
GET /auth/me
Authorization: Bearer <access>
→ 200 { "user": {...} }
```

## Annonces (properties)

### Recherche

```
GET /properties?country=BF&city=Ouagadougou&type=house&min_price=5000000&max_price=100000000&lat=12.36&lng=-1.53&radius_km=10&limit=20&offset=0

→ 200 { "items": [...], "limit": 20, "offset": 0 }
```

Filtres : `q`, `country`, `city`, `type`, `min_price`, `max_price`, `min_area`, `bedrooms`, `lat`+`lng`+`radius_km`.

### Détail

```
GET /properties/{id}
→ 200 { "property": { ..., "photos": [...] } }
```

### Création (auth)

```
POST /properties
Authorization: Bearer <access>
{
  "type": "house",
  "title": "Villa 4 chambres Ouaga 2000",
  "description": "…",
  "price": 85000000,
  "currency": "XOF",
  "area_m2": 320,
  "bedrooms": 4,
  "bathrooms": 3,
  "country_code": "BF",
  "city": "Ouagadougou",
  "lat": 12.346,
  "lng": -1.522,
  "deposit_pct": 5
}
→ 201 { "property": {...}, "moderation": { "score": 0.1, "decision": "auto_approve" } }
```

### Publication

```
POST /properties/{id}/publish
```

### Estimation IA

```
POST /properties/estimate
{ "country_code": "BF", "city": "Ouagadougou", "type": "house", "area_m2": 300 }
→ 200 { "estimate": 78500000, "confidence": 0.65, "comparables": 8, "median_per_m2": 260000 }
```

## Paiements

### Lister les providers pour un pays

```
GET /payments/providers?country=BF
→ 200 { "providers": [
  { "name": "cinetpay", "countries": [...], "currencies": ["XOF","XAF"] },
  { "name": "orange_money_bf", "countries": ["BF"], "currencies": ["XOF"] },
  { "name": "moov_money_bf", "countries": ["BF","TG","BJ","NE"], "currencies": ["XOF"] },
  { "name": "wave", "countries": ["SN","CI","BF","ML"], "currencies": ["XOF"] }
]}
```

### Initier un paiement

```
POST /payments/initiate
Authorization: Bearer <access>
{
  "provider": "orange_money_bf",
  "amount": 4250000,
  "currency": "XOF",
  "property_id": "uuid",
  "purpose": "deposit",
  "customer_phone": "+22670000004",
  "description": "Acompte villa Ouaga 2000"
}

→ 201 {
  "transaction_id": "uuid",
  "reference": "IMO-…",
  "provider": "orange_money_bf",
  "status": "pending",
  "payment_url": "https://…",
  "ussd_code": "*144*4*6#"
}
```

Motifs (`purpose`) : `deposit` (acompte), `escrow` (séquestre), `boost` (mise en avant), `commission`, `subscription` (abo agence).

### Webhook opérateur

```
POST /payments/webhooks/{provider}
Headers: X-Signature: <hmac>  (ou X-Token, X-Orange-Signature, Wave-Signature…)
Body: payload natif de l'opérateur
```

Le backend vérifie la signature HMAC-SHA256, met à jour la transaction, crée l'escrow si applicable, génère le reçu PDF et notifie les parties.

### Mes paiements

```
GET /payments          → liste de mes transactions
GET /payments/{id}     → détail d'une transaction
POST /payments/{id}/escrow/release   → libérer les fonds (admin/agent)
```

### Mock dev (environnement non-prod)

```
POST /payments/mock/{reference}/succeed
→ force une transaction à "succeeded" pour tester le flow sans opérateur.
```

## Erreurs

Toutes les erreurs suivent le format :

```json
{ "error": { "code": "bad_request", "message": "…", "details": { ... } } }
```

Codes : `bad_request` (400), `unauthorized` (401), `forbidden` (403), `not_found` (404), `conflict` (409), `internal_error` (500).

## Rate limits

- `/auth/*` : 10 req/min/IP
- Endpoints publics : 60 req/min/IP
- Webhooks : non limités (signature requise)
