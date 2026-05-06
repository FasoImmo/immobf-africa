# Base de données — ImmoBF Africa

PostgreSQL 14+ avec extensions `uuid-ossp` et `postgis`. Les migrations SQL sont dans `backend/migrations/`.

## Tables

### `countries`

| Colonne         | Type     | Notes                                  |
|-----------------|----------|----------------------------------------|
| code (PK)       | CHAR(2)  | ISO-3166 alpha-2 (`BF`, `CI`…)         |
| name            | TEXT     | Nom du pays                            |
| currency        | CHAR(3)  | ISO-4217 (`XOF`, `GHS`, `KES`)         |
| default_locale  | TEXT     | `fr`, `en`                             |
| active          | BOOL     | Pays activé dans l'app                 |

### `users`

| Colonne        | Type         | Notes                                          |
|----------------|--------------|------------------------------------------------|
| id (PK)        | UUID         | `uuid_generate_v4()`                          |
| email          | TEXT UNIQUE  |                                                |
| phone          | TEXT UNIQUE  | Format E.164 (`+226…`)                         |
| password_hash  | TEXT         | Argon2id                                       |
| full_name      | TEXT         |                                                |
| role           | TEXT         | `buyer` / `seller` / `agent` / `admin`         |
| agency_id      | UUID FK      | Optionnel                                      |
| country_code   | CHAR(2) FK   | → `countries(code)`                            |
| locale         | TEXT         | `fr` / `en` / `mos` / `dyu`                    |
| phone_verified | BOOL         | Vrai après OTP SMS validé                      |
| kyc            | JSONB        | `{ id_doc, selfie, verified_at }`              |
| created_at     | TIMESTAMPTZ  |                                                |

### `agencies`

| Colonne              | Type         |
|----------------------|--------------|
| id (PK)              | UUID         |
| name, slug (UNIQUE)  | TEXT         |
| country_code         | CHAR(2) FK   |
| city, phone, email   | TEXT         |
| verified             | BOOL         |
| subscription_status  | TEXT         |
| subscription_until   | TIMESTAMPTZ  |

### `properties`

| Colonne        | Type                      | Notes                                              |
|----------------|---------------------------|----------------------------------------------------|
| id (PK)        | UUID                      |                                                    |
| owner_id       | UUID FK                   |                                                    |
| agency_id      | UUID FK                   | Nullable                                           |
| type           | TEXT                      | `land` / `house` / `apartment` / `office` / `commercial` |
| title          | TEXT                      |                                                    |
| description    | TEXT                      |                                                    |
| price          | NUMERIC(14,2)             |                                                    |
| currency       | CHAR(3)                   | `XOF` par défaut                                   |
| area_m2        | NUMERIC(10,2)             |                                                    |
| bedrooms, bathrooms | INT                  |                                                    |
| country_code   | CHAR(2) FK                |                                                    |
| city           | TEXT                      |                                                    |
| address        | TEXT                      |                                                    |
| location       | GEOGRAPHY(POINT, 4326)    | Index GiST                                         |
| status         | TEXT                      | `draft` / `published` / `under_contract` / `sold` / `archived` / `rejected` |
| verified       | BOOL                      |                                                    |
| boosted_until  | TIMESTAMPTZ               |                                                    |
| deposit_pct    | NUMERIC(5,2)              | 0-100                                              |
| features       | JSONB                     | `{ pool:true, view360_url:"…" }`                   |
| published_at   | TIMESTAMPTZ               |                                                    |
| created_at / updated_at | TIMESTAMPTZ      |                                                    |

Index : `(country_code, city)`, `(status, published_at DESC)`, `(type, price)`, GiST sur `location`.

### `property_photos`

| id | property_id | url | sort_order | is_360 | created_at |

### `favorites`

PK composite `(user_id, property_id)`.

### `transactions`

| Colonne       | Type           | Notes                                                       |
|---------------|----------------|-------------------------------------------------------------|
| id (PK)       | UUID           |                                                             |
| buyer_id      | UUID FK        |                                                             |
| property_id   | UUID FK        | Nullable (cas boost hors propriété)                         |
| agency_id     | UUID FK        |                                                             |
| provider      | TEXT           | `cinetpay`, `orange_money_bf`, `moov_money_bf`, `wave`…     |
| purpose       | TEXT           | `deposit`, `escrow`, `boost`, `commission`, `subscription`  |
| amount        | NUMERIC(14,2)  |                                                             |
| currency      | CHAR(3)        |                                                             |
| status        | TEXT           | `pending` / `succeeded` / `failed` / `refunded` / `cancelled` |
| external_id   | TEXT           | ID chez l'opérateur                                         |
| reference     | TEXT UNIQUE    | `IMO-{ts}-{rand}`                                           |
| payment_url   | TEXT           |                                                             |
| ussd_code     | TEXT           |                                                             |
| raw_payload   | JSONB          | Dernière réponse provider                                   |

### `escrows`

| id | transaction_id (UNIQUE FK) | status (`held`/`released`/`refunded`/`disputed`) | release_due_at | released_at | notes |

### `payment_events`

Journal d'audit append-only : `(id, transaction_id, kind, payload JSONB, created_at)`.
`kind` = `initiate`, `webhook`, `refund`, `manual`, `initiate_failed`.

Mongo conserve les payloads volumineux (retention 10 ans) tandis que Postgres garde la version structurée.

### `refresh_tokens`, `otp_attempts`

Rotation et audit de la sécurité.

## Requêtes types

### Top 10 annonces par ville

```sql
SELECT city, COUNT(*) n
FROM properties WHERE status = 'published'
GROUP BY city ORDER BY n DESC LIMIT 10;
```

### Recherche géospatiale (10 km autour d'Ouagadougou)

```sql
SELECT id, title, price
FROM properties
WHERE status='published'
  AND ST_DWithin(location,
                 ST_SetSRID(ST_MakePoint(-1.5197, 12.3686), 4326)::geography,
                 10000);
```

### CA mensuel par opérateur

```sql
SELECT provider,
       date_trunc('month', created_at) AS mois,
       SUM(amount) AS volume
FROM transactions
WHERE status = 'succeeded'
GROUP BY 1,2 ORDER BY 2 DESC, 3 DESC;
```

## Back-ups & retention

- PG : snapshot quotidien (provider managé) + WAL streaming.
- Mongo (tx-logs) : rétention 10 ans (conformité BCEAO/UEMOA).
- S3 (photos, reçus PDF) : versioning + lifecycle (Glacier > 2 ans).
