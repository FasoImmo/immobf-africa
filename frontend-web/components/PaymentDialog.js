import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, MenuItem, TextField, Alert, CircularProgress, Box, Typography, Chip
} from "@mui/material";
import { Payments } from "../lib/api";
import { formatFCFA } from "../lib/format";
import { useTranslation } from "react-i18next";

// Étiquette lisible + chip "Recommandé" pour FedaPay (provider principal)
const PROVIDER_LABELS = {
  fedapay: { label: "FedaPay (tous opérateurs)", recommended: true },
  orange_money_bf: { label: "Orange Money (*144*4*6#)" },
  moov_money_bf: { label: "Moov Money (*555*6#)" },
  wave: { label: "Wave" },
  cinetpay: { label: "CinetPay" },
};

// Pour FedaPay : choix d'opérateur préféré (affiché dans la modal de FedaPay,
// ou utilisé pour pré-sélectionner le bon code USSD).
const FEDAPAY_OPERATORS = [
  { value: "orange", label: "Orange Money" },
  { value: "moov", label: "Moov Money" },
  { value: "mtn", label: "MTN MoMo" },
  { value: "wave", label: "Wave" },
  { value: "card", label: "Carte Visa/Mastercard" },
];

export default function PaymentDialog({ open, onClose, property, amount, purpose = "deposit" }) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  const [preferredOperator, setPreferredOperator] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    Payments.providers(property?.country_code || "BF").then((d) => {
      setProviders(d.providers);
      // Sélectionne FedaPay par défaut s'il est dispo, sinon premier provider listé
      const fp = d.providers.find((p) => p.name === "fedapay");
      setProvider(fp ? "fedapay" : d.providers[0]?.name || "");
    });
  }, [open, property]);

  async function handleSubmit() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await Payments.initiate({
        provider,
        amount,
        currency: property?.currency || "XOF",
        property_id: property?.id,
        purpose,
        customer_phone: phone,
        customer_email: email || undefined,
        preferred_operator: provider === "fedapay" ? preferredOperator || undefined : undefined,
        description: `Acompte ${property?.title || "annonce"}`,
      });
      setResult(res);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally { setLoading(false); }
  }

  const isFedapay = provider === "fedapay";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("payment.choose_provider")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {property?.title} — <b>{formatFCFA(amount)}</b>
        </Typography>

        <TextField
          select fullWidth label={t("payment.choose_provider")} sx={{ mb: 2 }}
          value={provider} onChange={(e) => setProvider(e.target.value)}
        >
          {providers.map((p) => {
            const meta = PROVIDER_LABELS[p.name] || { label: p.name };
            return (
              <MenuItem key={p.name} value={p.name}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                  <span>{t(`payment.${p.name}`, meta.label)}</span>
                  {meta.recommended && (
                    <Chip label="Recommandé" size="small" color="success" sx={{ ml: "auto" }} />
                  )}
                </Box>
              </MenuItem>
            );
          })}
        </TextField>

        {isFedapay && (
          <TextField
            select fullWidth label="Opérateur préféré (optionnel)" sx={{ mb: 2 }}
            value={preferredOperator} onChange={(e) => setPreferredOperator(e.target.value)}
            helperText="FedaPay vous laissera quand même choisir sur sa page si vous laissez vide."
          >
            <MenuItem value=""><em>Aucune préférence</em></MenuItem>
            {FEDAPAY_OPERATORS.map((op) => (
              <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          fullWidth label="Numéro mobile money (+226…)"
          value={phone} onChange={(e) => setPhone(e.target.value)} sx={{ mb: 2 }}
        />

        {isFedapay && (
          <TextField
            fullWidth label="Email (recommandé pour le reçu)"
            type="email"
            value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }}
          />
        )}

        {result?.ussd_code && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Composez <b>{result.ussd_code}</b> sur votre téléphone pour valider le paiement (référence {result.reference}).
          </Alert>
        )}
        {result?.payment_url && (
          <Alert severity="success" sx={{ mt: 1 }}>
            <Button href={result.payment_url} target="_blank" rel="noreferrer">
              Ouvrir la page de paiement
            </Button>
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {loading && <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}><CircularProgress /></Box>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !phone || !provider}>
          Payer {formatFCFA(amount)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
