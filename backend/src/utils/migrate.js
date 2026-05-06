"use strict";

const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function up() {
  await ensureTable();
  const dir = path.join(__dirname, "..", "..", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const { rows } = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [f]
    );
    if (rows.length) {
      console.log(`- skip ${f}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    console.log(`> applying ${f}`);
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations(name) VALUES($1)", [f]);
      await pool.query("COMMIT");
    } catch (e) {
      await pool.query("ROLLBACK");
      console.error(`Migration ${f} failed`, e);
      process.exit(1);
    }
  }
  console.log("All migrations applied.");
  await pool.end();
}

async function down() {
  console.warn("down() non supporté pour les migrations SQL plates — à gérer manuellement.");
  await pool.end();
}

if (process.argv[2] === "up") {
  up();
} else if (process.argv[2] === "down") {
  down();
} else {
  console.log("Usage: node src/utils/migrate.js up|down");
  process.exit(1);
}
