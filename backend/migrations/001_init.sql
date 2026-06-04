-- ImmoBF Africa — schema initial
-- PostgreSQL standard, sans extension PostGIS
-- La géolocalisation est stockée en lat/lng NUMERIC ; la recherche radius
-- utilise la formule Haversine en SQL pur (suffisant pour l'usage MVP).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Countries (pour extension Afrique)
CREATE TABLE IF NOT EXISTS countries (
  code          CHAR(2) PRIMARY KEY,
  name          TEXT NOT NULL,
  currency      CHAR(3) NOT NULL,
  default_locale TEXT NOT NULL DEFAULT 'fr',
  active        BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO countries (code, name, currency, default_locale) VALUES
  ('BF', 'Burkina Faso',   'XOF', 'fr'),
  ('CI', 'Côte d''Ivoire', 'XOF', 'fr'),
  ('SN', 'Sénégal',        'XOF', 'fr'),
  ('ML', 'Mali',           'XOF', 'fr'),
  ('TG', 'Togo',           'XOF', 'fr'),
  ('BJ', 'Bénin',          'XOF', 'fr'),
  ('NE', 'Niger',          'XOF', 'fr'),
  ('GH', 'Ghana',          'GHS', 'en'),
  ('KE', 'Kenya',          'KES', 'en')
ON CONFLICT (code) DO NOTHING;

-- Agencies
CREATE TABLE IF NOT EXISTS agencies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  country_code  CHAR(2) REFERENCES countries(code),
  city          TEXT,
  phone         TEXT,
  email         TEXT,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  subscription_until  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'buyer'
                CHECK (role IN ('buyer','seller','agent','admin')),
  agency_id     UUID REFERENCES agencies(id) ON DELETE SET NULL,
  country_code  CHAR(2) REFERENCES countries(code) DEFAULT 'BF',
  locale        TEXT NOT NULL DEFAULT 'fr',
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  kyc           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Properties
CREATE TABLE IF NOT EXISTS properties (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agency_id     UUID REFERENCES agencies(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('land','house','apartment','office','commercial')),
  title         TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  currency      CHAR(3) NOT NULL DEFAULT 'XOF',
  area_m2       NUMERIC(10,2),
  bedrooms      INT,
  bathrooms     INT,
  country_code  CHAR(2) NOT NULL REFERENCES countries(code) DEFAULT 'BF',
  city          TEXT NOT NULL,
  address       TEXT,
  lat           NUMERIC(10,6),                -- latitude  (WGS-84)
  lng           NUMERIC(10,6),                -- longitude (WGS-84)
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','published','under_contract','sold','archived','rejected')),
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  boosted_until TIMESTAMPTZ,
  deposit_pct   NUMERIC(5,2) NOT NULL DEFAULT 5 CHECK (deposit_pct BETWEEN 0 AND 100),
  features      JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_country_city ON properties(country_code, city);
CREATE INDEX IF NOT EXISTS idx_properties_status_published ON properties(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_type_price ON properties(type, price);
CREATE INDEX IF NOT EXISTS idx_properties_lat_lng ON properties(lat, lng) WHERE lat IS NOT NULL;

-- Photos
CREATE TABLE IF NOT EXISTS property_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  is_360        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_property ON property_photos(property_id);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, property_id)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  property_id   UUID REFERENCES properties(id) ON DELETE SET NULL,
  agency_id     UUID REFERENCES agencies(id) ON DELETE SET NULL,
  provider      TEXT NOT NULL,
  purpose       TEXT NOT NULL CHECK (purpose IN ('deposit','escrow','boost','commission','subscription')),
  amount        NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency      CHAR(3) NOT NULL DEFAULT 'XOF',
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','succeeded','failed','refunded','cancelled')),
  external_id   TEXT,
  reference     TEXT UNIQUE NOT NULL,
  payment_url   TEXT,
  ussd_code     TEXT,
  raw_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_tx_property ON transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);

-- Escrow
CREATE TABLE IF NOT EXISTS escrows (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id   UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'held'
                   CHECK (status IN ('held','released','refunded','disputed')),
  release_due_at   TIMESTAMPTZ,
  released_at      TIMESTAMPTZ,
  notes            TEXT
);

-- Payment events (journal d'audit léger, Mongo reste source de vérité pour les payloads bruts)
CREATE TABLE IF NOT EXISTS payment_events (
  id            BIGSERIAL PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,  -- initiate | webhook | refund | manual
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh tokens (rotation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTP codes (Redis est primaire, PG pour audit)
CREATE TABLE IF NOT EXISTS otp_attempts (
  id            BIGSERIAL PRIMARY KEY,
  phone         TEXT NOT NULL,
  success       BOOLEAN NOT NULL,
  ip            INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
