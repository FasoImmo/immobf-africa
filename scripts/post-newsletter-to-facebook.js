#!/usr/bin/env node
/**
 * post-newsletter-to-facebook.js
 * Publie un résumé de la newsletter hebdomadaire ImmoBF Africa sur la page
 * Facebook @immoafricabf (ID interne Business: 1231000666764203 — l'ID public
 * 61591828812763 renvoie "global id not allowed" avec un token System User),
 * en s'appuyant sur le brouillon généré par la tâche planifiée "immobf-newsletter-hebdo".
 *
 * Usage:
 *   node --env-file=.env.facebook scripts/post-newsletter-to-facebook.js
 *
 * Fichier source (créé par la tâche planifiée) :
 *   .newsletter-fb-post.json   — { "text": "<texte du post FB, 150-250 mots>" }
 *
 * Variables requises dans .env.facebook :
 *   FB_PAGE_ACCESS_TOKEN=<long-lived page access token>
 */

"use strict";

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const PAGE_ID     = "1231000666764203"; // ID interne Business (l'ID public 61591828812763 renvoie "global id not allowed" avec un token System User
const FB_API_BASE = "https://graph.facebook.com/v20.0";
const SITE_BASE   = "https://immoafrica.online";
const SOURCE_FILE = path.join(__dirname, "..", ".newsletter-fb-post.json");

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
        "User-Agent":     "ImmoBF-Newsletter-FB-Publisher/1.0",
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

async function main() {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error("❌  FB_PAGE_ACCESS_TOKEN absent.");
    console.error("    Créez/complétez le fichier .env.facebook dans C:\\Code\\immobf-africa avec :");
    console.error("    FB_PAGE_ACCESS_TOKEN=<votre token long-lived>");
    console.error("    (voir .env.facebook.example pour la procédure)");
    process.exit(1);
  }

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error("❌  Fichier introuvable :", SOURCE_FILE);
    console.error("    Lancez d'abord la tâche planifiée 'immobf-newsletter-hebdo'.");
    process.exit(1);
  }

  const { text } = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"));
  if (!text || !text.trim()) {
    console.error("❌  Le champ 'text' est vide dans", SOURCE_FILE);
    process.exit(1);
  }

  console.log("📋 Post à publier (aperçu) :");
  console.log("   " + text.slice(0, 120).replace(/\n/g, " ") + "…");
  console.log("\n⬆️  Publication sur @immoafricabf…");

  try {
    const result = await httpPost(
      `${FB_API_BASE}/${PAGE_ID}/feed?access_token=${token}`,
      { message: text, link: `${SITE_BASE}/properties` }
    );

    if (result.status >= 200 && result.status < 300 && result.body?.id) {
      console.log(`✅ Publié avec succès → FB post ${result.body.id}`);
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
