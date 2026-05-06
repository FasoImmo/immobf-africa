"use strict";

// Mode stub : pas de FEDAPAY_SECRET_KEY -> initiate ne fait pas d'appel HTTP
process.env.JWT_SECRET = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";
delete process.env.FEDAPAY_SECRET_KEY;
delete process.env.FEDAPAY_WEBHOOK_SECRET;

const crypto = require("crypto");

describe("FedaPayProvider", () => {
  let registry;
  let provider;

  beforeAll(() => {
    // Re-require pour prendre en compte les env vars supprimées
    jest.resetModules();
    registry = require("../src/services/PaymentProviderRegistry");
    provider = registry.get("fedapay");
  });

  test("est enregistré comme provider", () => {
    expect(registry.all()).toContain("fedapay");
  });

  test("couvre BF + UEMOA + Guinée", () => {
    expect(provider.countries).toEqual(
      expect.arrayContaining(["BF", "BJ", "CI", "SN", "TG", "NE", "ML", "GN"])
    );
  });

  test("supporte XOF et GNF", () => {
    expect(provider.currencies).toEqual(expect.arrayContaining(["XOF", "GNF"]));
  });

  test("apparaît en tête de la liste pour BF", () => {
    const names = registry.listForCountry("BF").map((p) => p.name);
    expect(names[0]).toBe("fedapay");
  });

  describe("initiate (mode stub)", () => {
    test("retourne payment_url et external_id sans clé", async () => {
      const r = await provider.initiate({
        amount: 4250000,
        currency: "XOF",
        reference: "IMO-TEST-1",
        customerPhone: "+22670000001",
        customerEmail: "buyer@example.com",
        customerName: "Jean Ouedraogo",
        preferredOperator: "orange",
      });
      expect(r.status).toBe("pending");
      expect(r.external_id).toMatch(/fp_stub_/);
      expect(r.payment_url).toContain("IMO-TEST-1");
      expect(r.ussd_code).toBe("*144*4*6#");
      expect(r.raw.stub).toBe(true);
    });

    test("ussd_code null si aucun opérateur préféré", async () => {
      const r = await provider.initiate({
        amount: 1000, currency: "XOF", reference: "IMO-TEST-2",
        customerPhone: "+22670000002",
      });
      expect(r.ussd_code).toBeNull();
    });
  });

  describe("parseWebhook", () => {
    test("transaction.approved -> succeeded", () => {
      const parsed = provider.parseWebhook({
        name: "transaction.approved",
        entity: {
          id: 12345,
          status: "approved",
          amount: 4250000,
          currency: { iso: "XOF" },
          metadata: { reference: "IMO-1234" },
        },
      });
      expect(parsed.status).toBe("succeeded");
      expect(parsed.reference).toBe("IMO-1234");
      expect(parsed.amount).toBe(4250000);
      expect(parsed.currency).toBe("XOF");
      expect(parsed.external_id).toBe("12345");
    });

    test("transaction.declined -> failed", () => {
      const parsed = provider.parseWebhook({
        name: "transaction.declined",
        entity: { id: 99, status: "declined", amount: 1000, currency: { iso: "XOF" } },
      });
      expect(parsed.status).toBe("failed");
    });

    test("transaction.refunded -> refunded", () => {
      const parsed = provider.parseWebhook({
        name: "transaction.refunded",
        entity: { id: 42, status: "refunded", amount: 5000, currency: { iso: "XOF" } },
      });
      expect(parsed.status).toBe("refunded");
    });

    test("statut inconnu -> pending (fail-safe)", () => {
      const parsed = provider.parseWebhook({
        name: "transaction.weird",
        entity: { id: 1, status: "weird", amount: 1, currency: { iso: "XOF" } },
      });
      expect(parsed.status).toBe("pending");
    });
  });

  describe("verifyWebhookSignature", () => {
    test("stub mode (pas de secret) accepte toujours", () => {
      expect(provider.verifyWebhookSignature({}, Buffer.from("{}"))).toBe(true);
    });

    test("avec secret : signature valide acceptée, invalide rejetée", () => {
      // Ré-instancie le provider avec un secret pour ce test
      jest.resetModules();
      process.env.FEDAPAY_WEBHOOK_SECRET = "whsec_test_123";
      const reg2 = require("../src/services/PaymentProviderRegistry");
      const p2 = reg2.get("fedapay");

      const body = Buffer.from(JSON.stringify({ name: "transaction.approved" }));
      const goodSig = crypto
        .createHmac("sha256", "whsec_test_123")
        .update(body)
        .digest("hex");

      expect(p2.verifyWebhookSignature({ "x-fedapay-signature": goodSig }, body)).toBe(true);
      expect(p2.verifyWebhookSignature({ "x-fedapay-signature": "deadbeef" }, body)).toBe(false);
      expect(p2.verifyWebhookSignature({}, body)).toBe(false);

      delete process.env.FEDAPAY_WEBHOOK_SECRET;
    });
  });
});
