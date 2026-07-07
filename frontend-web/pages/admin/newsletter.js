import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Box, Typography, Button, TextField, MenuItem, Alert, CircularProgress,
  Paper, Divider, Chip,
} from "@mui/material";
import AdminLayout from "../../components/AdminLayout";
import { Admin } from "../../lib/api";

const AFRICAN_COUNTRIES = [
  { code: "", label: "Tous les pays (Africa)" },
  { code: "BF", label: "🇧🇫 Burkina Faso" },
  { code: "CI", label: "🇨🇮 Côte d'Ivoire" },
  { code: "SN", label: "🇸🇳 Sénégal" },
  { code: "ML", label: "🇲🇱 Mali" },
  { code: "TG", label: "🇹🇬 Togo" },
  { code: "BJ", label: "🇧🇯 Bénin" },
  { code: "NE", label: "🇳🇪 Niger" },
  { code: "GN", label: "🇬🇳 Guinée" },
  { code: "GH", label: "🇬🇭 Ghana" },
  { code: "NG", label: "🇳🇬 Nigeria" },
  { code: "CM", label: "🇨🇲 Cameroun" },
  { code: "MA", label: "🇲🇦 Maroc" },
  { code: "SN", label: "🇸🇳 Sénégal" },
];

export default function NewsletterPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSend(e) {
    e.preventDefault();
    if (!subject.trim() || !html.trim()) {
      setError("Objet et contenu HTML sont obligatoires.");
      return;
    }
    if (!window.confirm(`Envoyer cette newsletter à ${country ? `tous les utilisateurs en ${country}` : "tous les utilisateurs Africa"} ?`)) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await Admin.sendNewsletter({ subject, html, country_code: country || null });
      setResult(r);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout title="Newsletter — Admin ImmoBF">
      <Paper elevation={1} sx={{ p: 3, maxWidth: 700, borderRadius: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Envoie un email en masse à tous les utilisateurs ayant un email enregistré, avec filtre optionnel par pays.
          Maximum 500 destinataires par envoi (limite Resend).
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box component="form" onSubmit={handleSend} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField
            select label="Ciblage géographique" value={country}
            onChange={(e) => setCountry(e.target.value)} size="small"
          >
            {AFRICAN_COUNTRIES.map((c) => (
              <MenuItem key={c.code} value={c.code}>{c.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Objet (Subject)" value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required size="small"
            placeholder="Nouveautés ImmoBF Africa — Juillet 2026"
          />

          <TextField
            label="Contenu HTML" value={html}
            onChange={(e) => setHtml(e.target.value)}
            multiline rows={10} required size="small"
            placeholder={"<h2>Bonjour !</h2>\n<p>Voici les nouveautés de la semaine...</p>"}
            helperText="Entrez du HTML valide. Les emails sont envoyés via Resend (from: no-reply@immoafrica.online)."
          />

          {html && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>APERÇU :</Typography>
              <Box
                sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2, mt: 0.5, bgcolor: "#fafafa" }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}
          {result && (
            <Alert severity="success">
              ✅ Newsletter envoyée à <strong>{result.sent}</strong> destinataire{result.sent > 1 ? "s" : ""}.
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Button type="submit" variant="contained" disabled={busy} sx={{ minWidth: 160 }}>
              {busy ? <CircularProgress size={20} color="inherit" /> : "📤 Envoyer la newsletter"}
            </Button>
            {country && <Chip label={`Pays : ${country}`} size="small" color="primary" onDelete={() => setCountry("")} />}
          </Box>
        </Box>
      </Paper>
    </AdminLayout>
  );
}
