#!/usr/bin/env node
/**
 * post-facebook-theme.js
 * Publie un post thématique (astuce / fonctionnalité / marché / appel à publier)
 * sur la page Facebook @immoafricabf, en complément de facebook-listing-publisher.js
 * (qui publie les annonces réelles mar/jeu/sam) et de post-newsletter-to-facebook.js
 * (résumé newsletter, lundi).
 *
 * Le brouillon est généré par la tâche planifiée Cowork "immobf-facebook-theme-post"
 * (mer/ven 09:00), qui écrit .facebook-theme-post.json. Ce script se contente de le
 * lire et de le publier — il tourne depuis la machine Windows locale car le sandbox
 * Cowork n'a pas accès réseau à graph.facebook.com (voir .env.facebook.example et
 * scripts/run-newsletter-auto.ps1 pour le même schéma).
 *
 * Usage:
 *   node --env-file=.env.facebook scripts/post-facebook-theme.js
 *
 * Fichier source (créé par la tâche planifiée) :
 *   .facebook-theme-post.json — { "message": "<texte du post>", "theme": "...", "link": "https://...", "generatedAt": "..." }
 *
 * Variables requises dans .env.facebook :
 *   FB_PAGE_ACCESS_TOKEN=<long-lived page access token>
 */

"use strict";

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const PAGE_ID     = "1231000666764203"; // ID interne Business (l'ID public 61591828812763 renvoie "global id not allowed" avec un token System User)
const FB_API_BASE = "https://graph.facebook.com/v20.0";
const SITE_BASE   = "https://immoafrica.online";
const SOURCE_FILE = path.join(__dirname, "..", ".facebook-theme-post.json");
const POSTED_LOG  = path.join(__dirname, "..", "facebook-theme-posted-log.json");

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
        "User-Agent":     "ImmoBF-Theme-FB-Publisher/1.0",
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

function appendPostedLog(entry) {
  let log = [];
  if (fs.existsSync(POSTED_LOG)) {
    try { log = JSON.parse(fs.readFileSync(POSTED_LOG, "utf8")); } catch (_) { log = []; }
  }
  log.push(entry);
  // garde les 50 dernières entrées seulement
  if (log.length > 50) log = log.slice(log.length - 50);
  fs.writeFileSync(POSTED_LOG, JSON.stringify(log, null, 2), "utf8");
}

async function main() {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error("❌  FB_PAGE_ACCESS_TOKEN absent.");
    console.error("    Créez/complétez le fichier .env.facebook dans C:\\Code\\immobf-africa avec :");
    console.error("    FB_PAGE_ACCESS_TOKEN=<votre token long-lived>");
    process.exit(1);
  }

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error("❌  Fichier introuvable :", SOURCE_FILE);
    console.error("    Lancez d'abord la tâche planifiée 'immobf-facebook-theme-post'.");
    process.exit(1);
  }

  const draft = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"));
  const { message, theme, link, generatedAt } = draft;

  if (!message || !message.trim()) {
    console.error("❌  Le champ 'message' est vide dans", SOURCE_FILE);
    process.exit(1);
  }

  console.log(`📋 Thème : ${theme || "(non précisé)"} — généré le ${generatedAt || "?"}`);
  console.log("   " + message.slice(0, 120).replace(/\n/g, " ") + "…");
  console.log("\n⬆️  Publication sur @immoafricabf…");

  try {
    const result = await httpPost(
      `${FB_API_BASE}/${PAGE_ID}/feed?access_token=${token}`,
      { message, link: link || SITE_BASE }
    );

    if (result.status >= 200 && result.status < 300 && result.body?.id) {
      console.log(`✅ Publié avec succès → FB post ${result.body.id}`);
      appendPostedLog({
        postedAt: new Date().toISOString(),
        theme: theme || null,
        fbPostId: result.body.id,
      });
    } else {
      console.error(`❌ Erreur FB (HTTP ${result.status}) :`, JSON.stringify(result.body));
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Erreur réseau :", err.message);
    process.exit(1);
  }
}

main();
