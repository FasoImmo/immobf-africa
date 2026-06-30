import { useState } from "react";
import { useRouter } from "next/router";
import { Box, Paper, TextField, Button, Typography, Alert, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { Auth } from "../lib/api";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState(1); // 1=email, 2=code, 3=new password
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSendCode(e) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      await Auth.forgotPassword(email);
      setStep(2);
    } catch (err) {
      setErr(err?.response?.data?.error?.message || err.message);
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
      await Auth.resetPassword({ email, code, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setErr(err?.response?.data?.error?.message || err.message);
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
              {/* Étape 1 — Email */}
              {step === 1 && (
                <form onSubmit={handleSendCode}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t("auth.forgot_hint_email")}
                  </Typography>
                  <TextField
                    fullWidth label="Email" type="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    required margin="normal" />
                  {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
                  <Button fullWidth variant="contained" type="submit"
                    disabled={loading || !email} sx={{ mt: 2 }}>
                    {loading ? "…" : t("auth.send_otp")}
                  </Button>
                </form>
              )}

              {/* Étape 2 — Code */}
              {step === 2 && (
                <form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t("auth.otp_sent_to")} <strong>{email}</strong>
                  </Alert>
                  <TextField
                    fullWidth label={t("auth.otp_code")}
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    required inputMode="numeric" inputProps={{ maxLength: 6 }}
                    sx={{ mb: 2 }} />
                  {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
                  <Button fullWidth variant="contained" type="submit" disabled={code.length !== 6}>
                    {t("auth.verify_otp")}
                  </Button>
                  <Button fullWidth variant="text" sx={{ mt: 1 }}
                    onClick={() => Auth.forgotPassword(email)}>
                    {t("auth.resend_otp")}
                  </Button>
                </form>
              )}

              {/* Étape 3 — Nouveau mot de passe */}
              {step === 3 && (
                <form onSubmit={handleReset}>
                  <TextField fullWidth label={t("auth.new_password")} type={showPassword ? "text" : "password"}
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    required sx={{ mb: 2 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }} />
                  <TextField fullWidth label={t("auth.confirm_password")} type={showPassword ? "text" : "password"}
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
