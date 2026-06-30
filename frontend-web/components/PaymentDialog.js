import { useEffect, useRef, useState } from "react";
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
  pawapay: { label: "PawaPay (Moov Money, Orange Money)" },
};

// PawaPay : choix de l'opérateur mobile money. Moov = push simple (juste le
// numéro). Orange = flux PREAUTH — le client doit d'abord générer un code
// OTP via le service USSD Orange Money (avec son code secret) et le saisir
// dans le formulaire (voir PawaPayProvider.js, 30/06/2026).
const PAWAPAY_OPERATORS = [
  { value: "moov", label: "Moov Money" },
  { value: "orange", label: "Orange Money (code OTP requis)" },
];

// Pour FedaPay : choix d'opérateur préféré (affiché dans la modal de FedaPay,
// ou utilisé pour pré-sélectionner le bon code USSD).
const FEDAPAY_OPERATORS = [
  { value: "orange", label: "Orange Money" },
  { value: "moov", label: "Moov Money" },
  { value: "mtn", label: "MTN MoMo" },
  { value: "wave", label: "Wave" },
  { value: "card", label: "Carte Visa/Mastercard" },
];

export default function PaymentDialog({ open, onClose, property, amount, purpose = "deposit", bookingUnits, checkIn }) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  const [preferredOperator, setPreferredOperator] = useState("");
  const [pawapayOperator, setPawapayOperator] = useState("moov");
  const [pawapayOtp, setPawapayOtp] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  // Statut réel de la transaction, obtenu en interrogeant le backend après
  // l'initiation — sans ça, le dialog affichait "Commission réglée" dès que
  // l'appel d'initiation répondait (souvent un simple push USSD en attente),
  // sans jamais vérifier si le client avait effectivement payé, et sans
  // jamais s'arrêter si la confirmation n'arrivait pas.
  // null | "pending" | "succeeded" | "failed" | "timeout"
  const [status, setStatus] = useState(null);
  const pollRef = useRef(null);
  const pollAttemptsRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 40; // ~3 minutes à 4.5s d'intervalle

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(transactionId) {
    stopPolling();
    pollAttemptsRef.current = 0;
    setStatus("pending");
    pollRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;
      try {
        const d = await Payments.get(transactionId);
        const s = d?.transaction?.status;
        if (s === "succeeded") {
          setStatus("succeeded");
          stopPolling();
          return;
        }
        if (s === "failed") {
          setStatus("failed");
          stopPolling();
          return;
        }
      } catch (_) {
        // erreur réseau ponctuelle : on continue jusqu'au délai max
      }
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setStatus("timeout");
        stopPolling();
      }
    }, 4500);
  }

  // Coupe le sondage si le dialog se ferme ou si le composant disparaît —
  // sinon le polling continuait indéfiniment en arrière-plan.
  useEffect(() => {
    if (!open) stopPolling();
    return stopPolling;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setPawapayOperator("moov");
    setPawapayOtp("");
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
    setLoading(true); setError(null); setResult(null); setStatus(null);
    stopPolling();
    try {
      const res = await Payments.initiate({
        provider,
        amount,
        currency: property?.currency || "XOF",
        property_id: property?.id,
        purpose,
        customer_phone: phone,
        customer_email: email || undefined,
        preferred_operator:
          provider === "fedapay" ? preferredOperator || undefined :
          provider === "pawapay" ? pawapayOperator || undefined :
          undefined,
        pawapay_otp: provider === "pawapay" && pawapayOperator === "orange" ? pawapayOtp || undefined : undefined,
        booking_units: purpose === "commission" ? bookingUnits || 1 : undefined,
        check_in: purpose === "commission" ? checkIn || undefined : undefined,
        description:
          purpose === "commission"
            ? `Commission de réservation (5%) — ${property?.title || "annonce"}`
            : `Acompte ${property?.title || "annonce"}`,
      });
      setResult(res);
      if (res.status === "succeeded") {
        // Mode stub/mock : déjà confirmé, pas besoin de sonder.
        setStatus("succeeded");
      } else if (res.transaction_id) {
        // Push USSD envoyé, en attente que le client valide sur son
        // téléphone : on sonde régulièrement l'état réel de la transaction
        // au lieu de supposer que c'est payé.
        startPolling(res.transaction_id);
      }
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally { setLoading(false); }
  }

  function handleRetry() {
    setStatus(null);
    setResult(null);
    setError(null);
  }

  const isFedapay = provider === "fedapay";
  const isPawapay = provider === "pawapay";
  const otpMissing = isPawapay && pawapayOperator === "orange" && !pawapayOtp;
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

            {isPawapay && (
              <TextField
                select fullWidth label="Opérateur mobile money" sx={{ mb: 2 }}
                value={pawapayOperator} onChange={(e) => setPawapayOperator(e.target.value)}
              >
                {PAWAPAY_OPERATORS.map((op) => (
                  <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                ))}
              </TextField>
            )}

            {isPawapay && pawapayOperator === "orange" && (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Composez le service USSD Orange Money sur votre téléphone, demandez un
                  code temporaire avec votre code secret Orange Money, puis saisissez ce
                  code ci-dessous avant de cliquer sur « Payer ».
                </Alert>
                <TextField
                  fullWidth label="Code OTP Orange Money" sx={{ mb: 2 }}
                  value={pawapayOtp} onChange={(e) => setPawapayOtp(e.target.value)}
                />
              </>
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

        {result?.ussd_code && status === "pending" && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Composez <b>{result.ussd_code}</b> sur votre téléphone pour valider le paiement (référence {result.reference}).
          </Alert>
        )}
        {result?.payment_url && status === "pending" && (
          <Alert severity="success" sx={{ mt: 1 }}>
            <Button href={result.payment_url} target="_blank" rel="noreferrer">
              Ouvrir la page de paiement
            </Button>
          </Alert>
        )}

        {/* Statut réel de la transaction, obtenu par sondage — l'ancien
            message "Commission réglée" s'affichait dès l'envoi du push USSD,
            avant toute confirmation effective du client. */}
        {status === "pending" && (
          <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mt: 2 }}>
            En attente de votre confirmation sur votre téléphone (référence {result?.reference})…
            Ne fermez pas cette fenêtre.
          </Alert>
        )}
        {status === "succeeded" && purpose === "commission" && (
          <Alert severity="success" sx={{ mt: 2 }}>
            ✓ Commission ImmoBF réglée. Le paiement du séjour/loyer se fait directement
            avec le propriétaire, en mobile money, au numéro affiché sur l'annonce
            ({property?.owner_phone || property?.owner_whatsapp || "—"}). Un reçu vous a été envoyé par email.
          </Alert>
        )}
        {status === "succeeded" && purpose !== "commission" && (
          <Alert severity="success" sx={{ mt: 2 }}>✓ Paiement confirmé. Un reçu vous a été envoyé par email.</Alert>
        )}
        {status === "failed" && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Le paiement a échoué ou a été annulé sur votre téléphone.{" "}
            <Button size="small" onClick={handleRetry}>Réessayer</Button>
          </Alert>
        )}
        {status === "timeout" && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Nous n'avons pas reçu de confirmation après quelques minutes. Si vous avez
            validé le paiement sur votre téléphone, vérifiez « Mon compte » dans
            quelques instants — il peut arriver en retard. Sinon, vous pouvez réessayer.{" "}
            <Button size="small" onClick={handleRetry}>Réessayer</Button>
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {loading && <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}><CircularProgress /></Box>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        {providers.length > 0 && status !== "succeeded" && (
          <Button
            onClick={handleSubmit} variant="contained"
            disabled={loading || status === "pending" || !phone || !provider || otpMissing}
          >
            {status === "pending" ? "En attente…" : `Payer ${formatFCFA(amount)}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
