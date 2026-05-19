import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Box, Typography, Chip, Button, Grid, Paper, Divider, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import PaymentDialog from "../../components/PaymentDialog";
import { Properties } from "../../lib/api";
import { formatFCFA, formatArea } from "../../lib/format";

const TX_LABEL = {
  sale:       { label: "Vente",            color: "#1565c0" },
  rent_long:  { label: "Location",         color: "#2e7d32" },
  rent_short: { label: "Courte durée",     color: "#6a1b9a" },
};

const PERIOD_LABEL = {
  monthly: "/ mois",
  weekly:  "/ semaine",
  nightly: "/ nuit",
};

export default function PropertyDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const [p, setP] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    Properties.get(id).then((d) => setP(d.property)).catch(() => setP(null));
  }, [id]);

  if (!p) return <Layout><Typography>Chargement…</Typography></Layout>;

  var isRent = p.transaction_type && p.transaction_type !== "sale";
  var txInfo = TX_LABEL[p.transaction_type] || TX_LABEL.sale;
  var deposit = Math.round((Number(p.price) * Number(p.deposit_pct)) / 100);
  var photos = p.photos && p.photos.length > 0 ? p.photos : null;
  var cover = photos ? photos[photoIdx].url : "https://picsum.photos/seed/" + p.id + "/1200/600";

  var priceLabel = isRent
    ? (PERIOD_LABEL[p.rent_period] || "/ mois")
    : null;

  return (
    <Layout title={p.title + " — ImmoBF"}>
      <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Chip label={t("types." + p.type)} color="primary" />
        <Chip
          label={txInfo.label}
          sx={{ bgcolor: txInfo.color, color: "white" }}
        />
        {p.is_furnished && <Chip label="Meublé" variant="outlined" />}
        {p.verified && <Chip label="Vérifié" color="success" />}
        <Chip label={p.city + ", " + p.country_code} />
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

            {!isRent && (
              <>
                <Typography variant="body2" color="text.secondary">
                  {t("property.deposit")} ({p.deposit_pct}%)
                </Typography>
                <Typography variant="h6">{formatFCFA(deposit, p.currency)}</Typography>
                <Button
                  fullWidth variant="contained" color="primary" size="large"
                  sx={{ mt: 2 }} onClick={function() { setPayOpen(true); }}
                >
                  {t("property.pay_deposit")}
                </Button>
              </>
            )}

            {isRent && (
              <Button
                fullWidth variant="contained" color="primary" size="large"
                sx={{ mt: 1 }}
                onClick={function() { setPayOpen(true); }}
              >
                Réserver
              </Button>
            )}

            <Button fullWidth variant="outlined" sx={{ mt: 1 }}>
              {t("property.contact_seller")}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      <PaymentDialog
        open={payOpen}
        onClose={function() { setPayOpen(false); }}
        property={p}
        amount={isRent ? p.price : deposit}
        purpose={isRent ? "reservation" : "deposit"}
      />
    </Layout>
  );
}
