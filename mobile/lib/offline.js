import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync ? SQLite.openDatabaseSync("immobf.db") : null;

export function init() {
  if (!db) return;
  db.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_properties (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `);
}

export async function cacheProperty(p) {
  if (!db) return;
  await db.runAsync(
    "INSERT OR REPLACE INTO cached_properties (id, payload, cached_at) VALUES (?, ?, ?)",
    [p.id, JSON.stringify(p), Date.now()]
  );
}

export async function listCached() {
  if (!db) return [];
  const rows = await db.getAllAsync("SELECT payload FROM cached_properties ORDER BY cached_at DESC LIMIT 100");
  return rows.map((r) => JSON.parse(r.payload));
}
