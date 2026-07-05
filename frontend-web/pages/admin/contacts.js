import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, TablePagination, Chip, TextField, MenuItem, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Tooltip, Grid,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Layout from "../../components/Layout";
import { Admin } from "../../lib/api";

const FLAG = (code) =>
  code ? code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(c.codePointAt(0) + 127397)) : "🌍";

const LANGUAGES = [
  { value: "", label: "Toutes les langues" },
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "Arabe" },
  { value: "sw", label: "Swahili" },
];

const ACTIVITY_OPTIONS = [
  { value: "",      label: "Toutes les dates" },
  { value: "today", label: "Aujourd'hui" },
  { value: "7d",    label: "7 derniers jours" },
  { value: "30d",   label: "30 derniers jours" },
  { value: "old",   label: "Plus de 30 jours" },
];

function prefSummary(p = {}) {
  const parts = [];
  if (p.types?.length)  parts.push(p.types.join(", "));
  if (p.cities?.length) parts.push(p.cities.join(", "));
  if (p.budget_max)     parts.push(`≤${Number(p.budget_max).toLocaleString()} FCFA`);
  return parts.join(" · ") || "—";
}

export default function AdminContacts() {
  const router = useRouter();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(0);
  const rowsPerPage             = 50;

  // Filtres
  const [filterCountry,  setFilterCountry]  = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [filterPref,     setFilterPref]     = useState("");
  const [filterType,     setFilterType]     = useState("");   // "" | "registered" | "guest"
  const [filterActivity, setFilterActivity] = useState("");  // "" | "today" | "7d" | "30d" | "old"

  // Newsletter dialog
  const [nlOpen,    setNlOpen]    = useState(false);
  const [nlSubject, setNlSubject] = useState("");
  const [nlBody,    setNlBody]    = useState("");
  const [nlSending, setNlSending] = useState(false);
  const [nlResult,  setNlResult]  = useState(null);
  const [nlError,   setNlError]   = useState(null);

  useEffect(() => { load(); }, []); // eslint-disable-line

  async function load() {
    setLoading(true);
    try {
      const d = await Admin.contacts({ limit: 2000, offset: 0 });
      setContacts(d.contacts || []);
    } catch (_) {}
    finally { setLoading(false); }
  }

  // ─── Filtrage client-side ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const now  = new Date();
    const sod  = new Date(now); sod.setHours(0,0,0,0);
    const d7   = new Date(now - 7  * 86400000);
    const d30  = new Date(now - 30 * 86400000);

    return contacts.filter((c) => {
      if (filterCountry  && (c.country  || "").toUpperCase() !== filterCountry.toUpperCase()) return false;
      if (filterLanguage && (c.language || "fr") !== filterLanguage) return false;
      if (filterPref) {
        const q = filterPref.toLowerCase();
        if (!prefSummary(c.preferences).toLowerCase().includes(q)) return false;
      }
      if (filterType === "registered" && !c.user_id) return false;
      if (filterType === "guest"      &&  c.user_id) return false;
      if (filterActivity) {
        const ls = new Date(c.last_seen);
        if (filterActivity === "today" && ls < sod) return false;
        if (filterActivity === "7d"  && ls < d7)   return false;
        if (filterActivity === "30d" && ls < d30)  return false;
        if (filterActivity === "old" && ls >= d30)  return false;
      }
      return true;
    });
  }, [contacts, filterCountry, filterLanguage, filterPref, filterType, filterActivity]);

  // Pays uniques pour le dropdown
  const uniqueCountries = useMemo(
    () => [...new Set(contacts.map((c) => c.country).filter(Boolean))].sort(),
    [contacts]
  );

  const anyFilter = filterCountry || filterLanguage || filterPref || filterType || filterActivity;
  function resetFilters() {
    setFilterCountry(""); setFilterLanguage(""); setFilterPref("");
    setFilterType(""); setFilterActivity(""); setPage(0);
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

  const paged = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* En-tête */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push("/admin")}>
              Tableau de bord
            </Button>
            <Typography variant="h5">
              📋 Base de contacts ({filtered.length}{filtered.length !== contacts.length ? `/${contacts.length}` : ""})
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<SendIcon />}
            onClick={() => { setNlOpen(true); setNlResult(null); setNlError(null); }}>
            Envoyer une newsletter
          </Button>
        </Box>

        {/* Barre de filtres */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: "#f8f9fa", border: "1px solid #e0e0e0", borderRadius: 2 }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={6} sm={4} md={2}>
              <TextField select fullWidth size="small" label="Pays"
                value={filterCountry} onChange={(e) => { setFilterCountry(e.target.value); setPage(0); }}>
                <MenuItem value="">Tous les pays</MenuItem>
                {uniqueCountries.map((c) => (
                  <MenuItem key={c} value={c}>{FLAG(c)} {c}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField select fullWidth size="small" label="Langue"
                value={filterLanguage} onChange={(e) => { setFilterLanguage(e.target.value); setPage(0); }}>
                {LANGUAGES.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField select fullWidth size="small" label="Type"
                value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(0); }}>
                <MenuItem value="">Tous les types</MenuItem>
                <MenuItem value="registered">Inscrit</MenuItem>
                <MenuItem value="guest">Invité</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <TextField fullWidth size="small" label="Préférences"
                placeholder="maison, Ouaga, 500000…"
                value={filterPref} onChange={(e) => { setFilterPref(e.target.value); setPage(0); }} />
            </Grid>
            <Grid item xs={6} sm={4} md={3}>
              <TextField select fullWidth size="small" label="Dernière activité"
                value={filterActivity} onChange={(e) => { setFilterActivity(e.target.value); setPage(0); }}>
                {ACTIVITY_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
          {anyFilter && (
            <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <Button size="small" variant="text" onClick={resetFilters}>✕ Réinitialiser</Button>
              <Typography variant="caption" color="text.secondary">
                {filtered.length} / {contacts.length} contact(s)
              </Typography>
            </Box>
          )}
        </Paper>

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
                {paged.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      Aucun contact pour ces filtres.
                    </TableCell>
                  </TableRow>
                )}
                {paged.map((c) => (
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
                        : <Chip label="Invité"  size="small" color="warning" />}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary", fontSize: 12, whiteSpace: "nowrap" }}>
                      {new Date(c.last_seen).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[rowsPerPage]}
              onPageChange={(_, p) => setPage(p)}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
            />
          </Paper>
        )}
      </Box>

      {/* Dialog newsletter */}
      <Dialog open={nlOpen} onClose={() => setNlOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📧 Newsletter</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {filterCountry  && <Chip label={`Pays : ${filterCountry}`}  size="small" />}
            {filterLanguage && <Chip label={`Langue : ${filterLanguage}`} size="small" />}
            {filterType     && <Chip label={filterType === "registered" ? "Inscrits" : "Invités"} size="small" />}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Envoi aux contacts correspondant aux filtres Pays / Langue actifs ({filtered.length} affiché(s)).
            Les filtres Préférences, Type et Activité ne sont pas transmis au serveur.
          </Typography>
          <TextField fullWidth label="Objet" sx={{ mb: 2 }}
            value={nlSubject} onChange={(e) => setNlSubject(e.target.value)} />
          <TextField fullWidth multiline rows={8}
            label="Corps du message (HTML ou texte)"
            placeholder={"Bonjour,\n\nNous avons de nouvelles annonces..."}
            value={nlBody} onChange={(e) => setNlBody(e.target.value)} />
          {nlResult !== null && <Alert severity="success" sx={{ mt: 2 }}>✓ {nlResult} email(s) envoyé(s).</Alert>}
          {nlError            && <Alert severity="error"   sx={{ mt: 2 }}>{nlError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNlOpen(false)}>Annuler</Button>
          <Button variant="contained"
            startIcon={nlSending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            disabled={nlSending || !nlSubject || !nlBody}
            onClick={handleSendNewsletter}>
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
