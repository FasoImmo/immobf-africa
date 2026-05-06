"use strict";

const moderation = require("../src/services/moderation");

describe("moderation.scoreText", () => {
  test("pénalise les mots-clés de fraude", () => {
    const s = moderation.scoreText("Urgent cash!!!", "Double your money western union");
    expect(s).toBeGreaterThan(0.4);
  });

  test("titre trop court augmente le score", () => {
    const s = moderation.scoreText("Vend", "description plus longue que 40 caractères wallah ok");
    expect(s).toBeGreaterThan(0);
  });

  test("contenu normal reste bas", () => {
    const s = moderation.scoreText(
      "Belle villa 4 chambres à Ouagadougou",
      "Villa moderne dans un quartier résidentiel calme, 320m² avec jardin et piscine."
    );
    expect(s).toBeLessThan(0.3);
  });
});

describe("moderation.scorePrice", () => {
  test("prix aberrant renvoie un score élevé", () => {
    expect(moderation.scorePrice(1_000, 10_000_000)).toBeGreaterThan(0.3);
    expect(moderation.scorePrice(500_000_000, 10_000_000)).toBeGreaterThan(0.3);
  });
  test("prix proche de la médiane renvoie 0", () => {
    expect(moderation.scorePrice(12_000_000, 10_000_000)).toBe(0);
  });
});

describe("moderation.decision", () => {
  test("seuils attendus", () => {
    expect(moderation.decision(0.1)).toBe("auto_approve");
    expect(moderation.decision(0.5)).toBe("review");
    expect(moderation.decision(0.8)).toBe("reject");
  });
});
