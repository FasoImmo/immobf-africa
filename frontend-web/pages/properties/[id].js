import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Box, Typography, Chip, Button, Grid, Paper, Divider, Stack, Alert, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import PaymentDialog from "../../components/PaymentDialog";
import PropertyCard from "../../components/PropertyCard";
import { Properties, Analytics } from "../../lib/api";
import { formatFCFA, formatArea } from "../../lib/format";

const TX_COLOR = {
  sale:       "#1565c0",
  rent_long:  "#2e7d32",
  rent_short: "#6a1b9a",
};

const PERIOD_KEY = {
  monthly: "property.period_monthly",
  weekly:  "property.period_weekly",
  nightly: "property.period_nightly",
};

export default function PropertyDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const [p, setP] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [similar, setSimilar] = useState([]);
  const [bookingUnits, setBookingUnits] = useState(1);
  const [checkIn, setCheckIn] = useState("");

  useEffect(() => {
    if (!id) return;
    Properties.get(id).then((d) => {
      setP(d.property);
      // Tracking vue + annonces similaires en parallèle
      Analytics.trackView(id, "view");
      Analytics.similar(id).then((r) => setSimilar(r.items || [])).catch(() => {});
      // Historique local des propriétés consultées
      try {
        const key = "immobf_recent";
        const recent = JSON.parse(localStorage.getItem(key) || "[]");
        const updated = [id, ...recent.filter((x) => x !== id)].slice(0, 10);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (_) {}
    }).catch(() => setP(null));
  }, [id]);

  if (!p) return <Layout><Typography>{t("property.loading")}</Typography></Layout>;

  var isRent = p.transaction_type && p.transaction_type !== "sale";
  var txColor = TX_COLOR[p.transaction_type] || TX_COLOR.sale;
  var txLabel = p.transaction_type === "sale" ? t("nav.publish_sale")
    : p.transaction_type === "rent_long" ? t("nav.publish_rent_long")
    : t("nav.publish_rent_short");
  var photos = p.photos && p.photos.length > 0 ? p.photos : null;
  var cover = photos ? photos[photoIdx].url : "https://picsum.photos/seed/" + p.id + "/1200/600";

  var priceLabel = isRent
    ? t(PERIOD_KEY[p.rent_period] || "property.period_monthly")
    : null;

  // Commission ImmoBF (5% par défaut) prélevée à la réservation, calculée
  // sur le montant TOTAL du séjour/loyer (prix unitaire × durée choisie),
  // pas seulement sur le prix unitaire. Le client paie le loyer/séjour
  // DIRECTEMENT au propriétaire en mobile money, seule cette commission
  // transite par la plateforme. Affichage uniquement — le montant exact est
  // recalculé et imposé côté serveur à partir des mêmes données.
  var units = Math.max(1, Number(bookingUnits) || 1);
  var totalBookingAmount = isRent ? p.price * units : 0;
  var commissionAmount = isRent ? Math.max(100, Math.round(totalBookingAmount * 0.05)) : 0;
  var unitLabel = p.rent_period === "monthly" ? t("property.unit_months")
    : p.rent_period === "weekly" ? t("property.unit_weeks")
    : t("property.unit_nights");

  return (
    <Layout title={p.title + " — ImmoBF"}>
      {router.query.published === "1" && (
        <Alert severity="success" sx={{ mb: 2 }}>{t("property.published_banner")}</Alert>
      )}
      <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Chip label={t("types." + p.type)} color="primary" />
        <Chip
          label={txLabel}
          sx={{ bgcolor: txColor, color: "white" }}
        />
        {p.is_furnished && <Chip label={t("property.furnished")} variant="outlined" />}
        {p.verified && <Chip label={t("property.verified")} color="success" />}
        <Chip label={(p.neighborhood ? p.neighborhood + ", " : "") + p.city + ", " + p.country_code} />
      </Box>

      <Typography variant="h4" gutterBottom>{p.title}</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <img
            src={cover}
            alt={p.title}
            style={{ width: "100%", borderRadius: 8, maxHeight: 420, objectFit: "cover" }}
          />

          {photos && photos.length > 1 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, overflowX: "auto", pb: 1 }}>
              {photos.map(function(ph, i) {
                return (
                  <Box
                    key={ph.id || i}
                    component="img"
                    src={ph.url}
                    onClick={function() { setPhotoIdx(i); }}
                    sx={{
                      width: 80, height: 60, objectFit: "cover", borderRadius: 1,
                      cursor: "pointer", flexShrink: 0,
                      border: i === photoIdx ? "2px solid #0E7C66" : "2px solid transparent",
                      opacity: i === photoIdx ? 1 : 0.7,
                      "&:hover": { opacity: 1 },
                    }}
                  />
                );
              })}
            </Stack>
          )}

          <Paper elevation={0} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6">Description</Typography>
            <Typography sx={{ whiteSpace: "pre-line" }}>{p.description}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography variant="h5" color="primary">
                {formatFCFA(p.price, p.currency)}
              </Typography>
              {priceLabel && (
                <Typography variant="body2" color="text.secondary">{priceLabel}</Typography>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary">
              {formatArea(p.area_m2)}
              {p.bedrooms  ? " · " + p.bedrooms  + " ch."  : ""}
              {p.bathrooms ? " · " + p.bathrooms + " sdb" : ""}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {isRent && (
              <>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <TextField
                    label={unitLabel} type="number" size="small"
                    inputProps={{ min: 1, max: 365 }}
                    value={bookingUnits}
                    onChange={(e) => setBookingUnits(e.target.value)}
                    sx={{ width: 110 }}
                  />
                  <TextField
                    label={t("property.check_in")} type="date" size="small"
                    InputLabelProps={{ shrink: true }}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {t("property.total_amount")} : <b>{formatFCFA(totalBookingAmount, p.currency)}</b>
                </Typography>
                <Button
                  fullWidth variant="contained" color="primary" size="large"
                  sx={{ mt: 1 }}
                  onClick={function() { setPayOpen(true); }}
                >
                  {t("property.reserve_btn")} — {formatFCFA(commissionAmount)}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                  {t("property.commission_notice")}
                </Typography>
              </>
            )}

            {p.owner_whatsapp && (
              <Button
                fullWidth variant="contained" size="large"
                sx={{ mt: 1, bgcolor: "#25D366", "&:hover": { bgcolor: "#1ebe5a" }, color: "white" }}
                onClick={() => Analytics.trackView(id, "whatsapp_click")}
                href={`https://wa.me/${p.owner_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `Bonjour, je suis intéressé(e) par votre annonce "${p.title}" sur ImmoBF Africa.`
                )}`}
                target="_blank" rel="noopener noreferrer"
                component="a"
              >
                💬 {t("property.contact_whatsapp")}
              </Button>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ─── Annonces similaires ─────────────────────────────────────────── */}
      {similar.length > 0 && (
        <Box sx={{ mt: 5 }}>
          <Typography variant="h5" gutterBottom>Annonces similaires</Typography>
          <Grid container spacing={2}>
            {similar.map((s) => (
              <Grid item xs={12} sm={6} md={3} key={s.id}>
                <PropertyCard property={s} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {isRent && (
        <PaymentDialog
          open={payOpen}
          onClose={function() { setPayOpen(false); }}
          property={p}
          amount={commissionAmount}
          purpose="commission"
          bookingUnits={units}
          checkIn={checkIn}
        />
      )}
    </Layout>
  );
}
