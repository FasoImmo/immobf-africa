#!/bin/sh
# Production startup script - Railway / Docker.
# 1. Wait for DB (Railway exposes it instantly but be defensive on cold start).
# 2. Run migrations idempotently.
# 3. Start the API server.

set -eu

echo "[start-prod] Node $(node -v)"
echo "[start-prod] NODE_ENV=$NODE_ENV"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[start-prod] FATAL: DATABASE_URL not set" >&2
  exit 1
fi

# Try to enable PostGIS extension if missing (no-op if already there).
# Railway's Postgres image is plain Postgres, so we install PostGIS via SQL
# (the postgis extension is available on Railway's postgres-15 plugin).
echo "[start-prod] Ensuring PostGIS extension..."
node -e "
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await c.query('CREATE EXTENSION IF NOT EXISTS postgis');
    console.log('[start-prod] PostGIS OK');
  } catch (err) {
    console.error('[start-prod] PostGIS extension could not be created:', err.message);
    console.error('[start-prod] Make sure the Postgres plugin supports PostGIS, or attach a postgis-enabled DB.');
    process.exit(2);
  } finally {
    await c.end();
  }
})();
"

echo "[start-prod] Running migrations..."
npm run migrate

# Optional one-time seed when SEED_ON_START=true
if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[start-prod] Seeding initial data..."
  npm run seed || echo "[start-prod] Seed failed (non-fatal)"
fi

echo "[start-prod] Starting API on port ${PORT:-4000}"
exec node src/server.js
