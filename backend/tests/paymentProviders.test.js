"use strict";

// Réglages env pour le test (mode stub)
process.env.JWT_SECRET = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";

const registry = require("../src/services/PaymentProviderRegistry");

describe("PaymentProviderRegistry", () => {
  test("expose les providers principaux", () => {
    expect(registry.all()).toEqual(
      expect.arrayContaining(["cinetpay", "orange_money_bf", "moov_money_bf", "wave"])
    );
  });

  test("liste par pays BF inclut Orange/Moov/CinetPay/Wave", () => {
    const names = registry.listForCountry("BF").map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining([
      "cinetpay", "orange_money_bf", "moov_money_bf", "wave",
    ]));
  });

  test("unknown provider throws", () => {
    expect(() => registry.get("foo")).toThrow(/Unknown payment provider/);
  });
});

describe("OrangeMoneyProvider stub initiate", () => {
  test("retourne ussd_code + payment_url en mode stub", async () => {
    const p = registry.get("orange_money_bf");
    const r = await p.initiate({
      amount: 5000, currency: "XOF", reference: "REF1",
      customerPhone: "+22670000001", description: "test",
    });
    expect(r.status).toBe("pending");
    expect(r.ussd_code).toBe("*144*4*6#");
    expect(r.payment_url).toContain("REF1");
  });
});

describe("CinetPayProvider parseWebhook", () => {
  test("mappe cpm_result=00 -> succeeded", () => {
    const p = registry.get("cinetpay");
    const parsed = p.parseWebhook({
      cpm_trans_id: "abc", cpm_custom: "REF2", cpm_result: "00",
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
