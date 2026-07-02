"use strict";

process.env.JWT_SECRET = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";

// On stub les modules DB/Redis/argon2 pour pouvoir tester l'app sans infra native.
jest.mock("../src/config/db", () => ({
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
  query: jest.fn().mockResolvedValue({ rows: [] }),
  withTransaction: jest.fn(async (fn) => fn({ query: jest.fn() })),
}));
jest.mock("../src/config/redis", () => ({
  getRedis: () => ({ get: jest.fn(), set: jest.fn(), del: jest.fn() }),
}));
// argon2 est compilé en natif — le binaire Windows est invalide en CI Linux.
jest.mock("argon2", () => ({
  hash: jest.fn().mockResolvedValue("$argon2id$v=19$mock_hash"),
  verify: jest.fn().mockResolvedValue(true),
}));

const request = require("supertest");
const app = require("../src/server");

describe("GET /api/v1/health", () => {
  test("renvoie ok:true", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
