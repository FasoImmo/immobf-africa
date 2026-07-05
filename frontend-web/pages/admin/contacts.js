import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TablePagination, Chip, TextField, MenuItem, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Tooltip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Layout from "../../components/Layout";
import { Admin } from "../../lib/api";

// Drapeaux par code pays ISO-2
const FLAG = (code) =>
  code
    ? code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(c.codePointAt(0) + 127397))
    : "🌍";

const LANGUAGES = [
  { value: "", label: "Toutes les langues" },
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "Arabe" },
  { value: "sw", label: "Swahili" },
];

export default function AdminContacts() {
  const router = useRouter();
  const [contacts, setContacts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(0);
  const [rowsPerPage]           = useState(50);

  // Filtres
  const [filterCountry, setFilterCountry]   = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");

  // Newsletter dialog
  const [nlOpen, setNlOpen]       = useState(false);
  const [nlSubject, setNlSubject] = useState("");
  const [nlBody, setNlBody]       = useState("");
  const [nlSending, setNlSending] = useState(false);
  const [nlResult, setNlResult]   = useState(null);
  const [nlError, setNlError]     = useState(null);

  useEffect(() => {
    load();
  }, [page, filterCountry, filterLanguage]); // eslint-disable-line

  async function load() {
    setLoading(true);
    try {
      const params = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        ...(filterCountry  ? { country: filterCountry }   : {}),
        ...(filterLanguage ? { language: filterLanguage } : {}),
      };
      const d = await Admin.contacts(params);
      setContacts(d.contacts || []);
      setTotal(d.total || 0);
    } catch (_) {}
    finally { setLoading(false); }
  }

  async function handleSendNewsletter() {
    if (!nlSubject || !nlBody) return;
    setNlSending(true); setNlResult(null); setNlError(null);
    try {
      const d = await Admin.sendContactNewsletter({
        subject: nlSubject,
        html: nlBody.replace(/\n/g, "<br/>"),
        country:  filterCountry  || undefined,
        language: filterLanguage || undefined,
      });
      setNlResult(d.sent);
    } catch (e) {
      setNlError(e?.response?.data?.error?.message || e.message);
    } finally { setNlSending(false); }
  }

  // Preferences summary
  function prefSummary(p = {}) {
    const parts = [];
    if (p.types?.length)   parts.push(p.types.join(", "));
    if (p.cities?.length)  parts.push(p.cities.join(", "));
    if (p.budget_max)      parts.push(`≤${p.budget_max.toLocaleString()} FCFA`);
    return parts.join(" · ") || "—";
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push("/admin")}>
              Tableau de bord
            </Button>
            <Typography variant="h5">📋 Base de contacts ({total.toLocaleString()})</Typography>
          </Box>
          <Button
            variant="contained" startIcon={<SendIcon />}
            onClick={() => { setNlOpen(true); setNlResult(null); setNlError(null); }}
          >
            Envoyer une newsletter
          </Button>
        </Box>

        {/* Filtres */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <TextField
            label="Pays (ISO-2)" size="small" sx={{ width: 160 }}
            placeholder="BF, CI, SN…"
            value={filterCountry} onChange={(e) => { setFilterCountry(e.target.value.toUpperCase()); setPage(0); }}
          />
          <TextField
            select label="Langue" size="small" sx={{ width: 200 }}
            value={filterLanguage} onChange={(e) => { setFilterLanguage(e.target.value); setPage(0); }}
          >
            {LANGUAGES.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
          </TextField>
          <Button variant="outlined" size="small" onClick={() => { setFilterCountry(""); setFilterLanguage(""); setPage(0); }}>
            Réinitialiser
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}><CircularProgress /></Box>
        ) : (
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell>Email</TableCell>
                  <TableCell>Téléphone</TableCell>
                  <TableCell>Nom</TableCell>
                  <TableCell>Pays</TableCell>
                  <TableCell>Langue</TableCell>
                  <TableCell align="center">Visites</TableCell>
                  <TableCell>Préférences</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Dernière activité</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      Aucun contact pour ces filtres.
                    </TableCell>
                  </TableRow>
                )}
                {contacts.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{c.email}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{c.phone || "—"}</TableCell>
                    <TableCell>{c.name || "—"}</TableCell>
                    <TableCell>
                      {c.country
                        ? <Tooltip title={c.country}><span>{FLAG(c.country)} {c.country}</span></Tooltip>
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Chip label={c.language || "fr"} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={c.visit_count} size="small" color={c.visit_count >= 3 ? "success" : "default"} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: "text.secondary", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <Tooltip title={prefSummary(c.preferences)}>
                        <span>{prefSummary(c.preferences)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {c.user_id
                        ? <Chip label="Inscrit" size="small" color="primary" />
                        : <Chip label="Invité" size="small" color="warning" />}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary", fontSize: 12 }}>
                      {new Date(c.last_seen).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[rowsPerPage]}
              onPageChange={(_, p) => setPage(p)}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
            />
          </Paper>
        )}
      </Box>

      {/* ─── Dialog newsletter ─────────────────────────────────────────────── */}
      <Dialog open={nlOpen} onClose={() => setNlOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📧 Newsletter — {total.toLocaleString()} destinataire(s)</DialogTitle>
        <DialogContent>
          {filterCountry  && <Chip label={`Pays : ${filterCountry}`}  size="small" sx={{ mr: 1, mb: 1 }} />}
          {filterLanguage && <Chip label={`Langue : ${filterLanguage}`} size="small" sx={{ mb: 1 }} />}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Seuls les contacts correspondant aux filtres actifs recevront l'email.
          </Typography>
          <TextField
            fullWidth label="Objet" sx={{ mb: 2 }}
            value={nlSubject} onChange={(e) => setNlSubject(e.target.value)}
          />
          <TextField
            fullWidth multiline rows={8}
            label="Corps du message (HTML ou texte)"
            placeholder="Bonjour,&#10;&#10;Nous avons de nouvelles annonces qui correspondent à vos préférences..."
            value={nlBody} onChange={(e) => setNlBody(e.target.value)}
          />
          {nlResult !== null && (
            <Alert severity="success" sx={{ mt: 2 }}>✓ {nlResult} email(s) envoyé(s).</Alert>
          )}
          {nlError && <Alert severity="error" sx={{ mt: 2 }}>{nlError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNlOpen(false)}>Annuler</Button>
          <Button
            variant="contained" startIcon={nlSending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            disabled={nlSending || !nlSubject || !nlBody}
            onClick={handleSendNewsletter}
          >
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
