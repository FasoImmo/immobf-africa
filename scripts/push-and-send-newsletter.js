#!/usr/bin/env node
/**
 * Automatisation bout-en-bout de la newsletter hebdomadaire :
 *  1. Lit le brouillon généré par la tâche planifiée Cowork
 *     (C:\Code\immobf-africa\.newsletter-draft.json)
 *  2. Le sauvegarde côté API (pour trace / relecture éventuelle dans /admin/newsletter)
 *  3. Envoie directement les deux versions (FR et EN) à tous les utilisateurs Africa
 *
 * ⚠️ AUCUNE relecture humaine n'a lieu entre la génération du brouillon et l'envoi.
 * Le fichier .newsletter-draft-secret sert de clé d'envoi de masse — à protéger
 * comme un mot de passe. Décision d'automatisation acceptée le 2026-07-27.
 *
 * Usage : node scripts/push-and-send-newsletter.js
 * Sortie : code 0 si les deux langues sont parties, code 1 si au moins une a échoué.
 */

const fs   = require("fs");
const path = require("path");
const https = require("https");

const DRAFT_FILE  = path.join(__dirname, "..", ".newsletter-draft.json");
const SECRET_FILE = path.join(__dirname, "..", ".newsletter-draft-secret");
const API_BASE    = "https://immobf-africa-production.up.railway.app/api/v1";

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
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch (_) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  let hadError = false;

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

  // 1) Sauvegarde du brouillon côté API (garde une trace consultable dans /admin/newsletter)
  console.log("\n⬆️  Sauvegarde du brouillon…");
  try {
    const { status, body } = await post(`${API_BASE}/admin/newsletter/draft`, {
      subject_fr: draft.subject_fr,
      html_fr:    draft.html_fr,
      subject_en: draft.subject_en,
      html_en:    draft.html_en,
    }, secret);
    if (status === 200) {
      console.log("   ✅ Brouillon sauvegardé.");
    } else {
      hadError = true;
      console.error(`   ❌ Erreur API (HTTP ${status}) :`, body);
    }
  } catch (e) {
    hadError = true;
    console.error("   ❌ Erreur réseau (sauvegarde) :", e.message);
  }

  // 2) Envoi réel — FR puis EN, à tous les pays (pas de filtre country_code)
  const sends = [
    { lang: "FR", subject: draft.subject_fr, html: draft.html_fr },
    { lang: "EN", subject: draft.subject_en, html: draft.html_en },
  ];

  for (const s of sends) {
    if (!s.subject || !s.html) {
      console.error(`\n❌ Contenu ${s.lang} manquant dans le brouillon, envoi ${s.lang} annulé.`);
      hadError = true;
      continue;
    }
    console.log(`\n📤 Envoi ${s.lang}…`);
    try {
      const { status, body } = await post(`${API_BASE}/admin/newsletter`, {
        subject: s.subject,
        html: s.html,
        country_code: null, // tous pays confondus
      }, secret);
      if (status === 200) {
        console.log(`   ✅ ${s.lang} envoyée à ${body.sent}/${body.total_recipients} destinataires.`);
      } else {
        hadError = true;
        console.error(`   ❌ Erreur API ${s.lang} (HTTP ${status}) :`, body);
      }
    } catch (e) {
      hadError = true;
      console.error(`   ❌ Erreur réseau (envoi ${s.lang}) :`, e.message);
    }
  }

  console.log(hadError ? "\n⚠️  Terminé avec au moins une erreur." : "\n✅ Newsletter FR + EN envoyée avec succès.");
  process.exit(hadError ? 1 : 0);
})();
