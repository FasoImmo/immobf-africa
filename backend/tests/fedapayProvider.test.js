"use strict";

// Mode stub : pas de FEDAPAY_SECRET_KEY -> initiate ne fait pas d appel HTTP
process.env.JWT_SECRET = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";
delete process.env.FEDAPAY_SECRET_KEY;
delete process.env.FEDAPAY_WEBHOOK_SECRET;

const crypto = require("crypto");

describe("FedaPayProvider", () => {
  let registry;
  let provider;

  beforeAll(() => {
    jest.resetModules();
    registry = require("../src/services/PaymentProviderRegistry");
    provider = registry.get("fedapay");
  });

  test("est enregistre comme provider", () => {
    expect(registry.all()).toContain("fedapay");
  });

  test("couvre UEMOA hors BF (BF retire temporairement — ticket support #38974)", () => {
    // BF retire le 28/06/2026 : Orange/Moov BF absents du compte Live FedaPay.
    // Reactiver quand le ticket support confirme la disponibilite.
    expect(provider.countries).toEqual(
      expect.arrayContaining(["BJ", "CI", "SN", "TG", "NE", "ML", "GN"])
    );
    // BF n est pas dans la liste tant que le ticket n est pas resolu
    expect(provider.countries).not.toContain("BF");
  });

  test("supporte XOF et GNF", () => {
    expect(provider.currencies).toEqual(expect.arrayContaining(["XOF", "GNF"]));
  });

  describe("initiate (mode stub)", () => {
    // En stub, FedaPayProvider auto-valide sans appel HTTP reel.
    test("retourne external_id auto-valide sans cle", async () => {
      const r = await provider.initiate({
        amount: 4250000,
        currency: "XOF",
        reference: "IMO-TEST-1",
        customerPhone: "+22670000001",
        customerEmail: "buyer@example.com",
        customerName: "Jean Ouedraogo",
        preferredOperator: "orange",
      });
      expect(r.status).toBe("succeeded");
      expect(r.external_id).toMatch(/fp_stub_IMO-TEST-1/);
      expect(r.payment_url).toBeNull();
      expect(r.ussd_code).toBeNull();
      expect(r.raw.stub).toBe(true);
    });

    test("external_id contient la reference", async () => {
      const r = await provider.initiate({
        amount: 1000, currency: "XOF", reference: "IMO-TEST-2",
        customerPhone: "+22670000002",
      });
      expect(r.external_id).toContain("IMO-TEST-2");
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

    test("avec secret : signature valide acceptee, invalide rejetee", () => {
      jest.resetModules();
      process.env.FEDAPAY_WEBHOOK_SECRET = "whsec_test_123";
      const reg2 = require("../src/services/PaymentProviderRegistry");
      const p2 = reg2.get("fedapay");

      // FedaPay utilise le format Stripe-like : t=<timestamp>,s=<hmac>
      // Le payload signe est "${timestamp}.${body}"
      const body = Buffer.from(JSON.stringify({ name: "transaction.approved" }));
      const ts = "1700000000";
      const signedPayload = ts + "." + body.toString("utf8");
      const goodSig = crypto
        .createHmac("sha256", "whsec_test_123")
        .update(signedPayload, "utf8")
        .digest("hex");
      const header = "t=" + ts + ",s=" + goodSig;

      expect(p2.verifyWebhookSignature({ "x-fedapay-signature": header }, body)).toBe(true);
      expect(p2.verifyWebhookSignature({ "x-fedapay-signature": "t=" + ts + ",s=deadbeef" }, body)).toBe(false);
      expect(p2.verifyWebhookSignature({}, body)).toBe(false);

      delete process.env.FEDAPAY_WEBHOOK_SECRET;
    });
  });
});
