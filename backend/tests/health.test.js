"use strict";

process.env.JWT_SECRET = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost/test";

// On stub les modules DB/Redis pour pouvoir tester l'app sans infra.
jest.mock("../src/config/db", () => ({
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
  query: jest.fn().mockResolvedValue({ rows: [] }),
  withTransaction: jest.fn(async (fn) => fn({ query: jest.fn() })),
}));
jest.mock("../src/config/redis", () => ({
  getRedis: () => ({ get: jest.fn(), set: jest.fn(), del: jest.fn() }),
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

describe("404 handler", () => {
  test("renvoie une erreur structurée", async () => {
    const res = await request(app).get("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });
});
