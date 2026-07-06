import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Box, Typography, Chip, Button, Grid, Paper, Divider, Stack, Alert, TextField, Tooltip, Rating, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import PaymentDialog from "../../components/PaymentDialog";
import PropertyCard from "../../components/PropertyCard";
import BookingCalendar from "../../components/BookingCalendar";
import { Properties, Analytics, Messages, Reviews } from "../../lib/api";
import { formatFCFA, formatArea } from "../../lib/format";

const MapView = dynamic(() => import("../../components/MapView"), { ssr: false });

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
  const [commissionPaid, setCommissionPaid] = useState(false);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [copied, setCopied] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  // ─── Avis / notation ──────────────────────────────────────────────────────
  const [myReview, setMyReview]         = useState(null);   // avis existant
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewDone, setReviewDone]     = useState(false);
  const meId = (() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem("immobf_user") || "{}")?.id; } catch { return null; }
  })();

  async function handleContact() {
    const token = typeof window !== "undefined" ? localStorage.getItem("immobf_token") : null;
    if (!token) { router.push("/login"); return; }
    setContactLoading(true);
    try {
      const { conversation } = await Messages.start(id);
      router.push(`/messages/${conversation.id}`);
    } catch (_) {
      router.push("/messages");
    } finally {
      setContactLoading(false);
    }
  }

  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = p?.title || "Annonce ImmoBF Africa";
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch (_) {}
    }
    // Fallback : copier dans le presse-papiers
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {}
  }, [p]);

  // Charge l'état "commission payée" et les dates réservées depuis localStorage + API
  useEffect(() => {
    if (!id) return;
    try { setCommissionPaid(localStorage.getItem(`commission_paid_${id}`) === "1"); } catch {}
    Properties.availability(id).then((d) => setBookedRanges([...(d.booked || []), ...(d.blocked || [])])).catch(() => {});
  }, [id]);

  function handleCommissionPaid() {
    setCommissionPaid(true);
    try { localStorage.setItem(`commission_paid_${id}`, "1"); } catch {}
    setPayOpen(false);
  }

  useEffect(() => {
    if (!id) return;
    Properties.get(id).then((d) => {
      setP(d.property);
      // Tracking vue + annonces similaires en parallèle
      Analytics.trackView(id, "view");
      Analytics.similar(id).then((r) => setSimilar(r.items || [])).catch(() => {});
      // Charger l'avis existant si connecté
      if (meId) {
        Reviews.myReview(id).then((r) => {
          if (r.review) {
            setMyReview(r.review);
            setReviewRating(r.review.rating);
            setReviewComment(r.review.comment || "");
            setReviewDone(true);
          }
        }).catch(() => {});
      }
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

  // Détecte si les dates choisies chevauchent une réservation existante
  function hasConflict() {
    if (!checkIn || !bookedRanges.length) return false;
    const start = new Date(checkIn);
    const end   = new Date(start);
    end.setDate(end.getDate() + units);
    return bookedRanges.some((b) => {
      const bStart = new Date(b.check_in);
      const bEnd   = new Date(b.check_out);
      return start < bEnd && end > bStart;
    });
  }
  var conflict = isRent && p.transaction_type === "rent_short" ? hasConflict() : false;

  // ─── Données structurées JSON-LD (schema.org) ────────────────────────────
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": p.title,
    "description": p.description,
    "url": `https://www.immoafrica.online/properties/${p.id}`,
    "image": p.photos?.[0]?.url || `https://picsum.photos/seed/${p.id}/1200/600`,
    "offers": {
      "@type": "Offer",
      "price": p.price,
      "priceCurrency": p.currency || "XOF",
      "availability": "https://schema.org/InStock",
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": p.city,
      "addressCountry": p.country_code,
      ...(p.neighborhood ? { "streetAddress": p.neighborhood } : {}),
    },
    ...(p.location?.lat && p.location?.lng ? {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": p.location.lat,
        "longitude": p.location.lng,
      },
    } : {}),
    ...(p.area_m2 ? { "floorSize": { "@type": "QuantitativeValue", "value": p.area_m2, "unitCode": "MTK" } } : {}),
    ...(p.bedrooms ? { "numberOfRooms": p.bedrooms } : {}),
  };

  return (
    <Layout title={p.title + " — ImmoBF"}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
        <Typography variant="h4">{p.title}</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {/* WhatsApp */}
          <Button
            size="small" variant="outlined"
            sx={{ color: "#25D366", borderColor: "#25D366", "&:hover": { borderColor: "#1ebe5a", bgcolor: "#f0fdf4" } }}
            component="a"
            href={`https://wa.me/?text=${encodeURIComponent(p.title + "\n" + (typeof window !== "undefined" ? window.location.href : ""))}`}
            target="_blank" rel="noopener noreferrer"
          >
            💬 WhatsApp
          </Button>
          {/* Copier / Share natif */}
          <Tooltip title={copied ? "Lien copié ✓" : "Partager"} placement="top">
            <Button size="small" variant="outlined" onClick={handleShare}>
              {copied ? "✓ Copié" : "🔗 Partager"}
            </Button>
          </Tooltip>
        </Box>
      </Box>

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

          {p.location?.lat && p.location?.lng && (
            <Paper elevation={0} sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>📍 Localisation</Typography>
              <Box sx={{ height: 280, borderRadius: 2, overflow: "hidden", border: "1px solid #e0e0e0" }}>
                <MapView properties={[p]} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Coordonnées approximatives — confirmez l'adresse exacte avec l'annonceur.
              </Typography>
            </Paper>
          )}
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

            {p.owner_id && (
              <Box sx={{ mt: 1 }}>
                <Link
                  href={`/sellers/${p.owner_id}`}
                  style={{ fontSize: "0.85rem", color: "inherit", textDecoration: "underline", opacity: 0.7 }}
                >
                  👤 {p.owner_name || "Voir le profil de l'annonceur"}
                </Link>
              </Box>
            )}

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
                </Box>
                <Typography variant="body2" sx={{ mt: 1.5, mb: 0.5 }}>
                  {t("property.check_in")}
                </Typography>
                {/* Calendrier avec coloration des dates déjà réservées/bloquées
                    (remplace l'ancien input type="date" natif, qui ne permet
                    aucune personnalisation visuelle par jour) */}
                <BookingCalendar
                  value={checkIn}
                  onChange={setCheckIn}
                  bookedRanges={bookedRanges}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {t("property.total_amount")} : <b>{formatFCFA(totalBookingAmount, p.currency)}</b>
                </Typography>
                {conflict && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    ⛔ {t("property.dates_conflict")}
                  </Alert>
                )}
                <Button
                  fullWidth variant="contained" color="primary" size="large"
                  sx={{ mt: 1 }}
                  disabled={conflict}
                  onClick={function() { setPayOpen(true); }}
                >
                  {t("property.reserve_btn")} — {formatFCFA(commissionAmount)}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                  {t("property.commission_notice")}
                </Typography>
              </>
            )}

            {p.owner_whatsapp && (!isRent || commissionPaid) && (
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
            {p.owner_whatsapp && isRent && !commissionPaid && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
                🔒 {t("property.whatsapp_locked")}
              </Typography>
            )}

            {/* Bouton messagerie interne */}
            <Button
              fullWidth variant="outlined" size="large"
              sx={{ mt: 1 }}
              onClick={handleContact}
              disabled={contactLoading}
            >
              💬 {contactLoading ? "…" : "Envoyer un message"}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* ─── Notation / avis ─────────────────────────────────────────────── */}
      {(() => {
        const isOwner  = meId && p && meId === p.owner_id;
        const loggedIn = Boolean(meId);

        if (!loggedIn || isOwner) return null;

        async function handleReviewSubmit(e) {
          e.preventDefault();
          if (!reviewRating) return;
          setReviewSaving(true);
          try {
            const { review } = await Reviews.submit(id, { rating: reviewRating, comment: reviewComment || null });
            setMyReview(review);
            setReviewDone(true);
          } catch (_) {}
          finally { setReviewSaving(false); }
        }

        return (
          <Box sx={{ mt: 5 }}>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="h5" gutterBottom>⭐ Votre avis</Typography>
            {reviewDone ? (
              <Alert severity="success" sx={{ maxWidth: 560 }}>
                Merci ! Votre note ({reviewRating}/5) a été enregistrée.{" "}
                <Button size="small" onClick={() => setReviewDone(false)}>Modifier</Button>
              </Alert>
            ) : (
              <Paper elevation={0} sx={{ p: 3, maxWidth: 560, border: "1px solid #e0e0e0", borderRadius: 3 }}
                component="form" onSubmit={handleReviewSubmit}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Notez cet annonceur pour cette annonce
                </Typography>
                <Rating
                  value={reviewRating}
                  onChange={(_, v) => setReviewRating(v || 0)}
                  size="large"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth multiline rows={3} size="small"
                  label="Commentaire (facultatif)"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  inputProps={{ maxLength: 1000 }}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit" variant="contained"
                  disabled={!reviewRating || reviewSaving}
                  startIcon={reviewSaving ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {myReview ? "Mettre à jour mon avis" : "Publier mon avis"}
                </Button>
              </Paper>
            )}
          </Box>
        );
      })()}

      {/* ─── Annonces similaires ─────────────────────────────────────────── */}
      {similar.length > 0 && (
        <Box sx={{ mt: 5 }}>
          <Typography variant="h5" gutterBottom>{t("property.similar")}</Typography>
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
          onSuccess={handleCommissionPaid}
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
