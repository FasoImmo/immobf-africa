#!/usr/bin/env node
/**
 * facebook-listing-publisher.js
 * Publie automatiquement les annonces ImmoBF Africa sur la page Facebook @immoafricabf
 *
 * Usage:
 *   node --env-file=.env.facebook facebook-listing-publisher.js
 *
 * Variables requises dans .env.facebook :
 *   FB_PAGE_ACCESS_TOKEN=<long-lived page access token>
 *
 * Fichier de suivi (non versionné) :
 *   facebook-posted-ids.json  — créé automatiquement dans le même dossier
 */

"use strict";

const https  = require("https");
const fs     = require("fs");
const path   = require("path");

// ─── Config ───────────────────────────────────────────────────────────────────
const PAGE_ID          = "61591828812763";
const API_BASE         = "https://api.immoafrica.online/api/v1";
const SITE_BASE        = "https://immoafrica.online";
const APP_DOWNLOAD     = "https://immoafrica.online/download";
const FB_API_BASE      = "https://graph.facebook.com/v20.0";
const TRACKING_FILE    = path.join(__dirname, "facebook-posted-ids.json");
const COOLDOWN_DAYS    = 21;   // pas de re-publication avant 21 jours
const MAX_FETCH        = 50;   // nb d'annonces récupérées par appel
const MAX_POSTS_PER_RUN = 3;   // max publications par exécution

// ─── Labels ───────────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  land:       "Terrain",
  house:      "Maison",
  apartment:  "Appartement",
  office:     "Bureau",
  commercial: "Local commercial",
};

const TYPE_EMOJIS = {
  land:       "🌍",
  house:      "🏠",
  apartment:  "🏢",
  office:     "🏗️",
  commercial: "🏪",
};

const TX_LABELS = {
  sale:       "à vendre",
  rent_long:  "en location",
  rent_short: "en location courte durée",
};

const TYPE_HASHTAGS = {
  land:       "#Terrain",
  house:      "#Maison",
  apartment:  "#Appartement",
  office:     "#Bureau",
  commercial: "#LocalCommercial",
};

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "ImmoBF-FB-Publisher/1.0" } }, (res) => {
      let raw = "";
      res.on("data", (c) => { raw += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("JSON parse: " + e.message + "\n" + raw.slice(0, 200))); }
      });
    }).on("error", reject);
  });
}

function httpPost(url, body) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "User-Agent":     "ImmoBF-FB-Publisher/1.0",
      },
    }, (res) => {
      let raw = "";
      res.on("data", (c) => { raw += c; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (_) { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Tracking ─────────────────────────────────────────────────────────────────
function loadTracking() {
  try {
    if (fs.existsSync(TRACKING_FILE)) return JSON.parse(fs.readFileSync(TRACKING_FILE, "utf8"));
  } catch (_) {}
  return {};
}

function saveTracking(data) {
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2), "utf8");
}

function recentlyPosted(id, tracking) {
  const entry = tracking[id];
  if (!entry) return false;
  const days = (Date.now() - new Date(entry.posted_at).getTime()) / 86_400_000;
  return days < COOLDOWN_DAYS;
}

// ─── Score de sélection ───────────────────────────────────────────────────────
// Objectif : favoriser les annonces récentes, bien renseignées et avec photos
function score(prop) {
  let s = 0;
  s += (prop.photos || []).length * 3;          // photos = visibilité ++
  if (prop.description && prop.description.length > 100) s += 2;
  if (prop.price != null)   s += 1;
  if (prop.area_m2 != null) s += 1;
  if (prop.verified)        s += 2;
  if (prop.boosted_until && new Date(prop.boosted_until) > new Date()) s += 3;
  if (prop.published_at) {
    const days = (Date.now() - new Date(prop.published_at).getTime()) / 86_400_000;
    if (days < 3)  s += 4;
    else if (days < 7)  s += 3;
    else if (days < 14) s += 1;
  }
  return s;
}

// ─── Mise en forme du post Facebook ─────────────────────────────────────────
function formatPrice(price, currency) {
  if (price == null) return null;
  const cur = currency || "XOF";
  if (cur === "XOF") return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  return price.toLocaleString("fr-FR") + " " + cur;
}

function buildPost(prop) {
  const emoji    = TYPE_EMOJIS[prop.type]  || "🏠";
  const typeL    = TYPE_LABELS[prop.type]  || prop.type;
  const txL      = TX_LABELS[prop.transaction_type] || prop.transaction_type;
  const city     = prop.city || "";
  const country  = prop.country_code === "BF" ? "Burkina Faso" : (prop.country_code || "");
  const hashtag  = TYPE_HASHTAGS[prop.type] || "#ImmoBF";
  const cityTag  = city.replace(/\s+/g, "");

  const lines = [];
  lines.push(`${emoji} ${typeL.toUpperCase()} ${txL.toUpperCase()} — ${city}${country ? ", " + country : ""}`);
  lines.push("");
  lines.push(prop.title);
  lines.push("");

  if (prop.description) {
    const excerpt = prop.description.length > 300
      ? prop.description.slice(0, 300).trimEnd() + "..."
      : prop.description;
    lines.push(excerpt);
    lines.push("");
  }

  const price = formatPrice(prop.price, prop.currency);
  if (price)          lines.push(`💰 Prix : ${price}`);
  if (prop.area_m2)   lines.push(`📐 Superficie : ${prop.area_m2} m²`);
  if (prop.bedrooms)  lines.push(`🛏️ ${prop.bedrooms} chambre${prop.bedrooms > 1 ? "s" : ""}`);
  if (prop.bathrooms) lines.push(`🚿 ${prop.bathrooms} salle${prop.bathrooms > 1 ? "s" : ""} de bain`);
  if (prop.is_furnished) lines.push("✅ Meublé");
  if (prop.neighborhood) lines.push(`📍 ${prop.neighborhood}`);
  lines.push("");
  lines.push(`🔗 Voir l'annonce : ${SITE_BASE}/properties/${prop.id}`);
  lines.push(`📱 Télécharger l'app gratuite : ${APP_DOWNLOAD}`);
  lines.push("");
  lines.push(`${hashtag} #ImmoBF #Immobilier #${cityTag} #BurkinaFaso #AfriqueOccidentale`);

  return lines.join("\n");
}

// ─── Publication ──────────────────────────────────────────────────────────────
async function publishOne(prop, token) {
  const caption = buildPost(prop);
  const photos  = (prop.photos || []).filter(p => !p.is_360).sort((a, b) => a.sort_order - b.sort_order);
  const cover   = photos[0];

  if (cover) {
    return httpPost(
      `${FB_API_BASE}/${PAGE_ID}/photos?access_token=${token}`,
      { url: cover.url, caption, published: true }
    );
  }
  return httpPost(
    `${FB_API_BASE}/${PAGE_ID}/feed?access_token=${token}`,
    { message: caption, link: `${SITE_BASE}/properties/${prop.id}` }
  );
}

// ─── Entrée principale ────────────────────────────────────────────────────────
async function main() {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error("❌  FB_PAGE_ACCESS_TOKEN absent.");
    console.error("    Créez le fichier .env.facebook dans C:\\Code\\immobf-africa avec :");
    console.error("    FB_PAGE_ACCESS_TOKEN=<votre token long-lived>");
    process.exit(1);
  }

  // 1. Récupérer les annonces publiées les plus récentes
  console.log(`\n📡 Récupération des ${MAX_FETCH} annonces les plus récentes…`);
  const data = await httpGet(`${API_BASE}/properties?sort=newest&limit=${MAX_FETCH}`);
  const items = data.items || [];
  console.log(`   ✅ ${items.length} annonces (total plateforme : ${data.total})`);

  // 2. Filtrer celles déjà publiées récemment
  const tracking  = loadTracking();
  const fresh     = items.filter(p => !recentlyPosted(p.id, tracking));
  console.log(`   📌 ${fresh.length} candidates (hors cooldown ${COOLDOWN_DAYS}j)`);

  if (fresh.length === 0) {
    console.log("\nℹ️  Aucune annonce éligible. Prochaine exécution dans 2 jours.");
    return;
  }

  // 3. Regrouper par (type × transaction_type), garder le meilleur par groupe
  //    Score préliminaire sans photos (les photos sont dans /properties/:id)
  const groups = {};
  for (const p of fresh) {
    const key = `${p.type}__${p.transaction_type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  const shortlist = [];
  for (const [, group] of Object.entries(groups)) {
    group.sort((a, b) => score(b) - score(a));
    shortlist.push(group[0]);
  }

  // 4. Trier la shortlist globalement, limiter au max par run
  shortlist.sort((a, b) => score(b) - score(a));
  const selected = shortlist.slice(0, MAX_POSTS_PER_RUN);

  console.log(`\n🎯 ${selected.length} annonce(s) retenue(s) :`);
  selected.forEach(p =>
    console.log(`   [${TYPE_LABELS[p.type] || p.type} / ${TX_LABELS[p.transaction_type] || p.transaction_type}] ${p.title}`)
  );

  // 5. Pour chaque sélectionnée : fetch détail (avec photos) + publication
  let published = 0;
  for (const p of selected) {
    try {
      process.stdout.write(`\n🔄 Détail + publication : "${p.title}"…`);
      const detail = await httpGet(`${API_BASE}/properties/${p.id}`);
      await sleep(1500);

      const photoCount = (detail.photos || []).length;
      const result     = await publishOne(detail, token);

      if (result.status >= 200 && result.status < 300 && result.body?.id) {
        console.log(` ✅ (${photoCount} photo${photoCount !== 1 ? "s" : ""}) → FB post ${result.body.id}`);
        tracking[p.id] = {
          posted_at:        new Date().toISOString(),
          fb_post_id:       result.body.id,
          title:            p.title,
          type:             p.type,
          transaction_type: p.transaction_type,
          city:             p.city,
        };
        saveTracking(tracking);
        published++;
      } else {
        console.log(` ❌ Erreur FB (HTTP ${result.status}) :`, JSON.stringify(result.body));
      }
    } catch (err) {
      console.log(` ❌ Exception :`, err.message);
    }

    if (published < selected.length) await sleep(3000);
  }

  console.log(`\n🎉 ${published}/${selected.length} annonce(s) publiée(s) sur @immoafricabf\n`);
}

main().catch(err => {
  console.error("❌ Erreur fatale :", err.message);
  process.exit(1);
});
