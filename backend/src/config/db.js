"use strict";

const { Pool } = require("pg");
const config = require("./index");

const pool = new Pool({
  connectionString: config.db.url,
  max: 10,
  // Garder les connexions ouvertes au moins 10 min — les crons les plus longs
  // tournent toutes les 5 min (réconciliation). Si idleTimeout < intervalle du
  // cron, chaque exécution doit ré-établir une connexion SSL (~1s sur Railway),
  // ce qui génère de faux "Slow query" (~1s) alors que la requête elle-même
  // est instantanée. 10 min couvre tous les crons sans monopoliser le pool.
  idleTimeoutMillis: 600_000,
  // Envoie des paquets TCP keepalive pour maintenir la connexion SSL active
  // même si Railway ou le load-balancer interrompt les connexions silencieuses.
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
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
