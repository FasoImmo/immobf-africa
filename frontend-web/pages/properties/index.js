import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import {
  Grid, TextField, MenuItem, Typography, Box, Button,
  ToggleButton, ToggleButtonGroup,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert as MuiAlert,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import PropertyCard from "../../components/PropertyCard";
import { Properties, Analytics } from "../../lib/api";
import { AFRICAN_COUNTRIES } from "../../lib/africanCountries";

// MapView chargé côté client uniquement (Leaflet ne supporte pas SSR)
const MapView = dynamic(() => import("../../components/MapView"), { ssr: false });

export default function BrowsePage() {
  const router = useRouter();
  const { t } = useTranslation();

  const TX_OPTIONS = [
    { value: "",           label: t("browse.all") },
    { value: "sale",       label: t("nav.publish_sale") },
    { value: "rent_long",  label: t("nav.publish_rent_long") },
    { value: "rent_short", label: t("nav.publish_rent_short") },
  ];

  const TX_TITLES = {
    "":           t("browse.title_all"),
    "sale":       t("browse.title_sale"),
    "rent_long":  t("browse.title_rent_long"),
    "rent_short": t("browse.title_rent_short"),
  };

  const [filters, setFilters] = useState({
    q: "", country: "", city: "", type: "", transaction_type: "", min_price: "", max_price: "",
  });
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady]     = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" | "map"
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertStatus, setAlertStatus] = useState(null); // null | "success" | "error"
  const [alertLoading, setAlertLoading] = useState(false);

  // Utilise window.location.search (toujours à jour) + router.asPath comme
  // dépendance pour relancer la recherche à chaque changement d'URL.
  useEffect(() => {
    if (!router.isReady) return;
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    const f = {
      q:                params.get("q")                 || "",
      country:          params.get("country")           || "",
      city:             params.get("city")              || "",
      type:             params.get("type")              || "",
      transaction_type: params.get("transaction_type")  || "",
      min_price:        params.get("min_price")         || "",
      max_price:        params.get("max_price")         || "",
    };
    setFilters(f);
    setReady(true);
    runSearch(f);
  }, [router.isReady, router.asPath]); // eslint-disable-line

  async function runSearch(f) {
    const current = f || filters;
    setLoading(true);
    const params = {};
    Object.entries(current).forEach(([k, v]) => { if (v) params[k] = v; });
    try {
      const d = await Properties.search(params);
      setItems(d.items || []);
      // Tracker la recherche pour personnalisation
      Analytics.trackSearch(params, (d.items || []).length);
    } finally { setLoading(false); }
  }

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const pageTitle = TX_TITLES[filters.transaction_type] || t("browse.title_all");

  async function handleSaveAlert() {
    if (!alertEmail || !alertEmail.includes("@")) return;
    setAlertLoading(true);
    setAlertStatus(null);
    try {
      const res = await fetch("/api/v1/searches/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: alertEmail, filters }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setAlertStatus("success");
    } catch (_) {
      setAlertStatus("error");
    } finally {
      setAlertLoading(false);
    }
  }

  // Nombre d'annonces géolocalisées (pour afficher l'info dans le toggle)
  const geoCount = items.filter((p) => p.location?.lat && p.location?.lng).length;

  return (
    <Layout title={pageTitle + " — ImmoBF"}>
      {router.query.unsubscribed === "1" && (
        <MuiAlert severity="info" sx={{ mb: 2 }}>
          Vous avez été désabonné des alertes pour ces critères.
        </MuiAlert>
      )}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
        <Typography variant="h4">{pageTitle}</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button
            size="small" variant="outlined" color="primary"
            onClick={() => { setAlertOpen(true); setAlertStatus(null); }}
          >
            🔔 Être alerté
          </Button>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => { if (v) setViewMode(v); }}
            size="small"
          >
            <ToggleButton value="list" aria-label="Vue liste">
              📋 Liste
            </ToggleButton>
            <ToggleButton value="map" aria-label="Vue carte">
              🗺️ Carte{geoCount > 0 ? ` (${geoCount})` : ""}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <TextField label={t("search.placeholder") || "Mot-clé"} size="small"
          value={filters.q} onChange={set("q")}
          sx={{ flex: "1 1 200px" }}
          placeholder="villa, bureau, Bobo…"
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
        />
        <TextField select label={t("search.country") || "Pays"} size="small" value={filters.country}
          onChange={set("country")} sx={{ minWidth: 190 }}>
          <MenuItem value="">{t("search.all_countries") || "Tous les pays"}</MenuItem>
          {AFRICAN_COUNTRIES.map((c) => (
            <MenuItem key={c.code} value={c.code}>{c.flag} {c.name}</MenuItem>
          ))}
        </TextField>
        <TextField label={t("search.city") || "Ville"} size="small" value={filters.city} onChange={set("city")} />
        <TextField select label="Transaction" size="small" value={filters.transaction_type}
          onChange={set("transaction_type")} sx={{ minWidth: 210 }}>
          {TX_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </TextField>
        <TextField select label={t("search.type")} size="small" value={filters.type}
          onChange={set("type")} sx={{ minWidth: 160 }}>
          <MenuItem value="">—</MenuItem>
          {["land","house","apartment","office","commercial"].map((v) => (
            <MenuItem key={v} value={v}>{t(`types.${v}`)}</MenuItem>
          ))}
        </TextField>
        <TextField label={t("search.price_min")} type="number" size="small"
          value={filters.min_price} onChange={set("min_price")} />
        <TextField label={t("search.price_max")} type="number" size="small"
          value={filters.max_price} onChange={set("max_price")} />
        <Button variant="contained" onClick={() => runSearch()}>{t("search.filters")}</Button>
      </Box>

      {/* ─── Vue carte ──────────────────────────────────────────────────────── */}
      {viewMode === "map" && (
        <Box sx={{ height: 520, width: "100%", mb: 3, borderRadius: 2, overflow: "hidden", border: "1px solid #e0e0e0" }}>
          <MapView
            properties={items}
            onSelect={(p) => router.push(`/properties/${p.id}`)}
          />
        </Box>
      )}

      {/* ─── Vue liste ──────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <Grid container spacing={2}>
          {items.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <PropertyCard property={p} />
            </Grid>
          ))}
          {!loading && ready && items.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary">{t("search.no_results") || "Aucun résultat pour ces filtres."}</Typography>
            </Grid>
          )}
        </Grid>
      )}
      {/* ─── Dialog alerte email ─────────────────────────────────────────── */}
      <Dialog open={alertOpen} onClose={() => setAlertOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>🔔 Recevoir des alertes</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Entrez votre email pour être notifié dès qu&apos;une nouvelle annonce
            correspond à vos critères actuels.
          </Typography>
          <TextField
            label="Votre email" type="email" fullWidth size="small"
            value={alertEmail}
            onChange={(e) => setAlertEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveAlert()}
            disabled={alertStatus === "success"}
          />
          {alertStatus === "success" && (
            <MuiAlert severity="success" sx={{ mt: 2 }}>
              ✅ Inscription enregistrée ! Vous recevrez un email dès qu'une annonce correspond.
            </MuiAlert>
          )}
          {alertStatus === "error" && (
            <MuiAlert severity="error" sx={{ mt: 2 }}>
              ❌ Une erreur est survenue, veuillez réessayer.
            </MuiAlert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertOpen(false)}>Fermer</Button>
          {alertStatus !== "success" && (
            <Button
              variant="contained"
              onClick={handleSaveAlert}
              disabled={alertLoading || !alertEmail.includes("@")}
            >
              {alertLoading ? "…" : "M'alerter"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
