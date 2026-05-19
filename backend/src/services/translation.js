"use strict";

/**
 * Service de traduction — DeepL Free API (500k chars/mois gratuits).
 * DEEPL_API_KEY doit être injecté dans l'environnement.
 * En l'absence de clé, les fonctions retournent null (dégradation gracieuse).
 *
 * Langues cibles supportées : "en" | "mos" | "dyu"
 * Source supposée : français ("FR").
 */

const logger = require("../utils/logger");

// Les clés Free se terminent par ":fx", les clés payantes non.
// On détecte automatiquement l'endpoint à utiliser.
function getDeeplEndpoint(apiKey) {
  if (!apiKey) return "https://api-free.deepl.com/v2/translate";
  return apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

// DeepL n'a pas le mooré ni le dioula — on log un warning et on passe
const DEEPL_LANGS = { en: "EN-US", fr: "FR" };

/**
 * Traduit un texte via DeepL.
 * @returns {Promise<string|null>} texte traduit ou null si impossible
 */
async function translateText(text, targetLang, sourceLang = "FR") {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!text || !apiKey) return null;

  const deeplTarget = DEEPL_LANGS[targetLang.toLowerCase()];
  if (!deeplTarget) {
    logger.debug({ targetLang }, "DeepL: langue cible non supportée");
    return null;
  }
  if (deeplTarget === sourceLang.toUpperCase()) return text; // même langue

  try {
    const res = await fetch(getDeeplEndpoint(apiKey), {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [text],
        source_lang: sourceLang.toUpperCase(),
        target_lang: deeplTarget,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.warn({ status: res.status, body }, "DeepL API error");
      return null;
    }

    const data = await res.json();
    return data.translations?.[0]?.text ?? null;
  } catch (err) {
    logger.warn({ err: err.message }, "DeepL translate network error");
    return null;
  }
}

/**
 * Traduit en batch : { title, description } → { title, description } traduits.
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
