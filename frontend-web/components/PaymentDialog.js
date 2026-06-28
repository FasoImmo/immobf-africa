import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, MenuItem, TextField, Alert, CircularProgress, Box, Typography, Chip
} from "@mui/material";
import { Payments } from "../lib/api";
import { formatFCFA } from "../lib/format";
import { useTranslation } from "react-i18next";

// Étiquette lisible + chip "Recommandé". CinetPay et Orange Money BF en tête :
// Wave et Flutterwave ont tous les deux confirmé (formulaires d'inscription
// réels) ne pas accepter d'entreprise basée au Burkina Faso comme marchand —
// gardés en option pour d'autres pays/évolutions futures, mais plus
// recommandés par défaut pour le BF (voir tâche #24, #27, #28).
const PROVIDER_LABELS = {
  cinetpay: { label: "CinetPay", recommended: true },
  orange_money_bf: { label: "Orange Money (*144*4*6#)", recommended: true },
  wave: { label: "Wave" },
  flutterwave: { label: "Flutterwave (carte, Orange Money, Mobicash)" },
  fedapay: { label: "FedaPay (tous opérateurs)" },
  moov_money_bf: { label: "Moov Money (*555*6#)" },
  pawapay: { label: "PawaPay (Moov Money)" },
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
      // Sélectionne CinetPay par défaut s'il est dispo, sinon Orange Money BF,
      // sinon Wave, sinon Flutterwave, sinon FedaPay, sinon premier provider listé.
      const cp = d.providers.find((p) => p.name === "cinetpay");
      const om = d.providers.find((p) => p.name === "orange_money_bf");
      const wv = d.providers.find((p) => p.name === "wave");
      const flw = d.providers.find((p) => p.name === "flutterwave");
      const fp = d.providers.find((p) => p.name === "fedapay");
      setProvider(
        cp ? "cinetpay" : om ? "orange_money_bf" : wv ? "wave" : flw ? "flutterwave" : fp ? "fedapay" : d.providers[0]?.name || ""
      );
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
  // Email recommandé pour le reçu, quel que soit le fournisseur.
  const showEmail = true;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("payment.choose_provider")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {property?.title} — <b>{formatFCFA(amount)}</b>
        </Typography>

        {providers.length === 0 ? (
          // Aucun fournisseur configuré/validé pour ce pays (cas du Burkina
          // Faso le temps que FedaPay/CinetPay/PawaPay soient réactivés —
          // voir tâche #24, #28, #30, 28/06/2026). On évite d'afficher un
          // sélecteur vide ou de laisser l'acheteur tomber sur un checkout
          // qui échouera systématiquement.
          <Alert severity="warning" sx={{ mb: 2 }}>
            Le paiement en ligne est temporairement indisponible pour ce pays.
            Contactez le vendeur directement pour convenir des modalités de
            paiement (espèces, virement, dépôt en personne).
          </Alert>
        ) : (
          <>
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

            {showEmail && (
              <TextField
                fullWidth label="Email (recommandé pour le reçu)"
                type="email"
                value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }}
              />
            )}
          </>
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
        {providers.length > 0 && (
          <Button onClick={handleSubmit} variant="contained" disabled={loading || !phone || !provider}>
            Payer {formatFCFA(amount)}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
