// Service Worker — cache uniquement les assets statiques Next.js (même origine).
// Les appels API Railway sont laissés au navigateur sans interception.
const CACHE = "immobf-v3";
const PRECACHE = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ne jamais intercepter les requêtes cross-origin (API Railway, etc.)
  if (url.origin !== self.location.origin) return;

  // Ne pas intercepter les requêtes API (proxy Vercel /api/*)
  if (url.pathname.startsWith("/api/")) return;

  // Laisser passer toutes les autres requêtes sans modification
  // (Next.js gère son propre cache d'assets)
});
