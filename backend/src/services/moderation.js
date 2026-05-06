"use strict";

/**
 * Moderation IA anti-fraude (stub pluggable).
 * V1: règles déterministes + statistiques simples ; V2: LLM + phash images.
 */

const FRAUD_KEYWORDS = [
  "western union", "moneygram", "urgent cash", "rendement garanti",
  "profit 100%", "double your money", "bitcoin giveaway",
];

function scoreText(title, description) {
  const blob = `${title || ""} ${description || ""}`.toLowerCase();
  let score = 0;
  for (const kw of FRAUD_KEYWORDS) if (blob.includes(kw)) score += 0.4;
  if (title && title.length < 10) score += 0.1;
  if (!description || description.length < 40) score += 0.15;
  if ((blob.match(/[A-Z]{5,}/g) || []).length > 3) score += 0.1;
  if ((blob.match(/\d{9,}/g) || []).length > 2) score += 0.1;
  return Math.min(score, 1);
}

function scorePrice(price, cityMedian) {
  if (!cityMedian) return 0;
  const ratio = price / cityMedian;
  if (ratio < 0.1 || ratio > 10) return 0.6; // prix très anormal
  if (ratio < 0.25 || ratio > 4) return 0.3;
  return 0;
}

function overallScore({ title, description, price, cityMedian }) {
  return Math.min(scoreText(title, description) + scorePrice(price, cityMedian), 1);
}

function decision(score) {
  if (score >= 0.7) return "reject";
  if (score >= 0.4) return "review";
  return "auto_approve";
}

module.exports = { scoreText, scorePrice, overallScore, decision };
