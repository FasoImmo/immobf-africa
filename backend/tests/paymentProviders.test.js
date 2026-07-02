"use strict";

// Reglages env pour le test (mode stub)
process.env.JWT_SECRET = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";

const registry = require("../src/services/PaymentProviderRegistry");

describe("PaymentProviderRegistry", () => {
  test("expose les providers principaux", () => {
    expect(registry.all()).toEqual(
      expect.arrayContaining(["cinetpay", "orange_money_bf", "moov_money_bf", "wave"])
    );
  });

  // listForCountry filtre par isConfigured() — en CI (pas de cles API) => []
  // On teste donc les .countries des providers directement.
  test("orange_money_bf couvre BF", () => {
    expect(registry.get("orange_money_bf").countries).toContain("BF");
  });

  test("moov_money_bf couvre BF", () => {
    expect(registry.get("moov_money_bf").countries).toContain("BF");
  });

  test("cinetpay couvre BF", () => {
    expect(registry.get("cinetpay").countries).toContain("BF");
  });

  test("unknown provider throws", () => {
    expect(() => registry.get("foo")).toThrow(/Unknown payment provider/);
  });
});

describe("OrangeMoneyProvider stub initiate", () => {
  // En stub, OrangeMoneyProvider auto-valide sans appel HTTP reel.
  test("retourne external_id auto-valide en mode stub", async () => {
    const p = registry.get("orange_money_bf");
    const r = await p.initiate({
      amount: 5000, currency: "XOF", reference: "REF1",
      customerPhone: "+22670000001", description: "test",
    });
    expect(r.status).toBe("succeeded");
    expect(r.external_id).toMatch(/om_stub_REF1/);
    expect(r.payment_url).toBeNull();
    expect(r.raw.stub).toBe(true);
  });
});

describe("CinetPayProvider parseWebhook", () => {
  test("mappe cpm_result=00 -> succeeded", () => {
    const p = registry.get("cinetpay");
    // CinetPay renvoie notre reference dans cpm_trans_id (pas cpm_custom)
    const parsed = p.parseWebhook({
      cpm_trans_id: "REF2", cpm_custom: "meta", cpm_result: "00",
      cpm_amount: 5000, cpm_currency: "XOF",
    });
    expect(parsed.status).toBe("succeeded");
    expect(parsed.reference).toBe("REF2");
    expect(parsed.amount).toBe(5000);
  });
});

describe("WaveProvider parseWebhook", () => {
  test("mappe checkout.session.completed -> succeeded", () => {
    const p = registry.get("wave");
    const parsed = p.parseWebhook({
      type: "checkout.session.completed",
      data: { id: "sess_1", client_reference: "REF3", amount: "10000", currency: "XOF" },
    });
    expect(parsed.status).toBe("succeeded");
    expect(parsed.reference).toBe("REF3");
  });
});
