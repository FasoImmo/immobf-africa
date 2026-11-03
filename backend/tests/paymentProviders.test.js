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
  // API 1.0 « Aurore » : le webhook n'est qu'un signal. Le statut n'est jamais lu
  // dans le payload ; parseWebhook() le revérifie via checkStatus() (GET statut).
  test("revérifie le statut via checkStatus et renvoie le statut canonique", async () => {
    const p = registry.get("cinetpay");
    const spy = jest.spyOn(p, "checkStatus").mockResolvedValue({
      reference: "REF2", status: "succeeded", external_id: "CP-123", raw: { ok: true },
    });
    const parsed = await p.parseWebhook({ merchant_transaction_id: "REF2", status: "FAILED" });
    expect(spy).toHaveBeenCalledWith("REF2");
    expect(parsed.status).toBe("succeeded"); // le statut du payload est ignoré
    expect(parsed.reference).toBe("REF2");
    expect(parsed.external_id).toBe("CP-123");
    spy.mockRestore();
  });

  test("accepte merchant_transaction_id imbriqué dans data", async () => {
    const p = registry.get("cinetpay");
    const spy = jest.spyOn(p, "checkStatus").mockResolvedValue({ reference: "REF3", status: "pending", raw: {} });
    const parsed = await p.parseWebhook({ data: { merchant_transaction_id: "REF3" } });
    expect(spy).toHaveBeenCalledWith("REF3");
    expect(parsed.reference).toBe("REF3");
    spy.mockRestore();
  });

  test("payload sans merchant_transaction_id -> pending sans référence", async () => {
    const p = registry.get("cinetpay");
    const parsed = await p.parseWebhook({ cpm_trans_id: "REF2", cpm_result: "00" });
    expect(parsed.reference).toBeNull();
    expect(parsed.status).toBe("pending");
  });

  test("échec de la revérification -> pending (repris par la réconciliation)", async () => {
    const p = registry.get("cinetpay");
    const spy = jest.spyOn(p, "checkStatus").mockRejectedValue(new Error("network down"));
    const parsed = await p.parseWebhook({ merchant_transaction_id: "REF4" });
    expect(parsed.reference).toBe("REF4");
    expect(parsed.status).toBe("pending");
    spy.mockRestore();
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
