#!/usr/bin/env bash
# Smoke test post-deploy ImmoBF Africa
# Usage:
#   ./scripts/smoke-prod.sh https://api.immobf.africa
# ou
#   API_URL=https://api.immobf.africa ./scripts/smoke-prod.sh

set -eu

API_URL="${1:-${API_URL:-https://api.immobf.africa}}"
PASS="\033[32m✓\033[0m"
FAIL="\033[31m✗\033[0m"

echo "🔎 Smoke test against $API_URL"
echo ""

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    printf " $PASS  %s\n" "$name"
  else
    printf " $FAIL  %s\n" "$name"
    return 1
  fi
}

fail_count=0

# 1. Health check
check "Health endpoint répond 200" \
  "curl -fsS '$API_URL/api/v1/health'" || ((fail_count++))

# 2. Health body contient "ok"
check "Health renvoie status=ok" \
  "curl -fsS '$API_URL/api/v1/health' | grep -q '\"status\":\"ok\"'" || ((fail_count++))

# 3. Liste publique des annonces
check "GET /properties répond" \
  "curl -fsS '$API_URL/api/v1/properties'" || ((fail_count++))

# 4. Recherche géo
check "Recherche géo Ouaga répond" \
  "curl -fsS '$API_URL/api/v1/properties?lat=12.3686&lng=-1.5275&radius_km=10'" || ((fail_count++))

# 5. Estimation prix
check "POST /properties/estimate répond" \
  "curl -fsS -X POST '$API_URL/api/v1/properties/estimate' -H 'Content-Type: application/json' -d '{\"city\":\"Ouagadougou\",\"type\":\"villa\",\"area_m2\":250}'" || ((fail_count++))

# 6. Auth flow
RAND=$RANDOM
EMAIL="smoke-${RAND}@test.immobf.africa"
PASSWORD="Smoke123!"

check "Register nouvel utilisateur" \
  "curl -fsS -X POST '$API_URL/api/v1/auth/register' -H 'Content-Type: application/json' -d '{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Smoke Test\"}'" || ((fail_count++))

TOKEN=$(curl -fsS -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p' || true)

if [ -n "$TOKEN" ]; then
  printf " $PASS  Login + access_token reçu\n"
else
  printf " $FAIL  Login échoué\n"
  ((fail_count++))
fi

# 7. Mauvais password rejette en 401
check "Login mauvais password renvoie 401" \
  "[ \$(curl -s -o /dev/null -w '%{http_code}' -X POST '$API_URL/api/v1/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"$EMAIL\",\"password\":\"WRONG\"}') = '401' ]" || ((fail_count++))

# 8. Webhook avec mauvaise signature rejette
check "Webhook orange-money mauvaise signature rejetée" \
  "[ \$(curl -s -o /dev/null -w '%{http_code}' -X POST '$API_URL/api/v1/payments/webhooks/orange-money' -H 'Content-Type: application/json' -H 'X-Signature: invalid' -d '{}') != '200' ]" || ((fail_count++))

# 9. Rate limiting (60 RPS sur public)
echo ""
echo "🚦 Test rate limit (peut prendre 5 s)..."
RATE_429=$(for i in $(seq 1 80); do
  curl -s -o /dev/null -w "%{http_code}\n" "$API_URL/api/v1/properties"
done | grep -c '^429$' || true)

if [ "$RATE_429" -gt 0 ]; then
  printf " $PASS  Rate limit actif (%d × 429)\n" "$RATE_429"
else
  printf " $FAIL  Rate limit ne se déclenche pas\n"
  ((fail_count++))
fi

# 10. Endpoint mock-succeed désactivé en prod
check "Endpoint mock-succeed désactivé en production" \
  "[ \$(curl -s -o /dev/null -w '%{http_code}' -X POST '$API_URL/api/v1/payments/mock-succeed' -d '{}') != '200' ]" || ((fail_count++))

echo ""
if [ "$fail_count" -eq 0 ]; then
  printf "\033[32m✅  Tous les smoke tests passent.\033[0m\n"
  exit 0
else
  printf "\033[31m❌  %d smoke test(s) en échec.\033[0m\n" "$fail_count"
  exit 1
fi
