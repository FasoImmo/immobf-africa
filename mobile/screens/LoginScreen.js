import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Auth } from "../lib/api";
import { useLang } from "../lib/lang";

const T = {
  fr: {
    hello: "Bonjour",
    role: "Rôle",
    logout: "Se déconnecter",
    login: "Connexion",
    register: "Créer un compte",
    email: "Email *",
    emailLogin: "Email",
    phone: "Numéro WhatsApp *",
    fullName: "Nom complet",
    password: "Mot de passe *",
    loginBtn: "Se connecter",
    registerBtn: "Créer le compte",
    haveAccount: "Déjà un compte ? Se connecter",
    noAccount: "Pas encore de compte ? S'inscrire",
    errLoginRequired: "Email et mot de passe requis",
    errRegRequired: "Email, WhatsApp et mot de passe requis",
    // Mot de passe oublié
    forgotBtn: "Mot de passe oublié ?",
    forgotTitle: "Réinitialiser le mot de passe",
    forgotHint: "Entrez votre email pour recevoir un code de vérification.",
    sendCode: "Envoyer le code",
    codeSent: "Un code à 6 chiffres a été envoyé à votre email.",
    otpCode: "Code reçu (6 chiffres)",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    passwordMismatch: "Les mots de passe ne correspondent pas.",
    resetBtn: "Réinitialiser",
    resetSuccess: "Mot de passe mis à jour ! Vous pouvez maintenant vous connecter.",
    backToLogin: "Retour à la connexion",
    errEmailRequired: "Email requis",
    errCodeRequired: "Code et nouveau mot de passe requis",
  },
  en: {
    hello: "Hello",
    role: "Role",
    logout: "Log out",
    login: "Login",
    register: "Create account",
    email: "Email *",
    emailLogin: "Email",
    phone: "WhatsApp number *",
    fullName: "Full name",
    password: "Password *",
    loginBtn: "Log in",
    registerBtn: "Create account",
    haveAccount: "Already have an account? Log in",
    noAccount: "No account yet? Sign up",
    errLoginRequired: "Email and password required",
    errRegRequired: "Email, WhatsApp and password required",
    // Forgot password
    forgotBtn: "Forgot password?",
    forgotTitle: "Reset password",
    forgotHint: "Enter your email to receive a verification code.",
    sendCode: "Send code",
    codeSent: "A 6-digit code has been sent to your email.",
    otpCode: "Received code (6 digits)",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    passwordMismatch: "Passwords do not match.",
    resetBtn: "Reset password",
    resetSuccess: "Password updated! You can now log in.",
    backToLogin: "Back to login",
    errEmailRequired: "Email required",
    errCodeRequired: "Code and new password required",
  },
};

export default function LoginScreen() {
  const { lang } = useLang();
  const t = T[lang] || T.fr;

  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(false);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState(1); // 1 = email, 2 = OTP + new password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("immobf_user").then((v) => {
      if (v) { try { setMe(JSON.parse(v)); } catch (_) {} }
    });
  }, []);

  async function doLogin() {
    if (!email || !password) {
      return Alert.alert("Erreur", t.errLoginRequired);
    }
    setBusy(true);
    try {
      const payload = { password };
      if (email.includes("@")) payload.email = email;
      else payload.phone = email;
      const r = await Auth.login(payload);
      await AsyncStorage.setItem("immobf_token", r.access);
      if (r.refresh) await AsyncStorage.setItem("immobf_refresh", r.refresh);
      await AsyncStorage.setItem("immobf_user", JSON.stringify(r.user));
      setMe(r.user);
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || e.message);
    } finally { setBusy(false); }
  }

  async function doRegister() {
    if (!email || !phone || !password) {
      return Alert.alert("Erreur", t.errRegRequired);
    }
    setBusy(true);
    try {
      const r = await Auth.register({ email, phone, password, full_name: fullName });
      await AsyncStorage.setItem("immobf_token", r.access);
      if (r.refresh) await AsyncStorage.setItem("immobf_refresh", r.refresh);
      await AsyncStorage.setItem("immobf_user", JSON.stringify(r.user));
      setMe(r.user);
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || e.message);
    } finally { setBusy(false); }
  }

  async function doLogout() {
    await AsyncStorage.multiRemove(["immobf_token", "immobf_refresh", "immobf_user"]);
    setMe(null);
    setEmail(""); setPhone(""); setPassword("");
  }

  async function doForgotSend() {
    if (!forgotEmail) return Alert.alert("Erreur", t.errEmailRequired);
    setBusy(true);
    try {
      await Auth.forgotPassword(forgotEmail);
      setForgotStep(2);
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || e.message);
    } finally { setBusy(false); }
  }

  async function doForgotReset() {
    if (!forgotCode || !newPassword) return Alert.alert("Erreur", t.errCodeRequired);
    if (newPassword !== confirmPassword) return Alert.alert("Erreur", t.passwordMismatch);
    setBusy(true);
    try {
      await Auth.resetPassword({ email: forgotEmail, code: forgotCode, new_password: newPassword });
      Alert.alert("✅", t.resetSuccess, [
        { text: "OK", onPress: () => {
          setMode("login");
          setForgotStep(1);
          setForgotEmail(""); setForgotCode(""); setNewPassword(""); setConfirmPassword("");
        }},
      ]);
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || e.message);
    } finally { setBusy(false); }
  }

  function goBackToLogin() {
    setMode("login");
    setForgotStep(1);
    setForgotEmail(""); setForgotCode(""); setNewPassword(""); setConfirmPassword("");
  }

  // ─── Profil connecté ───────────────────────────────────────────────────────
  if (me) {
    return (
      <View style={s.container}>
        <View style={s.profileCard}>
          <Text style={s.avatar}>{(me.full_name || me.phone || "?")[0].toUpperCase()}</Text>
          <Text style={s.h1}>{t.hello}, {me.full_name || me.phone}</Text>
          {me.email && <Text style={s.sub}>{me.email}</Text>}
          <Text style={s.sub}>{t.role} : {me.role}</Text>
        </View>
        <TouchableOpacity style={[s.btn, { backgroundColor: "#c0392b", marginTop: 24 }]} onPress={doLogout}>
          <Text style={s.btnText}>{t.logout}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Mot de passe oublié ───────────────────────────────────────────────────
  if (mode === "forgot") {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
          <Text style={s.h1}>{t.forgotTitle}</Text>

          {forgotStep === 1 && (
            <>
              <Text style={s.hint}>{t.forgotHint}</Text>
              <TextInput
                placeholder={t.emailLogin}
                value={forgotEmail} onChangeText={setForgotEmail}
                style={s.input} keyboardType="email-address" autoCapitalize="none"
              />
              <TouchableOpacity
                style={[s.btn, busy && { backgroundColor: "#aaa" }]}
                onPress={doForgotSend}
                disabled={busy}
              >
                <Text style={s.btnText}>{busy ? "…" : t.sendCode}</Text>
              </TouchableOpacity>
            </>
          )}

          {forgotStep === 2 && (
            <>
              <Text style={s.hint}>{t.codeSent}</Text>
              <TextInput
                placeholder={t.otpCode}
                value={forgotCode} onChangeText={setForgotCode}
                style={s.input} keyboardType="number-pad" maxLength={6}
              />
              <View style={s.pwRow}>
                <TextInput
                  placeholder={t.newPassword}
                  value={newPassword} onChangeText={setNewPassword}
                  style={[s.input, { flex: 1, marginTop: 0 }]}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Text style={{ fontSize: 18 }}>{showNewPassword ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                placeholder={t.confirmPassword}
                value={confirmPassword} onChangeText={setConfirmPassword}
                style={s.input} secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                style={[s.btn, busy && { backgroundColor: "#aaa" }]}
                onPress={doForgotReset}
                disabled={busy}
              >
                <Text style={s.btnText}>{busy ? "…" : t.resetBtn}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={s.switchBtn} onPress={goBackToLogin}>
            <Text style={s.switchText}>{t.backToLogin}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Login / Register ──────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>{mode === "login" ? t.login : t.register}</Text>

        {mode === "register" && (
          <TextInput
            placeholder={t.fullName}
            value={fullName} onChangeText={setFullName}
            style={s.input} autoCapitalize="words"
          />
        )}

        {/* Email */}
        <TextInput
          placeholder={mode === "login" ? t.emailLogin : t.email}
          value={email} onChangeText={setEmail}
          style={s.input} keyboardType="email-address" autoCapitalize="none"
        />

        {/* WhatsApp — inscription seulement */}
        {mode === "register" && (
          <TextInput
            placeholder={t.phone}
            value={phone} onChangeText={setPhone}
            style={s.input} keyboardType="phone-pad"
          />
        )}

        <View style={s.pwRow}>
          <TextInput
            placeholder={t.password}
            value={password} onChangeText={setPassword}
            style={[s.input, { flex: 1, marginTop: 0 }]}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
            <Text style={{ fontSize: 18 }}>{showPassword ? "🙈" : "👁️"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.btn, busy && { backgroundColor: "#aaa" }]}
          onPress={mode === "login" ? doLogin : doRegister}
          disabled={busy}
        >
          <Text style={s.btnText}>{busy ? "…" : (mode === "login" ? t.loginBtn : t.registerBtn)}</Text>
        </TouchableOpacity>

        {/* Mot de passe oublié — visible en mode login seulement */}
        {mode === "login" && (
          <TouchableOpacity style={s.forgotBtn} onPress={() => { setForgotEmail(email); setMode("forgot"); }}>
            <Text style={s.forgotText}>{t.forgotBtn}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.switchBtn} onPress={() => setMode(mode === "login" ? "register" : "login")}>
          <Text style={s.switchText}>{mode === "login" ? t.noAccount : t.haveAccount}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "white" },
  profileCard: { alignItems: "center", marginTop: 32, padding: 24, backgroundColor: "#f0faf6", borderRadius: 16 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#0E7C66", color: "white",
    fontSize: 28, fontWeight: "700", textAlign: "center", lineHeight: 64,
    marginBottom: 12,
  },
  h1: { fontSize: 22, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  sub: { color: "#666", marginTop: 4 },
  hint: { color: "#555", fontSize: 14, marginTop: 8, marginBottom: 4, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginTop: 12, fontSize: 15 },
  pwRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  eyeBtn: { padding: 10, justifyContent: "center" },
  btn: { marginTop: 20, backgroundColor: "#0E7C66", borderRadius: 8, padding: 14, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  forgotBtn: { marginTop: 10, alignItems: "flex-end", paddingRight: 4 },
  forgotText: { color: "#0E7C66", fontSize: 13 },
  switchBtn: { marginTop: 16, alignItems: "center", padding: 8 },
  switchText: { color: "#0E7C66", fontSize: 14 },
});
