import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, MenuItem, TextField, Alert, CircularProgress, Box, Typography, Chip
} from "@mui/material";
import { Payments } from "../lib/api";
import { formatFCFA } from "../lib/format";
import { AFRICAN_COUNTRIES } from "../lib/africanCountries";
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
  pawapay: { label: "PawaPay (Mobile Money)" },
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

export default function PaymentDialog({ open, onClose, onSuccess, property, amount, purpose = "deposit", bookingUnits, checkIn }) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState([]);
  // CORRECTIF (30/06/2026) : avant, on interrogeait toujours les fournisseurs
  // disponibles pour le pays de l'ANNONCE (property.country_code) — or
  // l'acheteur peut résider/payer depuis un autre pays africain. L'acheteur
  // choisit maintenant lui-même son pays ; on récupère ensuite les
  // fournisseurs (et donc les moyens de paiement, ex. PawaPay/Orange/Moov)
  // réellement disponibles pour CE pays.
  const [buyerCountry, setBuyerCountry] = useState(property?.country_code || "BF");
  const [provider, setProvider] = useState("");
  const [preferredOperator, setPreferredOperator] = useState("");
  // PawaPay : opérateurs disponibles (fournis par le backend selon le pays)
  // et opérateur sélectionné + OTP si PREAUTH requis.
  const [pawapayOperators, setPawapayOperators] = useState([]);
  const [pawapayOperator, setPawapayOperator] = useState("");
  const [pawapayOtp, setPawapayOtp] = useState("");
  const [phone, setPhone] = useState("");
  // Pré-rempli depuis le compte connecté — l'utilisateur peut modifier.
  // Évite les reçus perdus quand le champ est laissé vide (bug historique).
  const [email, setEmail] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("immobf_user") || "{}");
      return u.email || "";
    } catch { return ""; }
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  // Vrai si l'utilisateur n'est pas connecté (paiement invité)
  const [isGuest, setIsGuest] = useState(false);
  // Email réellement utilisé lors de la soumission du paiement (capturé au
  // moment de l'appel, pas relu depuis `email` après coup). Sert à ne plus
  // afficher "un reçu vous a été envoyé par email" quand aucun email n'a en
  // réalité été fourni — voir CORRECTIF ci-dessous (bug reçu de paiement
  // jamais reçu alors que les alertes d'expiration, elles, arrivent bien :
  // ces dernières ne sont envoyées qu'aux comptes ayant déjà un email en
  // base, donc l'absence d'email y est invisible, contrairement au paiement
  // où le message de succès affirmait à tort qu'un email avait été envoyé).
  const [submittedEmail, setSubmittedEmail] = useState("");
  // Statut réel de la transaction, obtenu en interrogeant le backend après
  // l'initiation — sans ça, le dialog affichait "Commission réglée" dès que
  // l'appel d'initiation répondait (souvent un simple push USSD en attente),
  // sans jamais vérifier si le client avait effectivement payé, et sans
  // jamais s'arrêter si la confirmation n'arrivait pas.
  // null | "pending" | "succeeded" | "failed" | "timeout"
  const [status, setStatus] = useState(null);
  const pollRef = useRef(null);
  const pollAttemptsRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 60; // ~3 minutes à 3s d'intervalle

  // Notifie le parent dès que le paiement commission est confirmé (WhatsApp unlock)
  useEffect(() => {
    if (status === "succeeded" && purpose === "commission" && onSuccess) {
      onSuccess();
    }
  }, [status]); // eslint-disable-line

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
    }, 3000);
  }

  // Coupe le sondage si le dialog se ferme ou si le composant disparaît —
  // sinon le polling continuait indéfiniment en arrière-plan.
  useEffect(() => {
    if (!open) stopPolling();
    return stopPolling;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setBuyerCountry(property?.country_code || "BF");
    // Rafraîchit l'email et détecte si l'utilisateur est invité.
    try {
      const token = localStorage.getItem("immobf_token");
      const u = JSON.parse(localStorage.getItem("immobf_user") || "{}");
      setIsGuest(!token || !u.id);
      if (u.email && !email) setEmail(u.email);
    } catch { setIsGuest(true); }
  }, [open, property]); // eslint-disable-line

  useEffect(() => {
    if (!open || !buyerCountry) return;
    setPawapayOtp("");
    Payments.providers(buyerCountry).then((d) => {
      setProviders(d.providers);
      // Sélectionne CinetPay par défaut s'il est dispo, sinon Orange Money BF,
      // sinon PawaPay, sinon Wave, sinon Flutterwave, sinon FedaPay, sinon premier provider.
      const cp  = d.providers.find((p) => p.name === "cinetpay");
      const om  = d.providers.find((p) => p.name === "orange_money_bf");
      const pp  = d.providers.find((p) => p.name === "pawapay");
      const wv  = d.providers.find((p) => p.name === "wave");
      const flw = d.providers.find((p) => p.name === "flutterwave");
      const fp  = d.providers.find((p) => p.name === "fedapay");
      setProvider(
        cp ? "cinetpay" : om ? "orange_money_bf" : pp ? "pawapay" : wv ? "wave" : flw ? "flutterwave" : fp ? "fedapay" : d.providers[0]?.name || ""
      );
      // Pré-charger les opérateurs PawaPay pour ce pays
      if (pp?.operators?.length) {
        setPawapayOperators(pp.operators);
        // Sélectionner le premier opérateur PROVIDER_AUTH par défaut (pas PREAUTH)
        const defaultOp = pp.operators.find((o) => !o.requiresOtp) || pp.operators[0];
        setPawapayOperator(defaultOp?.value || "");
      } else {
        setPawapayOperators([]);
        setPawapayOperator("");
      }
    });
  }, [open, buyerCountry]);

  async function handleSubmit() {
    // Email obligatoire pour les invités
    if (isGuest && !email?.includes("@")) {
      setError("Veuillez saisir votre email pour recevoir le reçu de paiement.");
      return;
    }
    setLoading(true); setError(null); setResult(null); setStatus(null);
    stopPolling();
    // Fige la valeur au moment de l'envoi : c'est cette valeur (et non
    // `email`, qui pourrait continuer à changer) qui détermine si un reçu
    // pourra effectivement être envoyé.
    setSubmittedEmail(email || "");
    try {
      const res = await Payments.initiate({
        provider,
        amount,
        currency: property?.currency || "XOF",
        property_id: property?.id,
        purpose,
        customer_phone: phone,
        customer_email: email || undefined,
        country_code: buyerCountry || "BF",
        preferred_operator:
          provider === "fedapay" ? preferredOperator || undefined :
          provider === "pawapay" ? pawapayOperator || undefined :
          undefined,
        // OTP requis si l'opérateur sélectionné est en mode PREAUTH
        pawapay_otp: provider === "pawapay" && pawapayOperators.find((o) => o.value === pawapayOperator)?.requiresOtp
          ? pawapayOtp || undefined
          : undefined,
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
  const selectedPpOp = pawapayOperators.find((o) => o.value === pawapayOperator);
  const otpMissing = isPawapay && selectedPpOp?.requiresOtp && !pawapayOtp;
  // Email recommandé pour le reçu, quel que soit le fournisseur.
  const showEmail = true;
  // CORRECTIF (30/06/2026) : le champ affichait "+226…" en dur, ce qui
  // laissait penser que seul le Burkina Faso était accepté — il n'y a en
  // réalité aucune restriction côté backend (Joi.string().required(), sans
  // contrainte de pays). On affiche maintenant l'indicatif du pays choisi
  // par l'acheteur (buyerCountry) à titre indicatif seulement.
  const dialCode = AFRICAN_COUNTRIES.find((c) => c.code === buyerCountry)?.dial || "+226";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("payment.choose_provider")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {property?.title} — <b>{formatFCFA(amount)}</b>
        </Typography>

        {isGuest && (
          <Alert severity="info" sx={{ mb: 2 }}>
            🔓 <strong>Paiement sans compte</strong> — aucune inscription requise.
            Saisissez votre email ci-dessous pour recevoir votre reçu.
          </Alert>
        )}

        <TextField
          select fullWidth label="Votre pays (pour les moyens de paiement disponibles)" sx={{ mb: 2 }}
          value={buyerCountry} onChange={(e) => setBuyerCountry(e.target.value)}
        >
          {AFRICAN_COUNTRIES.map((c) => (
            <MenuItem key={c.code} value={c.code}>{c.flag} {c.name} ({c.dial})</MenuItem>
          ))}
        </TextField>

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

            {isPawapay && pawapayOperators.length > 0 && (
              <TextField
                select fullWidth label="Opérateur mobile money" sx={{ mb: 2 }}
                value={pawapayOperator} onChange={(e) => { setPawapayOperator(e.target.value); setPawapayOtp(""); }}
              >
                {pawapayOperators.map((op) => (
                  <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                ))}
              </TextField>
            )}

            {isPawapay && selectedPpOp?.requiresOtp && (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Composez le code USSD de votre opérateur, entrez votre code secret
                  pour générer un code OTP temporaire, puis saisissez-le ci-dessous.
                </Alert>
                <TextField
                  fullWidth label="Code OTP" sx={{ mb: 2 }}
                  value={pawapayOtp} onChange={(e) => setPawapayOtp(e.target.value)}
                />
              </>
            )}

            <TextField
              fullWidth
              label={`Numéro mobile money (${dialCode}…)`}
              helperText="Plateforme ouverte à toute l'Afrique : utilisez l'indicatif de votre pays, même différent de celui de l'annonce."
              value={phone} onChange={(e) => setPhone(e.target.value)} sx={{ mb: 2 }}
            />

            {showEmail && (
              <TextField
                fullWidth
                label={isGuest ? "Email (requis pour votre reçu)" : "Email (recommandé pour le reçu)"}
                type="email"
                required={isGuest}
                error={isGuest && !email}
                helperText={isGuest && !email ? "Requis pour les paiements sans compte" : ""}
                value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }}
              />
            )}

            {/* CORRECTIF (30/06/2026) : rappel visible avant paiement — la
                clause de non-remboursement (CGU, art. 6) était jusqu'ici
                invisible à l'écran de paiement lui-même. */}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              La commission ImmoBF n'est ni remboursable ni reversée une fois le paiement confirmé
              (sauf erreur manifeste signalée sous 24h) — voir les{" "}
              <a href="/legal/cgu" target="_blank" rel="noreferrer">CGU, art. 6</a>.
            </Typography>
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
            {isPawapay && selectedPpOp && !selectedPpOp.requiresOtp
              ? <>
                  Une notification a été envoyée sur votre téléphone Moov/MTN/Wave.
                  <strong> Ouvrez l&apos;application de votre opérateur et validez le paiement.</strong>
                  <br/>En attente de confirmation… (réf. {result?.reference})
                </>
              : <>
                  En attente de votre confirmation sur votre téléphone (réf. {result?.reference})…
                  Ne fermez pas cette fenêtre.
                </>
            }
          </Alert>
        )}
        {status === "succeeded" && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success">
              {purpose === "commission"
                ? "✓ Commission ImmoBF réglée. Contactez maintenant l'annonceur pour finaliser votre réservation."
                : "✓ Paiement confirmé."
              }
              {/* CORRECTIF : n'affirmer l'envoi d'un reçu que si un email a
                  réellement été fourni au moment du paiement — avant ce
                  correctif, ce message s'affichait toujours, même quand le
                  champ email était vide et qu'aucun email n'existait sur le
                  compte, ce qui faisait croire à tort qu'un reçu avait été
                  envoyé (voir services/email.js et paymentsController.js). */}
              {submittedEmail ? ` Un reçu a été envoyé à ${submittedEmail}.` : ""}
            </Alert>
            {!submittedEmail && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Aucun email renseigné : aucun reçu n'a pu être envoyé. Ajoutez un
                email dans « Mon compte » ou saisissez-le au moment du paiement
                pour recevoir vos justificatifs par email.
              </Alert>
            )}
            {/* Bouton WhatsApp vers l'annonceur — ou fallback messagerie */}
            {purpose === "commission" && (() => {
              const wa = property?.owner_whatsapp || property?.owner_phone;
              if (wa) {
                const clean = wa.replace(/\s+/g, "").replace(/^\+/, "");
                const msg = encodeURIComponent(
                  `Bonjour, je viens de régler la commission ImmoBF Africa pour votre annonce "${property?.title}". Je souhaite finaliser la réservation.`
                );
                return (
                  <Button
                    fullWidth
                    variant="contained"
                    href={`https://wa.me/${clean}?text=${msg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ mt: 2, bgcolor: "#25D366", "&:hover": { bgcolor: "#1ebe57" }, fontWeight: 700, fontSize: 15, py: 1.5 }}
                  >
                    💬 Contacter l'annonceur sur WhatsApp — {wa}
                  </Button>
                );
              }
              // L'annonceur n'a pas de WhatsApp — indiquer la messagerie interne
              return (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Cet annonceur n&apos;a pas de numéro WhatsApp renseigné.
                  Fermez cette fenêtre puis utilisez le bouton <strong>« Envoyer un message »</strong> sur la page pour le contacter via la messagerie ImmoBF.
                </Alert>
              );
            })()}
          </Box>
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
