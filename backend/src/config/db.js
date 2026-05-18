"use strict";

const { Pool } = require("pg");
const config = require("./index");

const pool = new Pool({
  connectionString: config.db.url,
  max: 10,
  idleTimeoutMillis: 30_000,
  // Railway PostgreSQL requires SSL in production
  ...(process.env.NODE_ENV === "production" && {
    ssl: { rejectUnauthorized: false },
  }),
});

pool.on("error", (err) => {
  console.error("Unexpected PG pool error", err);
});

/**
 * Run a parameterized query. Returns { rows }.
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const ms = Date.now() - start;
    if (ms > 500) console.warn(`Slow query (${ms}ms): ${text}`);
    return res;
  } catch (err) {
    console.error("Query error", err.message, text);
    throw err;
  }
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
