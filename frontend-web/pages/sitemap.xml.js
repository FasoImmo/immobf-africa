/**
 * Sitemap dynamique — généré server-side à chaque requête (CDN cache 1h).
 * Inclut : pages statiques + toutes les annonces publiées (pagination auto)
 * + profils vendeurs uniques. Dégradation gracieuse si l'API est indisponible.
 */

const SITE_URL = "https://www.immoafrica.online";

const STATIC_PAGES = [
  { path: "/",               priority: "1.0", changefreq: "daily"   },
  { path: "/properties",     priority: "0.9", changefreq: "hourly"  },
  { path: "/plans",          priority: "0.7", changefreq: "weekly"  },
  { path: "/download",       priority: "0.6", changefreq: "monthly" },
  { path: "/legal/cgu",      priority: "0.3", changefreq: "yearly"  },
  { path: "/legal/privacy",  priority: "0.3", changefreq: "yearly"  },
  { path: "/legal/cookies",  priority: "0.3", changefreq: "yearly"  },
];

function esc(s) {
  return String(s || "").replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  }[c]));
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${esc(loc)}</loc>`,
    lastmod    ? `    <lastmod>${lastmod}</lastmod>` : "",
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : "",
    priority   ? `    <priority>${priority}</priority>` : "",
    "  </url>",
  ].filter(Boolean).join("\n");
}

/** Récupère toutes les annonces en paginant (limite API = 100/page). */
async function fetchAllProperties(apiBase) {
  const items = [];
  const LIMIT = 100;
  let page = 1;
  let total = Infinity;

  while (items.length < total && page <= 50) {            // garde-fou : max 5000 annonces
    const r = await fetch(
      `${apiBase}/api/v1/properties?limit=${LIMIT}&page=${page}`,
      { headers: { "User-Agent": "ImmoBF-Sitemap/1.0" }, signal: AbortSignal.timeout(6000) }
    );
    if (!r.ok) break;
    const d = await r.json();
    const batch = d.items || [];
    if (batch.length === 0) break;
    items.push(...batch);
    total = d.total ?? batch.length;
    if (batch.length < LIMIT) break;
    page++;
  }
  return items;
}

export async function getServerSideProps({ res }) {
  const today   = new Date().toISOString().slice(0, 10);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // ── Pages statiques ───────────────────────────────────────────────────────
  const entries = STATIC_PAGES.map((p) => urlEntry({
    loc: `${SITE_URL}${p.path}`,
    lastmod: today,
    changefreq: p.changefreq,
    priority: p.priority,
  }));

  // ── Annonces + vendeurs (best-effort) ─────────────────────────────────────
  try {
    const properties = await fetchAllProperties(apiBase);
    const sellersSeen = new Set();

    for (const p of properties) {
      if (!p?.id) continue;

      entries.push(urlEntry({
        loc: `${SITE_URL}/properties/${p.id}`,
        lastmod: p.published_at ? p.published_at.slice(0, 10) : today,
        changefreq: "weekly",
        priority: "0.8",
      }));

      if (p.owner_id && !sellersSeen.has(p.owner_id)) {
        sellersSeen.add(p.owner_id);
        entries.push(urlEntry({
          loc: `${SITE_URL}/sellers/${p.owner_id}`,
          lastmod: today,
          changefreq: "weekly",
          priority: "0.6",
        }));
      }
    }
  } catch (_) {
    // API indisponible → sitemap partiel avec les pages statiques seulement
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200");
  res.write(xml);
  res.end();

  return { props: {} };
}

export default function Sitemap() { return null; }
