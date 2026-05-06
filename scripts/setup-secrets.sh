#!/usr/bin/env bash
# Helper interactif pour configurer les secrets Railway + Vercel + GitHub.
# Lance après avoir : railway login && vercel login && gh auth login
#
# Usage : ./scripts/setup-secrets.sh

set -eu

cd "$(dirname "$0")/.."

# Couleurs
G="\033[32m"; Y="\033[33m"; R="\033[31m"; N="\033[0m"

prompt() {
  local var="$1"; local hint="$2"
  printf "${Y}$var${N}  ${hint}\n> "
  read -r value
  echo "$value"
}

echo "==============================================================="
echo "  ImmoBF Africa — Setup secrets de production"
echo "==============================================================="
echo ""
echo "Pré-requis :"
echo "  - railway login (CLI installée et connectée)"
echo "  - vercel login"
echo "  - gh auth login (CLI GitHub)"
echo ""
read -rp "Continuer ? [y/N] " ok
[ "$ok" = "y" ] || exit 0

# ---------------------------------------------------------------
# 1. Génération JWT_SECRET
# ---------------------------------------------------------------
JWT_SECRET=$(openssl rand -hex 32)
echo ""
printf "${G}✓${N} JWT_SECRET généré (64 hex chars)\n"

# ---------------------------------------------------------------
# 2. Saisie des clés opérateurs
# ---------------------------------------------------------------
echo ""
echo "${G}--- Orange Money Burkina ---${N}"
OM_MERCHANT_KEY=$(prompt OM_MERCHANT_KEY "(dashboard partenaire Orange)")
OM_CLIENT_ID=$(prompt OM_CLIENT_ID "")
OM_CLIENT_SECRET=$(prompt OM_CLIENT_SECRET "")
OM_WEBHOOK_SECRET=$(prompt OM_WEBHOOK_SECRET "(secret HMAC à partager avec Orange)")

echo ""
echo "${G}--- Moov Money Burkina ---${N}"
MOOV_MERCHANT_ID=$(prompt MOOV_MERCHANT_ID "")
MOOV_API_KEY=$(prompt MOOV_API_KEY "")
MOOV_API_SECRET=$(prompt MOOV_API_SECRET "")
MOOV_WEBHOOK_SECRET=$(prompt MOOV_WEBHOOK_SECRET "")

echo ""
echo "${G}--- Wave ---${N}"
WAVE_API_KEY=$(prompt WAVE_API_KEY "(business.wave.com)")
WAVE_WEBHOOK_SECRET=$(prompt WAVE_WEBHOOK_SECRET "(généré par Wave)")

echo ""
echo "${G}--- MongoDB Atlas (transaction log) ---${N}"
MONGODB_URI=$(prompt MONGODB_URI "(mongodb+srv://...)")

# ---------------------------------------------------------------
# 3. Push vers Railway
# ---------------------------------------------------------------
echo ""
echo "${Y}>>> Push variables vers Railway service backend...${N}"
SERVICE="${RAILWAY_BACKEND_SERVICE:-backend}"

railway variables set --service "$SERVICE" \
  NODE_ENV=production \
  PORT=4000 \
  LOG_LEVEL=info \
  JWT_SECRET="$JWT_SECRET" \
  JWT_ACCESS_TTL=15m \
  JWT_REFRESH_TTL=30d \
  CORS_ORIGINS=https://immobf.africa,https://www.immobf.africa \
  PUBLIC_API_URL=https://api.immobf.africa \
  PUBLIC_WEB_URL=https://immobf.africa \
  MONGODB_URI="$MONGODB_URI" \
  OM_MERCHANT_KEY="$OM_MERCHANT_KEY" \
  OM_CLIENT_ID="$OM_CLIENT_ID" \
  OM_CLIENT_SECRET="$OM_CLIENT_SECRET" \
  OM_WEBHOOK_SECRET="$OM_WEBHOOK_SECRET" \
  OM_NOTIFY_URL=https://api.immobf.africa/api/v1/payments/webhooks/orange-money \
  OM_RETURN_URL=https://immobf.africa/payment/return \
  OM_USSD_CODE='*144*4*6#' \
  MOOV_MERCHANT_ID="$MOOV_MERCHANT_ID" \
  MOOV_API_KEY="$MOOV_API_KEY" \
  MOOV_API_SECRET="$MOOV_API_SECRET" \
  MOOV_WEBHOOK_SECRET="$MOOV_WEBHOOK_SECRET" \
  MOOV_NOTIFY_URL=https://api.immobf.africa/api/v1/payments/webhooks/moov-money \
  MOOV_RETURN_URL=https://immobf.africa/payment/return \
  MOOV_USSD_CODE='*555*6#' \
  WAVE_API_KEY="$WAVE_API_KEY" \
  WAVE_WEBHOOK_SECRET="$WAVE_WEBHOOK_SECRET" \
  WAVE_NOTIFY_URL=https://api.immobf.africa/api/v1/payments/webhooks/wave \
  WAVE_RETURN_URL=https://immobf.africa/payment/return

echo "${G}✓${N} Variables Railway configurées"

# ---------------------------------------------------------------
# 4. Push vers Vercel
# ---------------------------------------------------------------
echo ""
echo "${Y}>>> Push variables vers Vercel...${N}"
cd frontend-web
echo "https://api.immobf.africa"   | vercel env add NEXT_PUBLIC_API_URL production --force
echo "https://immobf.africa"       | vercel env add NEXT_PUBLIC_SITE_URL production --force
echo "fr"                          | vercel env add NEXT_PUBLIC_DEFAULT_LOCALE production --force
cd ..
echo "${G}✓${N} Variables Vercel configurées"

# ---------------------------------------------------------------
# 5. Push vers GitHub Actions secrets
# ---------------------------------------------------------------
echo ""
echo "${Y}>>> Configuration secrets GitHub Actions...${N}"
RAILWAY_TOKEN=$(prompt RAILWAY_TOKEN "(railway.app → Account Settings → Tokens)")
VERCEL_TOKEN=$(prompt VERCEL_TOKEN "(vercel.com → Account → Tokens)")
VERCEL_ORG_ID=$(jq -r .orgId frontend-web/.vercel/project.json 2>/dev/null || prompt VERCEL_ORG_ID "")
VERCEL_PROJECT_ID=$(jq -r .projectId frontend-web/.vercel/project.json 2>/dev/null || prompt VERCEL_PROJECT_ID "")

echo "$RAILWAY_TOKEN"      | gh secret set RAILWAY_TOKEN
echo "backend"             | gh secret set RAILWAY_BACKEND_SERVICE
echo "$VERCEL_TOKEN"       | gh secret set VERCEL_TOKEN
echo "$VERCEL_ORG_ID"      | gh secret set VERCEL_ORG_ID
echo "$VERCEL_PROJECT_ID"  | gh secret set VERCEL_PROJECT_ID
echo "https://api.immobf.africa" | gh secret set PUBLIC_API_URL

echo "${G}✓${N} Secrets GitHub Actions configurés"

echo ""
echo "==============================================================="
printf "${G}✅ Tous les secrets sont en place.${N}\n"
echo "==============================================================="
echo ""
echo "Prochaines étapes :"
echo "  1. git push origin main      (déclenche le déploiement)"
echo "  2. ./scripts/smoke-prod.sh   (vérifie que tout est vert)"
echo "  3. Suivre docs/GO_LIVE_CHECKLIST.md"
