import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Box, Typography, Grid, Card, CardContent, CardMedia, CardActions,
  Button, Chip, Alert, CircularProgress, Divider, Paper, Stack, TextField,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { Analytics, Auth } from "../lib/api";
import api from "../lib/api";
import { formatFCFA } from "../lib/format";

const EUR_RATE = 655.957;
const USD_RATE = 600;
const LISTING_FEE = 2000;

function SubscriptionBadge({ status, daysRemaining, t }) {
  if (status === "active") {
    return (
      <Chip size="small" color="success"
        label={`${t("account.status_active")} — ${daysRemaining} ${t("account.days_left")}`}
      />
    );
  }
  if (status === "expiring_soon") {
    return (
      <Chip size="small" color="warning"
        label={`${t("account.status_expiring")} ${daysRemaining} ${t("account.days_left")}`}
      />
    );
  }
  if (status === "expired") {
    return <Chip size="small" color="error" label={t("account.status_expired")} />;
  }
  return <Chip size="small" color="default" label={t("account.status_none")} />;
}

export default function AccountPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailEditing, setEmailEditing] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);

  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("immobf_user");
    const token = localStorage.getItem("immobf_token");
    if (!stored || !token) { router.replace("/login?redirect=/account"); return; }
    setUser(JSON.parse(stored));

    if (router.query.draft_saved) setDraftSaved(true);

    Analytics.myStats()
      .then((r) => setListings(r.listings || []))
      .catch(() => setErr("Impossible de charger vos annonces."))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  function renew(propertyId) {
    router.push(`/sell?renew=${propertyId}`);
  }

  function editListing(propertyId) {
    router.push(`/properties/${propertyId}/edit`);
  }

  function resumeDraft(propertyId) {
    router.push(`/sell?resume=${propertyId}`);
  }

  async function saveEmail() {
    if (!emailInput || !emailInput.includes("@")) {
      setEmailMsg({ type: "error", text: t("account.email_invalid") });
      return;
    }
    setEmailSaving(true);
    setEmailMsg(null);
    try {
      const { user: updated } = await Auth.updateEmail(emailInput);
      setUser(updated);
      localStorage.setItem("immobf_user", JSON.stringify(updated));
      setEmailEditing(false);
      setEmailMsg({ type: "success", text: t("account.email_updated") });
    } catch (e) {
      const status = e?.response?.status;
      setEmailMsg({
        type: "error",
        text: status === 409 ? t("account.email_taken") : t("account.email_save_error"),
      });
    } finally {
      setEmailSaving(false);
    }
  }

  const drafts = listings.filter((l) => l.status === "draft");
  const published = listings.filter((l) => l.status !== "draft");

  const stats = {
    total: published.length,
    active: published.filter((l) => l.subscription_status === "active").length,
    expiring: published.filter((l) => l.subscription_status === "expiring_soon").length,
    expired: published.filter((l) => l.subscription_status === "expired").length,
  };

  return (
    <Layout title={`${t("account.title")} — ImmoBF Africa`}>
      <Typography variant="h4" gutterBottom>{t("account.title")}</Typography>

      {draftSaved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setDraftSaved(false)}>
          {t("account.draft_saved")}
        </Alert>
      )}

      {user && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: "#f5f5f5", borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>{user.full_name || user.phone}</Typography>
          <Typography variant="body2" color="text.secondary">{user.phone}</Typography>

          {!emailEditing && (
            <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="body2" color={user.email ? "text.secondary" : "warning.main"}>
                {user.email || t("account.email_missing")}
              </Typography>
              <Button
                size="small"
                onClick={() => { setEmailInput(user.email || ""); setEmailEditing(true); setEmailMsg(null); }}
              >
                {user.email ? t("account.email_edit_btn") : t("account.email_add_btn")}
              </Button>
            </Box>
          )}

          {emailEditing && (
            <Box sx={{ mt: 1.5, display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <TextField
                size="small" type="email" label={t("auth.email")}
                value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                sx={{ bgcolor: "white", minWidth: 240 }}
              />
              <Button size="small" variant="contained" disabled={emailSaving} onClick={saveEmail}>
                {t("account.email_save_btn")}
              </Button>
              <Button size="small" onClick={() => { setEmailEditing(false); setEmailMsg(null); }}>
                {t("sell.back_btn")}
              </Button>
            </Box>
          )}

          {emailMsg && (
            <Alert severity={emailMsg.type} sx={{ mt: 1 }}>{emailMsg.text}</Alert>
          )}
        </Paper>
      )}

      {/* Résumé abonnements */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: t("account.total"), value: stats.total, color: "primary.main" },
          { label: t("account.active"), value: stats.active, color: "success.main" },
          { label: t("account.expiring"), value: stats.expiring, color: "warning.main" },
          { label: t("account.expired"), value: stats.expired, color: "error.main" },
        ].map((s) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Paper elevation={1} sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4" color={s.color}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">{t("account.my_listings")}</Typography>
        <Button variant="contained" component={Link} href="/sell">
          {t("account.new_listing")}
        </Button>
      </Box>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && listings.length === 0 && (
        <Alert severity="info">
          {t("account.no_listings")}{" "}
          <Link href="/sell" style={{ color: "#0E7C66" }}>{t("account.post_first")}</Link>.
        </Alert>
      )}

      {/* ─── Brouillons ────────────────────────────────────────────────────── */}
      {!loading && drafts.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            📝 {t("account.drafts")} ({drafts.length})
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {drafts.map((p) => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <Card elevation={1} sx={{ border: "1px dashed #ccc" }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Chip label={t("account.draft_badge")} size="small" color="default" sx={{ mb: 1 }} />
                    <Typography variant="subtitle2" noWrap>{p.title || t("account.untitled")}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {p.city} {p.price ? `· ${formatFCFA(p.price, p.currency)}` : ""}
                    </Typography>
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ gap: 1, px: 2 }}>
                    <Button size="small" variant="outlined" onClick={() => resumeDraft(p.id)}>
                      {t("account.draft_resume")}
                    </Button>
                    <Button size="small" onClick={() => editListing(p.id)}>
                      {t("account.edit")}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Divider sx={{ mb: 3 }} />
        </>
      )}

      {/* ─── Annonces publiées ──────────────────────────────────────────────── */}
      <Grid container spacing={2}>
        {published.map((p) => {
          const cover = p.photos?.[0]?.url || `https://picsum.photos/seed/${p.id}/400/250`;
          const isExpiringSoon = p.subscription_status === "expiring_soon";
          const isExpired = p.subscription_status === "expired";

          return (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <Card elevation={2} sx={{ opacity: isExpired ? 0.7 : 1 }}>
                <CardMedia component="img" height="140" image={cover} alt={p.title} />
                <CardContent sx={{ pb: 1 }}>
                  <Typography variant="subtitle2" noWrap>{p.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {p.city} · {formatFCFA(p.price, p.currency)}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
                    <SubscriptionBadge
                      status={p.subscription_status}
                      daysRemaining={p.days_remaining}
                      t={t}
                    />
                  </Box>
                  <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      👁 {p.total_views || 0} {t("account.total_views")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      👤 {p.unique_visitors || 0} {t("account.unique_visitors")}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      💬 {p.whatsapp_clicks || 0} {t("account.whatsapp_clicks")}
                    </Typography>
                  </Box>
                  {Number(p.views_7d) > 0 && (
                    <Typography variant="caption" color="primary.main">
                      +{p.views_7d} {t("account.views_week")}
                    </Typography>
                  )}
                  {p.listing_expires_at && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      {t("account.expires_on")} {new Date(p.listing_expires_at).toLocaleDateString()}
                    </Typography>
                  )}
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: "space-between", px: 2, flexWrap: "wrap", gap: 1 }}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button size="small" component={Link} href={`/properties/${p.id}`}>
                      {t("account.view")}
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => editListing(p.id)}>
                      ✏️ {t("account.edit")}
                    </Button>
                  </Box>
                  {(isExpiringSoon || isExpired) && (
                    <Button
                      size="small" variant="contained" color="warning"
                      onClick={() => renew(p.id)}
                    >
                      {t("account.renew")} — {LISTING_FEE.toLocaleString("fr-FR")} FCFA
                      <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.8 }}>
                        (≈ {(LISTING_FEE / EUR_RATE).toFixed(2)}€)
                      </Typography>
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Layout>
  );
}
