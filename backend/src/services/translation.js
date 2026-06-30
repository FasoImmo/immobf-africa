"use strict";

/**
 * Service de traduction — supporte deux backends :
 *
 * 1. LibreTranslate (prioritaire, open-source, gratuit) :
 *    LIBRETRANSLATE_URL  (défaut : https://translate.argosopentech.com)
 *    LIBRETRANSLATE_API_KEY (optionnel selon l'instance)
 *
 * 2. DeepL (haute qualité, 500k chars/mois gratuits en Free) :
 *    DEEPL_API_KEY  — si défini, utilisé à la place de LibreTranslate.
 *
 * Dégradation gracieuse : si les deux backends sont indisponibles ou
 * renvoient une erreur, les fonctions retournent null et le titre original
 * (français) est conservé.
 *
 * Langues cibles documentées : "en" (anglais). Le mooré et le dioula ne
 * sont pas supportés par ces backends.
 *
 * Flux utilisé :
 *   Property.withTranslation() vérifie d'abord le cache JSONB
 *   (title_translations / description_translations). Si vide,
 *   translateProperty() est appelée ici, puis le résultat est mis en
 *   cache via Property.cacheTranslation() — la traduction ne se fait
 *   donc qu'une seule fois par annonce et par langue.
 */

const logger = require("../utils/logger");

// --- LibreTranslate -------------------------------------------------------

async function translateViaLibre(text, targetLang) {
  const baseUrl = (process.env.LIBRETRANSLATE_URL || "https://translate.argosopentech.com").replace(/\/$/, "");
  const apiKey  = process.env.LIBRETRANSLATE_API_KEY || "";

  const body = { q: text, source: "fr", target: targetLang, format: "text" };
  if (apiKey) body.api_key = apiKey;

  const res = await fetch(`${baseUrl}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`LibreTranslate HTTP ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.translatedText) throw new Error("LibreTranslate: réponse vide");
  return data.translatedText;
}

// --- DeepL ----------------------------------------------------------------

function getDeeplEndpoint(apiKey) {
  return apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

const DEEPL_LANGS = { en: "EN-US", fr: "FR" };

async function translateViaDeepL(text, targetLang) {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) throw new Error("DEEPL_API_KEY absent");

  const deeplTarget = DEEPL_LANGS[targetLang.toLowerCase()];
  if (!deeplTarget) throw new Error(`DeepL: langue cible non supportée: ${targetLang}`);

  const res = await fetch(getDeeplEndpoint(apiKey), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: [text], source_lang: "FR", target_lang: deeplTarget }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`DeepL HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const translated = data.translations?.[0]?.text;
  if (!translated) throw new Error("DeepL: réponse vide");
  return translated;
}

// --- Dispatcher -----------------------------------------------------------

/**
 * Traduit un texte : essaie DeepL si DEEPL_API_KEY est défini, sinon
 * LibreTranslate. Retourne null en cas d'échec (dégradation gracieuse).
 */
async function translateText(text, targetLang, _sourceLang = "fr") {
  if (!text || !targetLang || targetLang === "fr") return null;

  // DeepL si la clé est présente (meilleure qualité)
  if (process.env.DEEPL_API_KEY) {
    try {
      return await translateViaDeepL(text, targetLang);
    } catch (err) {
      logger.warn({ err: err.message, targetLang }, "DeepL echec — bascule sur LibreTranslate");
    }
  }

  // LibreTranslate (open-source, sans quota si auto-heberge)
  try {
    return await translateViaLibre(text, targetLang);
  } catch (err) {
    logger.warn({ err: err.message, targetLang }, "LibreTranslate echec — traduction ignoree");
    return null;
  }
}

/**
 * Traduit en batch : { title, description } → { title, description }.
 * Retourne les originaux si la traduction échoue.
 */
async function translateProperty(title, description, lang) {
  if (!lang || lang === "fr") return { title, description };

  const [translatedTitle, translatedDesc] = await Promise.all([
    translateText(title, lang),
    description ? translateText(description, lang) : Promise.resolve(null),
  ]);

  return {
    title: translatedTitle || title,
    description: translatedDesc || description,
  };
}

module.exports = { translateText, translateProperty };
