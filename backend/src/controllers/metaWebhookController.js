"use strict";

/**
 * Webhook Meta Lead Ads → contacts CRM
 *
 * Endpoints :
 *   GET  /webhooks/meta  — vérification d'abonnement (hub.challenge)
 *   POST /webhooks/meta  — réception d'un lead (payload JSON signé HMAC-SHA256)
 *
 * Variables d'environnement requises :
 *   META_VERIFY_TOKEN        — token libre choisi lors de la config du webhook FB
 *   META_APP_SECRET          — App Secret (Meta for Developers → Settings → Basic)
 *   META_PAGE_ACCESS_TOKEN   — token de page (Permissions : leads_retrieval)
 */

const crypto = require("crypto");
const https  = require("https");
const Contact = require("../models/Contact");
const { sendBulkNewsletter } = require("../services/email");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Vérifie la signature X-Hub-Signature-256 envoyée par Meta */
function verifySignature(rawBody, signature) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return false; // si pas configuré, on laisse passer en dev
  if (!signature) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch (_) {
    return false;
  }
}

/** Récupère les données du lead depuis l'API Graph de Meta */
async function fetchLeadFromGraph(leadgenId) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("META_PAGE_ACCESS_TOKEN non configuré");

  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,created_time,ad_id,form_id&access_token=${token}`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(parsed.error.message));
          else resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

/** Extrait les champs du formulaire Meta (tableau field_data) */
function extractFields(fieldData = []) {
  const map = {};
  for (const { name, values } of fieldData) {
    map[name.toLowerCase().replace(/[^a-z0-9_]/g, "_")] = values?.[0] || null;
  }
  // Alias courants que Meta utilise dans les formulaires
  const email  = map.email || map.email_address || null;
  const phone  = map.phone_number || map.phone || map.tel || null;
  const name   = map.full_name || map.name ||
                 [map.first_name, map.last_name].filter(Boolean).join(" ") || null;
  const city   = map.city || map.ville || null;
  const budget = map.budget || map.budget_max || null;
  const type   = map.type_de_bien || map.property_type || map.type || null;

  return { email, phone, name, city, budget, type };
}

// ─── GET /webhooks/meta ───────────────────────────────────────────────────────

async function verify(req, res) {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    console.info("[meta-webhook] Vérification réussie");
    return res.status(200).send(challenge);
  }
  console.warn("[meta-webhook] Vérification échouée — token ou mode invalide");
  res.sendStatus(403);
}

// ─── POST /webhooks/meta ──────────────────────────────────────────────────────

async function receive(req, res) {
  // Meta attend un 200 rapide — on répond immédiatement et on traite en arrière-plan
  res.sendStatus(200);

  const rawBody  = req.rawBody; // attaché par le middleware rawBody
  const signature = req.headers["x-hub-signature-256"] || "";

  if (process.env.NODE_ENV === "production" && !verifySignature(rawBody, signature)) {
    console.warn("[meta-webhook] Signature invalide — payload ignoré");
    return;
  }

  let body;
  try {
    body = typeof req.body === "object" ? req.body : JSON.parse(rawBody);
  } catch (_) {
    console.error("[meta-webhook] Impossible de parser le payload");
    return;
  }

  // Parcourir les entrées du payload
  for (const entry of (body.entry || [])) {
    for (const change of (entry.changes || [])) {
      if (change.field !== "leadgen") continue;

      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;

      try {
        // 1. Récupérer les données complètes du lead
        const leadData = await fetchLeadFromGraph(leadgenId);
        const { email, phone, name, city, budget, type } = extractFields(leadData.field_data || []);

        if (!email) {
          console.warn(`[meta-webhook] Lead ${leadgenId} sans email — ignoré`);
          continue;
        }

        // 2. Upsert contact CRM
        const contact = await Contact.upsert({
          email,
          phone,
          name,
          country: "BF",     // les pubs ImmoBF ciblent le BF par défaut
          language: "fr",
        });

        // 3. Merger les préférences si dispo dans le formulaire
        const prefs = {};
        if (type)   prefs.types   = [type];
        if (city)   prefs.cities  = [city];
        if (budget) prefs.budget_max = parseInt(budget, 10) || undefined;
        if (Object.keys(prefs).length) {
          await Contact.mergePreferences(email, prefs);
        }

        // 4. Email de bienvenue
        if (contact) {
          const firstName = (name || "").split(" ")[0] || "vous";
          await sendBulkNewsletter(email, {
            subject: "Bienvenue sur ImmoBF Africa 🏠",
            recipientName: name || null,
            html: `
              <h2 style="color:#0E7C66">Bonjour ${firstName},</h2>
              <p>Merci de votre intérêt pour <strong>ImmoBF Africa</strong> !</p>
              <p>Nous vous accompagnons dans votre projet immobilier au Burkina Faso et en Afrique de l'Ouest.</p>
              <p>Consultez nos annonces dès maintenant :</p>
              <p style="margin:24px 0">
                <a href="https://immoafrica.online" style="background:#0E7C66;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
                  Voir les annonces
                </a>
              </p>
              <p style="color:#666;font-size:14px">
                Vous pouvez également télécharger notre application mobile pour ne manquer aucune opportunité.
              </p>
            `,
          });
        }

        console.info(`[meta-webhook] Lead traité : ${email} (leadgen_id=${leadgenId})`);
      } catch (err) {
        console.error(`[meta-webhook] Erreur traitement lead ${leadgenId}:`, err.message);
      }
    }
  }
}

module.exports = { verify, receive };
