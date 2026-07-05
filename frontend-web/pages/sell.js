import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, TextField, Button, Typography, MenuItem,
  Alert, Grid, LinearProgress, Chip, Stack,
  FormControlLabel, Switch, Divider, CircularProgress,
  ToggleButton, ToggleButtonGroup, Select, FormControl, Autocomplete,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { Properties, Photos, Payments, Config } from "../lib/api";

// Les 55 États membres de l'Union africaine — utilisé pour le sélecteur pays
// et l'indicatif mobile money. Tri alphabétique (nom français).
// Note : tous ne sont pas (encore) couverts par les agrégateurs de paiement
// branchés (FedaPay/CinetPay se concentrent sur l'UEMOA + voisins) — la liste
// reste volontairement complète pour ne pas exclure un vendeur ou acheteur
// selon son pays de résidence.
const AFRICAN_COUNTRIES = [
  { code: "ZA", dial: "+27",  flag: "🇿🇦", name: "Afrique du Sud" },
  { code: "DZ", dial: "+213", flag: "🇩🇿", name: "Algérie" },
  { code: "AO", dial: "+244", flag: "🇦🇴", name: "Angola" },
  { code: "BJ", dial: "+229", flag: "🇧🇯", name: "Bénin" },
  { code: "BW", dial: "+267", flag: "🇧🇼", name: "Botswana" },
  { code: "BF", dial: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "BI", dial: "+257", flag: "🇧🇮", name: "Burundi" },
  { code: "CM", dial: "+237", flag: "🇨🇲", name: "Cameroun" },
  { code: "CV", dial: "+238", flag: "🇨🇻", name: "Cap-Vert" },
  { code: "KM", dial: "+269", flag: "🇰🇲", name: "Comores" },
  { code: "CG", dial: "+242", flag: "🇨🇬", name: "Congo" },
  { code: "CI", dial: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "DJ", dial: "+253", flag: "🇩🇯", name: "Djibouti" },
  { code: "EG", dial: "+20",  flag: "🇪🇬", name: "Égypte" },
  { code: "ER", dial: "+291", flag: "🇪🇷", name: "Érythrée" },
  { code: "SZ", dial: "+268", flag: "🇸🇿", name: "Eswatini" },
  { code: "ET", dial: "+251", flag: "🇪🇹", name: "Éthiopie" },
  { code: "GA", dial: "+241", flag: "🇬🇦", name: "Gabon" },
  { code: "GM", dial: "+220", flag: "🇬🇲", name: "Gambie" },
  { code: "GH", dial: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "GN", dial: "+224", flag: "🇬🇳", name: "Guinée" },
  { code: "GQ", dial: "+240", flag: "🇬🇶", name: "Guinée équatoriale" },
  { code: "GW", dial: "+245", flag: "🇬🇼", name: "Guinée-Bissau" },
  { code: "KE", dial: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "LS", dial: "+266", flag: "🇱🇸", name: "Lesotho" },
  { code: "LR", dial: "+231", flag: "🇱🇷", name: "Libéria" },
  { code: "LY", dial: "+218", flag: "🇱🇾", name: "Libye" },
  { code: "MG", dial: "+261", flag: "🇲🇬", name: "Madagascar" },
  { code: "MW", dial: "+265", flag: "🇲🇼", name: "Malawi" },
  { code: "ML", dial: "+223", flag: "🇲🇱", name: "Mali" },
  { code: "MA", dial: "+212", flag: "🇲🇦", name: "Maroc" },
  { code: "MU", dial: "+230", flag: "🇲🇺", name: "Maurice" },
  { code: "MR", dial: "+222", flag: "🇲🇷", name: "Mauritanie" },
  { code: "MZ", dial: "+258", flag: "🇲🇿", name: "Mozambique" },
  { code: "NA", dial: "+264", flag: "🇳🇦", name: "Namibie" },
  { code: "NE", dial: "+227", flag: "🇳🇪", name: "Niger" },
  { code: "NG", dial: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "UG", dial: "+256", flag: "🇺🇬", name: "Ouganda" },
  { code: "CD", dial: "+243", flag: "🇨🇩", name: "RD Congo" },
  { code: "CF", dial: "+236", flag: "🇨🇫", name: "République centrafricaine" },
  { code: "EH", dial: "+212", flag: "🇪🇭", name: "République arabe sahraouie démocratique" },
  { code: "RW", dial: "+250", flag: "🇷🇼", name: "Rwanda" },
  { code: "ST", dial: "+239", flag: "🇸🇹", name: "Sao Tomé-et-Principe" },
  { code: "SN", dial: "+221", flag: "🇸🇳", name: "Sénégal" },
  { code: "SC", dial: "+248", flag: "🇸🇨", name: "Seychelles" },
  { code: "SL", dial: "+232", flag: "🇸🇱", name: "Sierra Leone" },
  { code: "SO", dial: "+252", flag: "🇸🇴", name: "Somalie" },
  { code: "SD", dial: "+249", flag: "🇸🇩", name: "Soudan" },
  { code: "SS", dial: "+211", flag: "🇸🇸", name: "Soudan du Sud" },
  { code: "TZ", dial: "+255", flag: "🇹🇿", name: "Tanzanie" },
  { code: "TD", dial: "+235", flag: "🇹🇩", name: "Tchad" },
  { code: "TG", dial: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "TN", dial: "+216", flag: "🇹🇳", name: "Tunisie" },
  { code: "ZM", dial: "+260", flag: "🇿🇲", name: "Zambie" },
  { code: "ZW", dial: "+263", flag: "🇿🇼", name: "Zimbabwe" },
];

// Principales villes par pays — utilisé pour suggérer des villes selon le
// pays choisi. Liste non exhaustive : le champ reste éditable librement
// (Autocomplete freeSolo) pour ne pas bloquer un vendeur dont la ville
// n'apparaît pas dans la liste, notamment hors Burkina Faso.
const CITIES_BY_COUNTRY = {
  BF: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora", "Ouahigouya",
       "Kaya", "Tenkodogo", "Fada N'Gourma", "Dédougou", "Gaoua",
       "Dori", "Ziniaré", "Réo", "Manga", "Pô"],
  CI: ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Korhogo"],
  SN: ["Dakar", "Thiès", "Saint-Louis", "Touba", "Ziguinchor"],
  ML: ["Bamako", "Sikasso", "Mopti", "Koutiala", "Kayes"],
  TG: ["Lomé", "Sokodé", "Kara"],
  BJ: ["Cotonou", "Porto-Novo", "Parakou"],
  NE: ["Niamey", "Zinder", "Maradi"],
  GH: ["Accra", "Kumasi", "Tamale"],
  NG: ["Lagos", "Abuja", "Kano", "Ibadan"],
};

// TX_TYPES et RENT_PERIODS sont maintenant des fonctions pour permettre i18n
const TX_TYPES = (t) => [
  { value: "sale",       label: t("sell.type_sale") },
  { value: "rent_long",  label: t("sell.type_rent_long") },
  { value: "rent_short", label: t("sell.type_rent_short") },
];

const RENT_PERIODS = (t) => [
  { value: "monthly", label: t("sell.period_monthly") },
  { value: "weekly",  label: t("sell.period_weekly") },
  { value: "nightly", label: t("sell.period_nightly") },
];

const PROP_TYPES = ["land","house","apartment","office","commercial"];
const EUR_RATE = 655.957;
const USD_RATE = 600;

// Plans d'abonnement avec tarifs dégressifs
const LISTING_PLANS = [
  { months: 1,  price: 2000,  label: "1 mois",  saving: null },
  { months: 3,  price: 5500,  label: "3 mois",  saving: "−8%" },
  { months: 6,  price: 10000, label: "6 mois",  saving: "−17%" },
  { months: 12, price: 18000, label: "12 mois", saving: "−25%" },
];

// ─── Provider labels ─────────────────────────────────────────────────────────
const PROVIDER_LABELS = {
  fedapay:        "FedaPay (tous opérateurs) ✓",
  orange_money_bf:"Orange Money",
  moov_money_bf:  "Moov Money",
  wave:           "Wave",
  cinetpay:       "CinetPay",
  pawapay:        "PawaPay (Moov Money, Orange Money)",
};

// PawaPay : opérateurs par pays. Orange = flux PREAUTH — le client doit générer
// un code OTP via le service USSD indiqué (code secret) avant de payer.
// Le champ ussd indique le code exact à composer pour chaque opérateur.
const PAWAPAY_OPS_BY_COUNTRY = {
  BF: [
    { value: "moov",   label: "Moov Money" },
    { value: "orange", label: "Orange Money (code OTP requis)", otp: true, ussd: "*144*4*6#" },
  ],
  CI: [
    { value: "orange", label: "Orange Money",    otp: true, ussd: "*144#" },
    { value: "mtn",    label: "MTN Mobile Money" },
    { value: "moov",   label: "Moov Money" },
  ],
  SN: [
    { value: "orange", label: "Orange Money",    otp: true, ussd: "*144#" },
    { value: "free",   label: "Free Money" },
    { value: "wave",   label: "Wave" },
  ],
  ML: [
    { value: "orange", label: "Orange Money",    otp: true, ussd: "*144#" },
    { value: "moov",   label: "Moov Money" },
  ],
  TG: [
    { value: "moov",   label: "Moov Money" },
    { value: "orange", label: "Orange Money",    otp: true, ussd: "#144#" },
  ],
  BJ: [
    { value: "moov",   label: "Moov Money" },
    { value: "mtn",    label: "MTN Mobile Money" },
  ],
  NE: [
    { value: "orange", label: "Orange Money",    otp: true, ussd: "*144#" },
    { value: "moov",   label: "Moov Money" },
  ],
  GN: [
    { value: "orange", label: "Orange Money",    otp: true, ussd: "*144#" },
    { value: "mtn",    label: "MTN Mobile Money" },
  ],
  CM: [
    { value: "orange", label: "Orange Money",    otp: true, ussd: "*150*50#" },
    { value: "mtn",    label: "MTN Mobile Money" },
  ],
  GH: [
    { value: "mtn",    label: "MTN Mobile Money" },
  ],
  default: [
    { value: "moov",   label: "Moov Money" },
    { value: "orange", label: "Orange Money" },
  ],
};

export default function SellPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // ─── Étape courante : 1=formulaire 2=paiement 3=photos ───────────────────
  const [step, setStep] = useState(1);
  const [propertyId, setPropertyId] = useState(null);

  // ─── Étape 1 : formulaire ─────────────────────────────────────────────────
  const [form, setForm] = useState({
    transaction_type: "sale",
    type: "house", title: "", description: "", title_en: "", description_en: "",
    price: "", currency: "XOF", area_m2: "", bedrooms: "", bathrooms: "",
    country_code: "BF", city: "", address: "", neighborhood: "",
    is_furnished: false, rent_period: "monthly",
  });
  const [formErr, setFormErr] = useState(null);
  const [formBusy, setFormBusy] = useState(false);

  // ─── Étape 2 : paiement ───────────────────────────────────────────────────
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  // CORRECTIF (30/06/2026) : avant, les fournisseurs étaient toujours
  // récupérés pour "BF" en dur (Payments.providers("BF")) — le vendeur ne
  // pouvait jamais voir les moyens de paiement de son propre pays s'il
  // résidait/payait depuis un autre pays africain. L'indicatif (dialCode)
  // découle maintenant du pays choisi, au lieu d'être un sélecteur séparé et
  // déconnecté du choix de fournisseurs.
  const [buyerCountry, setBuyerCountry] = useState("BF");
  const dialCode = (AFRICAN_COUNTRIES.find((c) => c.code === buyerCountry) || {}).dial || "+226";
  const pawapayOperators = PAWAPAY_OPS_BY_COUNTRY[buyerCountry] || PAWAPAY_OPS_BY_COUNTRY.default;
  const [localPhone, setLocalPhone] = useState("");
  const phone = dialCode + localPhone.replace(/\D/g, "");
  const [pawapayOperator, setPawapayOperator] = useState("moov");
  const [pawapayOtp, setPawapayOtp] = useState("");
  const currentOp = pawapayOperators.find((o) => o.value === pawapayOperator) || {};
  const [selectedPlan, setSelectedPlan] = useState(LISTING_PLANS[0]);
  const [payErr, setPayErr] = useState(null);
  const [payBusy, setPayBusy] = useState(false);
  const [txId, setTxId] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [ussdCode, setUssdCode] = useState(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);

  // ─── Promo gratuite ───────────────────────────────────────────────────────
  const [promo, setPromo] = useState(null); // null = pas encore chargé

  useEffect(() => {
    Config.promo().then(setPromo).catch(() => setPromo({ active: false }));
  }, []);

  // ─── Étape 3 : photos ─────────────────────────────────────────────────────
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadErr, setUploadErr] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  // ─── Garde : redirection si non connecté ─────────────────────────────────
  useEffect(function() {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("immobf_token");
      if (!token) {
        router.replace("/login?redirect=/sell");
      }
    }
  }, []); // eslint-disable-line

  // ─── Pré-sélection du type de transaction via ?tx= ────────────────────────
  useEffect(function() {
    if (!router.isReady) return;
    const tx = router.query.tx;
    if (tx && ["sale", "rent_long", "rent_short"].includes(tx)) {
      setForm(function(f) { return Object.assign({}, f, { transaction_type: tx }); });
    }
  }, [router.isReady, router.query.tx]); // eslint-disable-line

  // ─── Reprise d'un brouillon via ?resume=propertyId ───────────────────────
  useEffect(function() {
    if (!router.isReady) return;
    var resumeId = router.query.resume;
    if (!resumeId) return;
    Properties.get(resumeId).then(function(d) {
      var p = d.property;
      setForm({
        transaction_type: p.transaction_type || "sale",
        type: p.type || "house",
        title: p.title || "",
        description: p.description || "",
        price: p.price || "",
        currency: p.currency || "XOF",
        area_m2: p.area_m2 || "",
        bedrooms: p.bedrooms || "",
        bathrooms: p.bathrooms || "",
        country_code: p.country_code || "BF",
        city: p.city || "",
        address: p.address || "",
        neighborhood: p.neighborhood || "",
        is_furnished: p.is_furnished || false,
        rent_period: p.rent_period || "monthly",
      });
      setPropertyId(resumeId);
      setStep(2); // brouillon déjà créé → aller directement au paiement
    }).catch(function() {});
  }, [router.isReady, router.query.resume]); // eslint-disable-line

  // ─── Renouvellement via ?renew=propertyId ─────────────────────────────────
  // Même logique que ?resume : pré-remplit le formulaire avec les données
  // existantes de l'annonce et saute directement à l'étape paiement.
  useEffect(function() {
    if (!router.isReady) return;
    var renewId = router.query.renew;
    if (!renewId) return;
    Properties.get(renewId).then(function(d) {
      var p = d.property;
      setForm({
        transaction_type: p.transaction_type || "sale",
        type: p.type || "house",
        title: p.title || "",
        description: p.description || "",
        price: p.price || "",
        currency: p.currency || "XOF",
        area_m2: p.area_m2 || "",
        bedrooms: p.bedrooms || "",
        bathrooms: p.bathrooms || "",
        country_code: p.country_code || "BF",
        city: p.city || "",
        address: p.address || "",
        neighborhood: p.neighborhood || "",
        is_furnished: p.is_furnished || false,
        rent_period: p.rent_period || "monthly",
      });
      setPropertyId(renewId);
      setStep(2); // annonce existe déjà → aller directement au paiement
    }).catch(function() {});
  }, [router.isReady, router.query.renew]); // eslint-disable-line

  // Pré-sélectionne le pays acheteur = pays de l'annonce dès l'arrivée à
  // l'étape 2 (point de départ raisonnable), mais l'utilisateur peut le
  // changer ci-dessous s'il paie depuis un autre pays.
  useEffect(function() {
    if (step !== 2) return;
    setBuyerCountry(form.country_code || "BF");
  }, [step]); // eslint-disable-line

  // Charger les providers à chaque changement de pays acheteur (et à
  // l'arrivée sur l'étape 2).
  useEffect(function() {
    if (step !== 2 || !buyerCountry) return;
    const ops = PAWAPAY_OPS_BY_COUNTRY[buyerCountry] || PAWAPAY_OPS_BY_COUNTRY.default;
    setPawapayOperator(ops[0]?.value || "moov");
    setPawapayOtp("");
    Payments.providers(buyerCountry).then(function(d) {
      setProviders(d.providers || []);
      var fp = (d.providers || []).find(function(p) { return p.name === "fedapay"; });
      setProvider(fp ? "fedapay" : (d.providers[0] || {}).name || "");
    });
  }, [step, buyerCountry]);

  // Polling statut transaction
  useEffect(function() {
    if (!polling || !txId) return;
    pollRef.current = setInterval(async function() {
      try {
        var data = await Payments.get(txId);
        if (data.transaction.status === "succeeded") {
          clearInterval(pollRef.current);
          setPolling(false);
          setStep(3);
        } else if (data.transaction.status === "failed") {
          clearInterval(pollRef.current);
          setPolling(false);
          setPayErr(t("sell.pay_failed"));
        }
      } catch (_) {}
    }, 3000);
    return function() { clearInterval(pollRef.current); };
  }, [polling, txId]);

  function change(k) {
    return function(e) {
      var val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setForm(function(f) { return Object.assign({}, f, { [k]: val }); });
    };
  }

  var isRent = form.transaction_type !== "sale";
  var priceLabel = form.transaction_type === "sale" ? t("sell.price_sale")
    : form.transaction_type === "rent_short" ? t("sell.price_rent_short")
    : t("sell.price_rent_long");

  // ─── Étape 1 : soumettre le formulaire ───────────────────────────────────
  async function submitProperty(e) {
    e.preventDefault(); setFormErr(null); setFormBusy(true);
    try {
      var payload = Object.assign({}, form, {
        price: Number(form.price),
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        is_furnished: Boolean(form.is_furnished),
        rent_period: isRent ? form.rent_period : null,
      });
      var res = await Properties.create(payload);
      var pid = res.property.id;
      setPropertyId(pid);
      // Si promo gratuite active → auto-publier, sauter l'étape paiement
      if (promo && promo.active) {
        await Properties.publish(pid);
        setStep(3);
      } else {
        setStep(2);
      }
    } catch (err) {
      setFormErr(err && err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message : err.message);
    } finally { setFormBusy(false); }
  }

  // ─── Enregistrer comme brouillon (sans passer au paiement) ───────────────
  async function saveDraft(e) {
    e.preventDefault(); setFormErr(null); setFormBusy(true);
    try {
      var payload = Object.assign({}, form, {
        price: Number(form.price) || 0,
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        is_furnished: Boolean(form.is_furnished),
        rent_period: isRent ? form.rent_period : null,
      });
      await Properties.create(payload);
      router.push("/account?draft_saved=1");
    } catch (err) {
      setFormErr(err && err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message : err.message);
    } finally { setFormBusy(false); }
  }

  // ─── Étape 2 : payer les frais de publication ────────────────────────────
  async function payListingFee() {
    setPayErr(null); setPayBusy(true);
    try {
      var userEmail = "";
      try { userEmail = JSON.parse(localStorage.getItem("immobf_user") || "{}").email || ""; } catch (_) {}
      var res = await Payments.initiate({
        provider: provider,
        amount: selectedPlan.price,
        currency: "XOF",
        property_id: propertyId,
        purpose: "listing_fee",
        customer_phone: phone,
        customer_email: userEmail || undefined,
        description: `Abonnement ImmoBF Africa — ${selectedPlan.price.toLocaleString("fr-FR")} FCFA / ${selectedPlan.label}`,
        preferred_operator: provider === "pawapay" ? pawapayOperator : null,
        pawapay_otp: provider === "pawapay" && currentOp.otp ? pawapayOtp : null,
      });
      setTxId(res.transaction_id);
      // Stub mode : succès immédiat → passer directement à l'étape photos
      if (res.status === "succeeded") {
        setStep(3);
        return;
      }
      if (res.payment_url) {
        // Redirection automatique vers la page de paiement (FedaPay, etc.) —
        // ne pas faire dépendre l'utilisateur d'un clic supplémentaire sur
        // un lien "Ouvrir la page de paiement".
        setPaymentUrl(res.payment_url);
        setPolling(true);
        window.location.href = res.payment_url;
        return;
      }
      if (res.ussd_code) setUssdCode(res.ussd_code);
      setPolling(true);
    } catch (err) {
      setPayErr(err && err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message : err.message);
    } finally { setPayBusy(false); }
  }

  // ─── Étape 3 : upload photos ─────────────────────────────────────────────
  function filterImages(files) {
    return files.filter(function(f) { return /^image\/(jpeg|png|webp)$/.test(f.type); });
  }

  var onFilePick = useCallback(function(e) {
    var picked = filterImages(Array.from(e.target.files || []));
    setFiles(function(prev) { return prev.concat(picked).slice(0, 10); });
    // Reset input pour permettre de re-sélectionner le même fichier
    e.target.value = "";
  }, []);

  var onDrop = useCallback(function(e) {
    e.preventDefault();
    var dropped = filterImages(Array.from(e.dataTransfer.files || []));
    setFiles(function(prev) { return prev.concat(dropped).slice(0, 10); });
  }, []);

  function removeFile(i) { setFiles(function(f) { return f.filter(function(_, idx) { return idx !== i; }); }); }

  async function uploadFiles() {
    if (!files.length) { router.push("/properties/" + propertyId + "?published=1"); return; }
    setUploadErr(null); setUploadProgress(10); setUploadBusy(true);
    try {
      var result = await Photos.upload(propertyId, files);
      setUploadedCount(result.photos.length);
      setUploadProgress(100);
      setTimeout(function() { router.push("/properties/" + propertyId + "?published=1"); }, 1200);
    } catch (err) {
      setUploadErr(err && err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message : err.message);
    } finally { setUploadBusy(false); }
  }

  // ─── Stepper header ───────────────────────────────────────────────────────
  var steps = [
    `1. ${t("sell.step_details")}`,
    `2. ${t("sell.step_payment")}`,
    `3. ${t("sell.step_photos")}`,
  ];

  return (
    <Layout title={`${t("sell.title")} — ImmoBF`}>
      <Typography variant="h4" gutterBottom>{t("sell.title")}</Typography>

      {/* Progress steps */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        {steps.map(function(label, i) {
          var active = step === i + 1;
          var done = step > i + 1;
          return (
            <Chip
              key={label}
              label={label}
              color={done ? "success" : active ? "primary" : "default"}
              variant={active ? "filled" : "outlined"}
              size="small"
            />
          );
        })}
      </Stack>

      {/* ─── Bannière promo gratuite ──────────────────────────────────────── */}
      {promo && promo.active && (
        <Alert
          severity="success"
          icon="🎉"
          sx={{ mb: 2, fontSize: "1rem", fontWeight: 600, borderRadius: 2,
                bgcolor: "#e8f5e9", border: "1.5px solid #66bb6a" }}
        >
          {promo.message_fr || "Publication gratuite ! Publiez votre annonce sans frais pendant cette période limitée."}
        </Alert>
      )}

      {/* ─── ÉTAPE 1 : Formulaire ─────────────────────────────────────────── */}
      {step === 1 && (
        <Paper sx={{ p: 3 }} elevation={1}>
          <form onSubmit={submitProperty}>
            <Grid container spacing={2}>
              {/* ── Sélecteur type de transaction (boutons visibles) ── */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                  {t("sell.transaction_type")} *
                </Typography>
                <ToggleButtonGroup
                  exclusive fullWidth
                  value={form.transaction_type}
                  onChange={function(_, v) { if (v) setForm(function(f) { return Object.assign({}, f, { transaction_type: v }); }); }}
                  sx={{ gap: 1 }}
                >
                  <ToggleButton value="sale" sx={{ flex: 1, py: 1.5, fontWeight: 600, borderRadius: "8px !important" }}>
                    🏷️ {t("nav.publish_sale")}
                  </ToggleButton>
                  <ToggleButton value="rent_long" sx={{ flex: 1, py: 1.5, fontWeight: 600, borderRadius: "8px !important" }}>
                    🔑 {t("nav.publish_rent_long")}
                  </ToggleButton>
                  <ToggleButton value="rent_short" sx={{ flex: 1, py: 1.5, fontWeight: 600, borderRadius: "8px !important" }}>
                    🌙 {t("nav.publish_rent_short")}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label={t("search.type")} value={form.type} onChange={change("type")}>
                  {PROP_TYPES.map(function(v) { return <MenuItem key={v} value={v}>{t("types." + v)}</MenuItem>; })}
                </TextField>
              </Grid>

              {isRent && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField select fullWidth label={t("sell.rent_period")} value={form.rent_period} onChange={change("rent_period")}>
                      {RENT_PERIODS(t).map(function(o) { return <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>; })}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{ display: "flex", alignItems: "center" }}>
                    <FormControlLabel
                      control={<Switch checked={form.is_furnished} onChange={change("is_furnished")} />}
                      label={t("sell.furnished")}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}><Divider /></Grid>

              <Grid item xs={12} sm={8}>
                <TextField fullWidth label={`${t("sell.title_field")} *`} value={form.title} onChange={change("title")} required />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth label={t("sell.country")} value={form.country_code} onChange={change("country_code")}>
                  {AFRICAN_COUNTRIES.map((c) => (
                    <MenuItem key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={3} label={t("sell.description")} value={form.description} onChange={change("description")} />
              </Grid>

              {/* ─── Version anglaise optionnelle ─────────────────────── */}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                  🌍 Version anglaise (optionnel — pour les visiteurs anglophones)
                </Typography>
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField fullWidth label="Title in English (optional)" value={form.title_en} onChange={change("title_en")}
                  placeholder="e.g. Furnished apartment, quiet neighborhood" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={2} label="Description in English (optional)" value={form.description_en} onChange={change("description_en")}
                  placeholder="Describe your property in English for international visitors…" />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number" label={priceLabel} value={form.price} onChange={change("price")} required
                  helperText={form.price ? `${Number(form.price).toLocaleString("fr-FR")} FCFA` : " "} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number" label={t("sell.area")} value={form.area_m2} onChange={change("area_m2")}
                  helperText={form.area_m2 ? `${Number(form.area_m2).toLocaleString("fr-FR")} m²` : " "} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={CITIES_BY_COUNTRY[form.country_code] || []}
                  value={form.city}
                  onInputChange={function(_, v) { setForm(function(f) { return Object.assign({}, f, { city: v }); }); }}
                  renderInput={function(params) {
                    return (
                      <TextField {...params} fullWidth label={`${t("sell.city")} *`} required
                        helperText={t("sell.city_helper")} />
                    );
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label={t("sell.neighborhood")} placeholder={t("sell.neighborhood_placeholder")}
                  value={form.neighborhood} onChange={change("neighborhood")} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label={t("sell.address")} value={form.address} onChange={change("address")} />
              </Grid>

              {form.type !== "land" && (
                <>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth type="number" label={t("sell.bedrooms")} value={form.bedrooms} onChange={change("bedrooms")} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth type="number" label={t("sell.bathrooms")} value={form.bathrooms} onChange={change("bathrooms")} />
                  </Grid>
                </>
              )}
            </Grid>

            {formErr && <Alert severity="error" sx={{ mt: 2 }}>{formErr}</Alert>}
            <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
              <Button
                variant="outlined" color="inherit" disabled={formBusy}
                onClick={saveDraft}
                sx={{ color: "text.secondary" }}
              >
                💾 {t("sell.save_draft")}
              </Button>
              <Button type="submit" variant="contained" disabled={formBusy}>
                {t("sell.next_btn")}
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {/* ─── ÉTAPE 2 : Paiement frais de publication ─────────────────────── */}
      {step === 2 && (
        <Paper sx={{ p: 3 }} elevation={1}>
          <Typography variant="h6" gutterBottom>{t("sell.step_payment")}</Typography>
          {/* Sélecteur de durée */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            {t("sell.choose_duration")}
          </Typography>
          <Grid container spacing={1} sx={{ mb: 3 }}>
            {LISTING_PLANS.map((plan) => {
              const selected = selectedPlan.months === plan.months;
              const eur = (plan.price / EUR_RATE).toFixed(2);
              return (
                <Grid item xs={6} sm={3} key={plan.months}>
                  <Paper
                    elevation={selected ? 4 : 1}
                    onClick={() => setSelectedPlan(plan)}
                    sx={{
                      p: 1.5, textAlign: "center", cursor: "pointer",
                      border: selected ? "2px solid #0E7C66" : "2px solid transparent",
                      borderRadius: 2, position: "relative",
                      "&:hover": { borderColor: "#0E7C66" },
                    }}
                  >
                    {plan.saving && (
                      <Chip label={plan.saving} color="success" size="small"
                        sx={{ position: "absolute", top: -10, right: -10, fontSize: 10 }} />
                    )}
                    <Typography variant="h6" color="primary" fontWeight={700}>
                      {plan.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {plan.price.toLocaleString("fr-FR")} FCFA
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ≈ {eur} €
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t("sell.plan_selected")} : <strong>{selectedPlan.label}</strong> —{" "}
            <strong>{selectedPlan.price.toLocaleString("fr-FR")} FCFA</strong>{" "}
            <Typography component="span" variant="body2" color="text.secondary">
              (≈ {(selectedPlan.price / EUR_RATE).toFixed(2)} € · ≈ ${(selectedPlan.price / USD_RATE).toFixed(2)})
            </Typography>
            . {t("sell.plan_visible")} <strong>{selectedPlan.months * 30} {t("sell.days")}</strong>.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth label={t("sell.payment_method")} value={provider}
                onChange={function(e) { setProvider(e.target.value); }}
                disabled={polling}
              >
                {providers.map(function(p) {
                  return (
                    <MenuItem key={p.name} value={p.name}>
                      {PROVIDER_LABELS[p.name] || p.name}
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              {/* CORRECTIF (30/06/2026) : ce sélecteur ne montrait que
                  l'indicatif (ex. "+226"), donnant l'impression que seul le BF
                  était payable depuis cette page. Il porte maintenant le pays
                  complet — change aussi la liste de fournisseurs proposés
                  juste au-dessus (effet sur buyerCountry). */}
              <FormControl fullWidth>
                <Select
                  value={buyerCountry}
                  onChange={(e) => setBuyerCountry(e.target.value)}
                  size="medium" sx={{ height: 56 }}
                  disabled={polling}
                >
                  {AFRICAN_COUNTRIES.map((c) => (
                    <MenuItem key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.dial})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  value={dialCode}
                  size="small" sx={{ width: 90 }}
                  disabled
                />
                <TextField
                  fullWidth label={t("sell.mobile_money")}
                  value={localPhone}
                  onChange={(e) => setLocalPhone(e.target.value.replace(/\D/g, ""))}
                  disabled={polling}
                  placeholder="XXXXXXXX"
                  inputMode="tel"
                />
              </Box>
            </Grid>

            {/* PawaPay : choix Moov/Orange + OTP Orange (PREAUTH). Sans cette
                UI, l'appel partait toujours en MOOV_BFA par défaut côté
                backend (PawaPayProvider._resolveOperator) — Orange Money était
                donc inatteignable depuis cette page, et toute tentative
                Orange aurait été rejetée faute de code OTP (voir
                PawaPayProvider.initiate). */}
            {provider === "pawapay" && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select fullWidth label="Opérateur PawaPay"
                    value={pawapayOperator}
                    onChange={(e) => setPawapayOperator(e.target.value)}
                    disabled={polling}
                  >
                    {pawapayOperators.map((op) => (
                      <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                {currentOp.otp && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth label={`Code OTP — ${currentOp.label}`}
                      value={pawapayOtp}
                      onChange={(e) => setPawapayOtp(e.target.value.replace(/\D/g, ""))}
                      disabled={polling}
                      placeholder="Ex: 477728"
                      helperText={currentOp.ussd
                        ? `Composez ${currentOp.ussd} puis entrez le code reçu`
                        : t("sell.ussd_hint")}
                    />
                  </Grid>
                )}
              </>
            )}
          </Grid>

          {payErr && <Alert severity="error" sx={{ mt: 2 }}>{payErr}</Alert>}

          {ussdCode && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Composez <strong>{ussdCode}</strong> sur votre téléphone pour valider le paiement.
            </Alert>
          )}

          {paymentUrl && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Button href={paymentUrl} target="_blank" rel="noreferrer" variant="outlined" size="small">
                Ouvrir la page de paiement
              </Button>
            </Alert>
          )}

          {polling && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                En attente de confirmation du paiement…
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
            <Button variant="text" disabled={polling} onClick={function() { setStep(1); }}>
              {t("sell.back_btn")}
            </Button>
            <Button
              variant="contained" size="large"
              disabled={
                payBusy || polling || !phone || !provider ||
                (provider === "pawapay" && currentOp.otp && !pawapayOtp)
              }
              onClick={payListingFee}
            >
              {payBusy ? "…" : `${t("sell.pay_btn")} ${selectedPlan.price.toLocaleString("fr-FR")} FCFA`}
            </Button>
          </Box>
        </Paper>
      )}

      {/* ─── ÉTAPE 3 : Photos ────────────────────────────────────────────── */}
      {step === 3 && (
        <Paper sx={{ p: 3 }} elevation={1}>
          <Alert severity="success" sx={{ mb: 2 }}>
            {t("sell.payment_confirmed")}
          </Alert>
          <Typography variant="h6" gutterBottom>{t("sell.photos_title")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("sell.photos_hint")}
          </Typography>
          <Box
            onDrop={onDrop}
            onDragOver={function(e) { e.preventDefault(); }}
            onClick={function() { document.getElementById("file-input").click(); }}
            sx={{
              border: "2px dashed #0E7C66", borderRadius: 2, p: 4,
              textAlign: "center", cursor: "pointer",
              bgcolor: "rgba(14,124,102,0.04)",
              "&:hover": { bgcolor: "rgba(14,124,102,0.08)" }
            }}
          >
            <Typography>{t("sell.photos_drop")}</Typography>
            <input id="file-input" type="file" multiple
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }} onChange={onFilePick} />
          </Box>

          {files.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2, gap: 1 }}>
              {files.map(function(f, i) {
                return <Chip key={i} label={f.name} onDelete={function() { removeFile(i); }} />;
              })}
            </Stack>
          )}

          {uploadProgress !== null && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              {uploadProgress === 100 && (
                <Typography color="success.main" sx={{ mt: 1 }}>
                  {uploadedCount} fichier(s) uploadé(s) — redirection…
                </Typography>
              )}
            </Box>
          )}

          {uploadErr && <Alert severity="error" sx={{ mt: 2 }}>{uploadErr}</Alert>}

          <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
            <Button variant="text" onClick={function() { router.push("/properties/" + propertyId + "?published=1"); }} disabled={uploadBusy}>
              {t("sell.skip_photos")}
            </Button>
            <Button variant="contained" onClick={uploadFiles} disabled={uploadBusy}>
              {files.length ? t("sell.upload_btn") : t("sell.finish_btn")}
            </Button>
          </Box>
        </Paper>
      )}
    </Layout>
  );
}
