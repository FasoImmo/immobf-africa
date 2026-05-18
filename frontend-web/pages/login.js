import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Box, Paper, TextField, Button, Typography, Alert,
  Checkbox, FormControlLabel, Tabs, Tab, Divider
} from "@mui/material";
import Layout from "../components/Layout";
import { Auth } from "../lib/api";

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState(0); // 0 = connexion, 1 = inscription

  // Connexion
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);

  // Inscription
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [cguAccepted, setCguAccepted] = useState(false);
  const [regErr, setRegErr] = useState(null);

  async function onLogin(e) {
    e.preventDefault();
    setErr(null);
    try {
      const { access, user } = await Auth.login({ phone, password });
      localStorage.setItem("immobf_token", access);
      localStorage.setItem("immobf_user", JSON.stringify(user));
      router.push("/");
    } catch (e) {
      setErr(e?.response?.data?.error?.message || e.message);
    }
  }

  async function onRegister(e) {
    e.preventDefault();
    setRegErr(null);
    if (!cguAccepted) {
      setRegErr(t("auth.cgu_required"));
      return;
    }
    try {
      const { access, user } = await Auth.register({
        phone: regPhone,
        password: regPassword,
        full_name: regName,
      });
      localStorage.setItem("immobf_token", access);
      localStorage.setItem("immobf_user", JSON.stringify(user));
      router.push("/");
    } catch (e) {
      setRegErr(e?.response?.data?.error?.message || e.message);
    }
  }

  return (
    <Layout title={`${t("auth.login_tab")} — ImmoBF Africa`}>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Paper sx={{ maxWidth: 420, width: "100%" }} elevation={2}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            <Tab label={t("auth.login_tab")} />
            <Tab label={t("auth.register_tab")} />
          </Tabs>

          <Box sx={{ p: 4 }}>
            {/* ── CONNEXION ── */}
            {tab === 0 && (
              <form onSubmit={onLogin}>
                <TextField fullWidth label={t("auth.phone")} margin="normal"
                  value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <TextField fullWidth label={t("auth.password")} type="password" margin="normal"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
                {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
                <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }}>
                  {t("auth.login_btn")}
                </Button>
              </form>
            )}

            {/* ── INSCRIPTION ── */}
            {tab === 1 && (
              <form onSubmit={onRegister}>
                <TextField fullWidth label={t("auth.full_name")} margin="normal"
                  value={regName} onChange={(e) => setRegName(e.target.value)} required />
                <TextField fullWidth label={t("auth.phone")} margin="normal"
                  value={regPhone} onChange={(e) => setRegPhone(e.target.value)} required />
                <TextField fullWidth label={t("auth.password")} type="password" margin="normal"
                  value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />

                <Divider sx={{ my: 2 }} />

                {/* Case CGU — obligatoire */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={cguAccepted}
                      onChange={(e) => setCguAccepted(e.target.checked)}
                      color="primary"
                      required
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: "#555" }}>
                      {t("auth.cgu_accept")}{" "}
                      <Link href="/legal" target="_blank"
                        style={{ color: "#1B6B3A", fontWeight: 600 }}>
                        {t("auth.cgu_link")}
                      </Link>{" "}
                      {t("auth.and")}{" "}
                      <Link href="/legal" target="_blank"
                        style={{ color: "#1B6B3A", fontWeight: 600 }}>
                        {t("auth.privacy_link")}
                      </Link>{" "}
                      {t("auth.cgu_suffix")}
                    </Typography>
                  }
                />

                {regErr && <Alert severity="error" sx={{ mt: 2 }}>{regErr}</Alert>}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 2 }}
                  disabled={!cguAccepted}
                >
                  {t("auth.register_btn")}
                </Button>

                <Typography variant="caption" sx={{ display: "block", mt: 2, color: "#999", textAlign: "center" }}>
                  {t("auth.cgu_notice")}
                </Typography>
              </form>
            )}
          </Box>
        </Paper>
      </Box>
    </Layout>
  );
}
