import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Box, Paper, TextField, Button, Typography, Alert,
  Checkbox, FormControlLabel, Tabs, Tab, Divider,
  Select, MenuItem, InputAdornment, FormControl,
} from "@mui/material";
import Layout from "../components/Layout";
import { Auth } from "../lib/api";

// Principaux pays africains avec indicatif
const AFRICAN_CODES = [
  { code: "+226", country: "BF", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "+225", country: "CI", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "+221", country: "SN", flag: "🇸🇳", name: "Sénégal" },
  { code: "+223", country: "ML", flag: "🇲🇱", name: "Mali" },
  { code: "+227", country: "NE", flag: "🇳🇪", name: "Niger" },
  { code: "+228", country: "TG", flag: "🇹🇬", name: "Togo" },
  { code: "+229", country: "BJ", flag: "🇧🇯", name: "Bénin" },
  { code: "+224", country: "GN", flag: "🇬🇳", name: "Guinée" },
  { code: "+237", country: "CM", flag: "🇨🇲", name: "Cameroun" },
  { code: "+243", country: "CD", flag: "🇨🇩", name: "RD Congo" },
  { code: "+242", country: "CG", flag: "🇨🇬", name: "Congo" },
  { code: "+233", country: "GH", flag: "🇬🇭", name: "Ghana" },
  { code: "+234", country: "NG", flag: "🇳🇬", name: "Nigeria" },
  { code: "+254", country: "KE", flag: "🇰🇪", name: "Kenya" },
  { code: "+255", country: "TZ", flag: "🇹🇿", name: "Tanzanie" },
  { code: "+250", country: "RW", flag: "🇷🇼", name: "Rwanda" },
  { code: "+212", country: "MA", flag: "🇲🇦", name: "Maroc" },
  { code: "+213", country: "DZ", flag: "🇩🇿", name: "Algérie" },
  { code: "+216", country: "TN", flag: "🇹🇳", name: "Tunisie" },
  { code: "+20",  country: "EG", flag: "🇪🇬", name: "Égypte" },
  { code: "+261", country: "MG", flag: "🇲🇬", name: "Madagascar" },
  { code: "+230", country: "MU", flag: "🇲🇺", name: "Maurice" },
];

function PhoneInput({ value, onChange, label, required }) {
  const [dialCode, setDialCode] = useState("+226");
  const [localNumber, setLocalNumber] = useState("");

  function handleCodeChange(e) {
    const code = e.target.value;
    setDialCode(code);
    onChange(code + localNumber);
  }

  function handleNumberChange(e) {
    const num = e.target.value.replace(/\D/g, "");
    setLocalNumber(num);
    onChange(dialCode + num);
  }

  return (
    <Box sx={{ display: "flex", gap: 1, mt: 1, mb: 0.5 }}>
      <FormControl sx={{ minWidth: 130 }}>
        <Select
          value={dialCode}
          onChange={handleCodeChange}
          size="small"
          sx={{ height: 56 }}
        >
          {AFRICAN_CODES.map((c) => (
            <MenuItem key={c.country} value={c.code}>
              {c.flag} {c.code}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        fullWidth
        label={label}
        value={localNumber}
        onChange={handleNumberChange}
        required={required}
        inputMode="tel"
        placeholder="XXXXXXXX"
      />
    </Box>
  );
}

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const redirect = router.query.redirect || "/";

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
      router.push(redirect);
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
      router.push(redirect);
    } catch (e) {
      setRegErr(e?.response?.data?.error?.message || e.message);
    }
  }

  return (
    <Layout title={`${t("auth.login_tab")} — ImmoBF Africa`}>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Paper sx={{ maxWidth: 460, width: "100%" }} elevation={2}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            <Tab label={t("auth.login_tab")} />
            <Tab label={t("auth.register_tab")} />
          </Tabs>

          <Box sx={{ p: 4 }}>
            {/* ── CONNEXION ── */}
            {tab === 0 && (
              <form onSubmit={onLogin}>
                <PhoneInput
                  label={t("auth.phone")}
                  value={phone}
                  onChange={setPhone}
                  required
                />
                <TextField fullWidth label={t("auth.password")} type="password" margin="normal"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
                {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
                <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }}>
                  {t("auth.login_btn")}
                </Button>
                <Box sx={{ textAlign: "right", mt: 1 }}>
                  <Link href="/forgot-password" style={{ fontSize: 13, color: "#0E7C66" }}>
                    {t("auth.forgot_password")}
                  </Link>
                </Box>
              </form>
            )}

            {/* ── INSCRIPTION ── */}
            {tab === 1 && (
              <form onSubmit={onRegister}>
                <TextField fullWidth label={t("auth.full_name")} margin="normal"
                  value={regName} onChange={(e) => setRegName(e.target.value)} required />
                <PhoneInput
                  label={t("auth.phone")}
                  value={regPhone}
                  onChange={setRegPhone}
                  required
                />
                <TextField fullWidth label={t("auth.password")} type="password" margin="normal"
                  value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />

                <Divider sx={{ my: 2 }} />

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
                  type="submit" fullWidth variant="contained"
                  sx={{ mt: 2 }} disabled={!cguAccepted}
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
