import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Button, TextField, MenuItem, Alert, CircularProgress,
  Paper, Divider, Chip, Tabs, Tab, IconButton, Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
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
];

export default function NewsletterPage() {
  const [tab, setTab]             = useState(0); // 0=FR, 1=EN
  const [subjectFr, setSubjectFr] = useState("");
  const [htmlFr, setHtmlFr]       = useState("");
  const [subjectEn, setSubjectEn] = useState("");
  const [htmlEn, setHtmlEn]       = useState("");
  const [country, setCountry]     = useState("");
  const [busy, setBusy]           = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [draftInfo, setDraftInfo] = useState(null);   // { saved_at, hasDraft }
  const [draftLoading, setDraftLoading] = useState(false);

  const isFr = tab === 0;
  const subject = isFr ? subjectFr : subjectEn;
  const html    = isFr ? htmlFr    : htmlEn;
  const setSubject = isFr ? setSubjectFr : setSubjectEn;
  const setHtml    = isFr ? setHtmlFr    : setHtmlEn;

  const loadDraft = useCallback(async () => {
    setDraftLoading(true);
    try {
      const d = await Admin.getNewsletterDraft();
      if (d.hasDraft) {
        if (d.subject_fr) setSubjectFr(d.subject_fr);
        if (d.html_fr)    setHtmlFr(d.html_fr);
        if (d.subject_en) setSubjectEn(d.subject_en);
        if (d.html_en)    setHtmlEn(d.html_en);
        setDraftInfo({ saved_at: d.saved_at, hasDraft: true });
      } else {
        setDraftInfo({ hasDraft: false });
      }
    } catch (_) {
      // Draft non disponible, formulaire vide
    } finally {
      setDraftLoading(false);
    }
  }, []);

  useEffect(() => { loadDraft(); }, [loadDraft]);

  async function handleSend(e) {
    e.preventDefault();
    if (!subject.trim() || !html.trim()) {
      setError("Objet et contenu HTML sont obligatoires.");
      return;
    }
    const lang = isFr ? "FR" : "EN";
    const target = country
      ? `tous les utilisateurs en ${country} (${lang})`
      : `tous les utilisateurs Africa (${lang})`;
    if (!window.confirm(`Envoyer cette newsletter à ${target} ?`)) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await Admin.sendNewsletter({
        subject,
        html,
        country_code: country || null,
      });
      setResult(r);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <AdminLayout title="Newsletter — Admin ImmoBF">
      <Paper elevation={1} sx={{ p: 3, maxWidth: 760, borderRadius: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h6" fontWeight={700}>📧 Newsletter</Typography>
          <Tooltip title="Recharger le brouillon auto">
            <span>
              <IconButton size="small" onClick={loadDraft} disabled={draftLoading}>
                {draftLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {draftInfo?.hasDraft && draftInfo.saved_at && (
          <Alert severity="info" sx={{ mb: 2 }}>
            📋 Brouillon automatique chargé — généré le <strong>{fmtDate(draftInfo.saved_at)}</strong>.
            Vérifiez et personnalisez avant d&apos;envoyer.
          </Alert>
        )}
        {draftInfo && !draftInfo.hasDraft && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Aucun brouillon automatique disponible. Le brouillon est généré chaque lundi par la tâche planifiée.
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Envoi en masse à tous les utilisateurs avec email enregistré. Maximum 500 destinataires par envoi (limite Resend).
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {/* Onglets FR / EN */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label="🇫🇷 Français" />
          <Tab label="🇬🇧 English" />
        </Tabs>

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
            label={isFr ? "Objet (FR)" : "Subject (EN)"} value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required size="small"
            placeholder={isFr ? "Nouveautés ImmoBF Africa — Juillet 2026" : "ImmoBF Africa News — July 2026"}
          />

          <TextField
            label={isFr ? "Contenu HTML (FR)" : "HTML Content (EN)"} value={html}
            onChange={(e) => setHtml(e.target.value)}
            multiline rows={12} required size="small"
            placeholder={isFr
              ? "<h2>Bonjour !</h2>\n<p>Voici les nouveautés de la semaine...</p>"
              : "<h2>Hello!</h2>\n<p>Here are this week's highlights...</p>"
            }
            helperText="HTML valide — envoyé via Resend (from: no-reply@immoafrica.online)."
          />

          {html && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                APERÇU ({isFr ? "FR" : "EN"}) :
              </Typography>
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

          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <Button type="submit" variant="contained" disabled={busy} sx={{ minWidth: 200 }}>
              {busy
                ? <CircularProgress size={20} color="inherit" />
                : `📤 Envoyer (${isFr ? "FR" : "EN"})`
              }
            </Button>
            {country && (
              <Chip label={`Pays : ${country}`} size="small" color="primary" onDelete={() => setCountry("")} />
            )}
          </Box>
        </Box>
      </Paper>
    </AdminLayout>
  );
}
