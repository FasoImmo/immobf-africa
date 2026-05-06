import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Box, Typography, Chip, Button, Grid, Paper, Divider } from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import PaymentDialog from "../../components/PaymentDialog";
import { Properties } from "../../lib/api";
import { formatFCFA, formatArea } from "../../lib/format";

export default function PropertyDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;
  const [p, setP] = useState(null);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    Properties.get(id).then((d) => setP(d.property)).catch(() => setP(null));
  }, [id]);

  if (!p) return <Layout><Typography>Chargement…</Typography></Layout>;

  const deposit = Math.round((Number(p.price) * Number(p.deposit_pct)) / 100);
  const cover = p.photos?.[0]?.url || `https://picsum.photos/seed/${p.id}/1200/600`;

  return (
    <Layout title={`${p.title} — ImmoBF`}>
      <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
        <Chip label={t(`types.${p.type}`)} color="primary" />
        {p.verified && <Chip label="Vérifié" color="success" />}
        <Chip label={`${p.city}, ${p.country_code}`} />
      </Box>

      <Typography variant="h4" gutterBottom>{p.title}</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <img src={cover} alt={p.title} style={{ width: "100%", borderRadius: 8 }} />
          <Paper elevation={0} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6">Description</Typography>
            <Typography sx={{ whiteSpace: "pre-line" }}>{p.description}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h5" color="primary">{formatFCFA(p.price, p.currency)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatArea(p.area_m2)}
              {p.bedrooms ? ` · ${p.bedrooms} ch.` : ""}
              {p.bathrooms ? ` · ${p.bathrooms} sdb` : ""}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {t("property.deposit")} ({p.deposit_pct}%)
            </Typography>
            <Typography variant="h6">{formatFCFA(deposit, p.currency)}</Typography>
            <Button
              fullWidth variant="contained" color="primary" size="large"
              sx={{ mt: 2 }} onClick={() => setPayOpen(true)}
            >
              {t("property.pay_deposit")}
            </Button>
            <Button fullWidth variant="outlined" sx={{ mt: 1 }}>
              {t("property.contact_seller")}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      <PaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        property={p}
        amount={deposit}
        purpose="deposit"
      />
    </Layout>
  );
}
