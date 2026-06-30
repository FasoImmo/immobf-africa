// Sitemap XML généré dynamiquement (pages router : pas de fichier statique possible
// pour le contenu variable). Inclut les pages statiques + les annonces publiées
// récupérées depuis l'API backend. Si l'API échoue ou ne renvoie rien (catalogue
// vide), le sitemap reste valide avec uniquement les pages statiques —
// dégradation gracieuse plutôt qu'un sitemap.xml vide ou en erreur.

const SITE_URL = "https://www.immoafrica.online";

const STATIC_PATHS = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/properties", priority: "0.9", changefreq: "daily" },
  { path: "/sell", priority: "0.7", changefreq: "weekly" },
  { path: "/legal/cgu", priority: "0.3", changefreq: "monthly" },
  { path: "/legal/privacy", priority: "0.3", changefreq: "monthly" },
  { path: "/legal/cookies", priority: "0.3", changefreq: "monthly" },
];

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  }[c]));
}

function buildXml(urls) {
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  const urls = STATIC_PATHS.map((p) => ({
    loc: `${SITE_URL}${p.path}`,
    priority: p.priority,
    changefreq: p.changefreq,
  }));

  // Ajout des annonces publiées — best effort, ne doit jamais faire échouer le sitemap.
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    // L'API plafonne `limit` à 100 (validation Joi) — au-delà, paginer serait nécessaire.
    const r = await fetch(`${apiBase}/api/v1/properties?limit=100`, { signal: controller.signal });
    clearTimeout(timeout);
    if (r.ok) {
      const data = await r.json();
      const items = Array.isArray(data) ? data : data.items || data.results || [];
      for (const item of items) {
        if (item?.id) {
          urls.push({
            loc: `${SITE_URL}/properties/${item.id}`,
            priority: "0.8",
            changefreq: "weekly",
          });
        }
      }
    }
  } catch (_e) {
    // API indisponible ou catalogue vide → sitemap réduit aux pages statiques, pas d'erreur 500.
  }

  res.setHeader("Content-Type", "application/xml");
  res.write(buildXml(urls));
  res.end();

  return { props: {} };
}

export default function Sitemap() {
  return null;
}
