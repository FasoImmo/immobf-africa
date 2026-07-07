import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, Typography, TextField, Button, Alert, CircularProgress,
  Divider, IconButton, InputAdornment,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import AdminLayout from "../../components/AdminLayout";
import { Admin } from "../../lib/api";

function Section({ title, children }) {
  return (
    <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>{title}</Typography>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Paper>
  );
}

export default function AdminProfile() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(null);
  const [user, setUser] = useState(null);

  // Password change
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdBusy, setPwdBusy] = useState(false);

  // Phone change
  const [phone, setPhone] = useState("");
  const [phoneMsg, setPhoneMsg] = useState(null);
  const [phoneBusy, setPhoneBusy] = useState(false);

  // Email change
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState(null);
  const [emailBusy, setEmailBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("immobf_token");
    if (!token) { router.replace("/login?redirect=/admin/profile"); return; }
    let u = null;
    try { u = JSON.parse(localStorage.getItem("immobf_user") || "null"); } catch (_) {}
    if (!u || u.role !== "admin") { setAuthorized(false); return; }
    setAuthorized(true);
    setUser(u);
    setPhone(u.phone || "");
    setEmail(u.email || "");
  }, []); // eslint-disable-line

  async function savePassword(e) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: "error", text: "Les mots de passe ne correspondent pas." });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({ type: "error", text: "Le nouveau mot de passe doit faire au moins 8 caractères." });
      return;
    }
    if (!currentPwd) {
      setPwdMsg({ type: "error", text: "Veuillez saisir le mot de passe actuel." });
      return;
    }
    setPwdBusy(true);
    try {
      await Admin.updateProfile({ current_password: currentPwd, new_password: newPwd });
      setPwdMsg({ type: "success", text: "Mot de passe mis à jour." });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      const msg = err?.response?.data?.error?.message || "Erreur lors du changement de mot de passe.";
      setPwdMsg({ type: "error", text: msg });
    } finally {
      setPwdBusy(false);
    }
  }

  async function savePhone(e) {
    e.preventDefault();
    setPhoneMsg(null);
    if (!phone || phone.length < 8) {
      setPhoneMsg({ type: "error", text: "Numéro de téléphone invalide." });
      return;
    }
    setPhoneBusy(true);
    try {
      const { user: updated } = await Admin.updateProfile({ phone });
      setUser(updated);
      localStorage.setItem("immobf_user", JSON.stringify(updated));
      setPhoneMsg({ type: "success", text: "Numéro de téléphone (login) mis à jour." });
    } catch (err) {
      const status = err?.response?.status;
      setPhoneMsg({
        type: "error",
        text: status === 409 ? "Ce numéro est déjà utilisé par un autre compte." : "Erreur lors de la mise à jour.",
      });
    } finally {
      setPhoneBusy(false);
    }
  }

  async function saveEmail(e) {
    e.preventDefault();
    setEmailMsg(null);
    if (!email || !email.includes("@")) {
      setEmailMsg({ type: "error", text: "Adresse email invalide." });
      return;
    }
    setEmailBusy(true);
    try {
      const { user: updated } = await Admin.updateProfile({ email });
      setUser(updated);
      localStorage.setItem("immobf_user", JSON.stringify(updated));
      setEmailMsg({ type: "success", text: "Email mis à jour." });
    } catch (err) {
      const status = err?.response?.status;
      setEmailMsg({
        type: "error",
        text: status === 409 ? "Cet email est déjà utilisé par un autre compte." : "Erreur lors de la mise à jour.",
      });
    } finally {
      setEmailBusy(false);
    }
  }

  if (authorized === null) {
    return (
      <AdminLayout title="Profil admin — ImmoBF">
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      </AdminLayout>
    );
  }
  if (authorized === false) {
    return (
      <AdminLayout title="Profil admin — ImmoBF">
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5">Accès refusé</Typography>
        </Paper>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Profil admin — ImmoBF">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Button variant="text" onClick={() => router.push("/admin")}>← Tableau de bord</Button>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>Profil administrateur</Typography>
      </Box>

      {user && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: "#f5f5f5", borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>{user.full_name || user.phone}</Typography>
          <Typography variant="body2" color="text.secondary">Login : {user.phone}</Typography>
          <Typography variant="body2" color="text.secondary">Email : {user.email || "Non renseigné"}</Typography>
          <Typography variant="body2" color="text.secondary">Rôle : {user.role}</Typography>
        </Paper>
      )}

      {/* ─── Changer le mot de passe ─────────────────────────────────────── */}
      <Section title="Changer le mot de passe">
        <Box component="form" onSubmit={savePassword} sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}>
          <TextField
            size="small" label="Mot de passe actuel" type={showPwd ? "text" : "password"}
            value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPwd((v) => !v)}>
                    {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            size="small" label="Nouveau mot de passe (min. 8 caractères)"
            type={showPwd ? "text" : "password"}
            value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required
          />
          <TextField
            size="small" label="Confirmer le nouveau mot de passe"
            type={showPwd ? "text" : "password"}
            value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required
          />
          {pwdMsg && <Alert severity={pwdMsg.type}>{pwdMsg.text}</Alert>}
          <Button type="submit" variant="contained" disabled={pwdBusy} sx={{ alignSelf: "flex-start" }}>
            {pwdBusy ? <CircularProgress size={18} color="inherit" /> : "Changer le mot de passe"}
          </Button>
        </Box>
      </Section>

      {/* ─── Changer le login (téléphone) ────────────────────────────────── */}
      <Section title="Changer le numéro de téléphone (login)">
        <Box component="form" onSubmit={savePhone} sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}>
          <TextField
            size="small" label="Nouveau numéro de téléphone" type="tel"
            value={phone} onChange={(e) => setPhone(e.target.value)} required
            placeholder="+22670000000"
          />
          {phoneMsg && <Alert severity={phoneMsg.type}>{phoneMsg.text}</Alert>}
          <Button type="submit" variant="contained" disabled={phoneBusy} sx={{ alignSelf: "flex-start" }}>
            {phoneBusy ? <CircularProgress size={18} color="inherit" /> : "Mettre à jour le téléphone"}
          </Button>
        </Box>
      </Section>

      {/* ─── Ajouter / changer l'email ───────────────────────────────────── */}
      <Section title="Adresse email">
        <Box component="form" onSubmit={saveEmail} sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}>
          <TextField
            size="small" label="Email" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)} required
            placeholder="admin@immobfafrica.com"
          />
          {emailMsg && <Alert severity={emailMsg.type}>{emailMsg.text}</Alert>}
          <Button type="submit" variant="contained" disabled={emailBusy} sx={{ alignSelf: "flex-start" }}>
            {emailBusy ? <CircularProgress size={18} color="inherit" /> : "Mettre à jour l'email"}
          </Button>
        </Box>
      </Section>

      {/* ─── Diagnostic email ────────────────────────────────────────────── */}
      <Section title="Diagnostic email (Resend)">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Envoie un email de test depuis Railway vers l'adresse de ton choix pour vérifier que Resend fonctionne.
        </Typography>
        <TestEmailPanel />
      </Section>
    </AdminLayout>
  );
}

function TestEmailPanel() {
  const [dest, setDest] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(e) {
    e.preventDefault();
    setBusy(true); setResult(null);
    try {
      const data = await Admin.testEmail(dest);
      setResult({ ok: data.ok, from: data.from, raw: data.resend });
    } catch (err) {
      setResult({ ok: false, error: err?.response?.data?.error?.message || String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box component="form" onSubmit={run} sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 440 }}>
      <TextField
        size="small" label="Email destinataire" type="email"
        value={dest} onChange={(e) => setDest(e.target.value)} required
        placeholder="kosmad.mk@gmail.com"
      />
      <Button type="submit" variant="outlined" disabled={busy} sx={{ alignSelf: "flex-start" }}>
        {busy ? <CircularProgress size={18} color="inherit" /> : "Envoyer email test"}
      </Button>
      {result && (
        <Alert severity={result.ok ? "success" : "error"} sx={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12 }}>
          {result.ok
            ? `✅ Email envoyé\nFROM : ${result.from}\nResend ID : ${result.raw?.data?.id}`
            : `❌ Échec\n${result.error || JSON.stringify(result.raw, null, 2)}`
          }
        </Alert>
      )}
    </Box>
  );
}
