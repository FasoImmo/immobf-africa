import { useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, TextField, Button, Typography, Alert,
  Select, MenuItem, FormControl, InputAdornment,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { Auth } from "../lib/api";

const AFRICAN_CODES = [
  { code: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "+221", flag: "🇸🇳", name: "Sénégal" },
  { code: "+223", flag: "🇲🇱", name: "Mali" },
  { code: "+227", flag: "🇳🇪", name: "Niger" },
  { code: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "+229", flag: "🇧🇯", name: "Bénin" },
  { code: "+224", flag: "🇬🇳", name: "Guinée" },
  { code: "+237", flag: "🇨🇲", name: "Cameroun" },
  { code: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+212", flag: "🇲🇦", name: "Maroc" },
];

export default function ForgotPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState(1); // 1=phone, 2=otp, 3=new password
  const [dialCode, setDialCode] = useState("+226");
  const [localPhone, setLocalPhone] = useState("");
  const phone = dialCode + localPhone.replace(/\D/g, "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSendOtp(e) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      await Auth.forgotPassword(phone);
      setStep(2);
    } catch (e) {
      setErr(e?.response?.data?.error?.message || e.message);
    } finally { setLoading(false); }
  }

  async function handleReset(e) {
    e.preventDefault();
    setErr(null);
    if (newPassword !== confirmPassword) {
      setErr(t("auth.passwords_mismatch"));
      return;
    }
    setLoading(true);
    try {
      await Auth.resetPassword({ phone, code, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (e) {
      setErr(e?.response?.data?.error?.message || e.message);
    } finally { setLoading(false); }
  }

  return (
    <Layout title={`${t("auth.forgot_title")} — ImmoBF Africa`}>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Paper sx={{ maxWidth: 420, width: "100%", p: 4 }} elevation={2}>
          <Typography variant="h5" gutterBottom>{t("auth.forgot_title")}</Typography>

          {success ? (
            <Alert severity="success">{t("auth.reset_success")}</Alert>
          ) : (
            <>
              {/* Étape 1 — Saisir le numéro */}
              {step === 1 && (
                <form onSubmit={handleSendOtp}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t("auth.forgot_hint")}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <FormControl sx={{ minWidth: 130 }}>
                      <Select value={dialCode} onChange={(e) => setDialCode(e.target.value)}
                        size="small" sx={{ height: 56 }}>
                        {AFRICAN_CODES.map((c) => (
                          <MenuItem key={c.code} value={c.code}>{c.flag} {c.code}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField fullWidth label={t("auth.phone")} value={localPhone}
                      onChange={(e) => setLocalPhone(e.target.value.replace(/\D/g, ""))}
                      required inputMode="tel" placeholder="XXXXXXXX" />
                  </Box>
                  {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
                  <Button fullWidth variant="contained" type="submit" disabled={loading || !localPhone}>
                    {loading ? "…" : t("auth.send_otp")}
                  </Button>
                </form>
              )}

              {/* Étape 2 — Saisir le code OTP */}
              {step === 2 && (
                <form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t("auth.otp_sent_to")} <strong>{phone}</strong>
                  </Alert>
                  <TextField fullWidth label={t("auth.otp_code")} value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    required inputMode="numeric" inputProps={{ maxLength: 6 }}
                    sx={{ mb: 2 }} />
                  {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
                  <Button fullWidth variant="contained" type="submit" disabled={code.length !== 6}>
                    {t("auth.verify_otp")}
                  </Button>
                  <Button fullWidth variant="text" sx={{ mt: 1 }}
                    onClick={async () => { await Auth.forgotPassword(phone); }}>
                    {t("auth.resend_otp")}
                  </Button>
                </form>
              )}

              {/* Étape 3 — Nouveau mot de passe */}
              {step === 3 && (
                <form onSubmit={handleReset}>
                  <TextField fullWidth label={t("auth.new_password")} type="password"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    required sx={{ mb: 2 }} />
                  <TextField fullWidth label={t("auth.confirm_password")} type="password"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    required sx={{ mb: 2 }} />
                  {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
                  <Button fullWidth variant="contained" type="submit"
                    disabled={loading || !newPassword || !confirmPassword}>
                    {loading ? "…" : t("auth.reset_btn")}
                  </Button>
                </form>
              )}
            </>
          )}

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Button variant="text" size="small" onClick={() => router.push("/login")}>
              ← {t("auth.back_to_login")}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Layout>
  );
}
