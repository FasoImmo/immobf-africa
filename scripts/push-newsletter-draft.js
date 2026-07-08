#!/usr/bin/env node
/**
 * Lit le brouillon newsletter généré par la tâche planifiée
 * (C:\Code\immobf-africa\.newsletter-draft.json) et l'envoie à l'API Railway.
 *
 * Usage : node scripts/push-newsletter-draft.js
 */

const fs   = require("fs");
const path = require("path");
const http = require("https");

const DRAFT_FILE   = path.join(__dirname, "..", ".newsletter-draft.json");
const SECRET_FILE  = path.join(__dirname, "..", ".newsletter-draft-secret");
const API_URL      = "https://immobf-africa-production.up.railway.app/api/v1/admin/newsletter/draft";

function post(url, body, secret) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "X-Draft-Secret": secret,
      },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  if (!fs.existsSync(DRAFT_FILE)) {
    console.error("❌ Fichier brouillon introuvable :", DRAFT_FILE);
    console.error("   Lancez d'abord la tâche planifiée 'immobf-newsletter-hebdo' dans Cowork.");
    process.exit(1);
  }
  if (!fs.existsSync(SECRET_FILE)) {
    console.error("❌ Fichier secret introuvable :", SECRET_FILE);
    process.exit(1);
  }

  const draft  = JSON.parse(fs.readFileSync(DRAFT_FILE, "utf-8"));
  const secret = fs.readFileSync(SECRET_FILE, "utf-8").trim();

  console.log("📋 Brouillon chargé :");
  console.log("   Sujet FR :", draft.subject_fr);
  console.log("   Sujet EN :", draft.subject_en);
  console.log("   Généré le :", draft.generated_at || "—");
  console.log("\n⬆️  Envoi à l'API…");

  try {
    const { status, body } = await post(API_URL, {
      subject_fr: draft.subject_fr,
      html_fr:    draft.html_fr,
      subject_en: draft.subject_en,
      html_en:    draft.html_en,
    }, secret);

    if (status === 200) {
      console.log("✅ Brouillon sauvegardé avec succès !");
      console.log("   Accédez à https://immoafrica.online/admin/newsletter pour l'envoyer.");
    } else {
      console.error(`❌ Erreur API (HTTP ${status}) :`, body);
    }
  } catch (e) {
    console.error("❌ Erreur réseau :", e.message);
  }
})();
