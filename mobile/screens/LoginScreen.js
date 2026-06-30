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
    title: "Mon compte",
    hello: "Bonjour",
    role: "Rôle",
    logout: "Se déconnecter",
    login: "Connexion",
    register: "Créer un compte",
    email: "Email",
    phone: "WhatsApp (+226…)",
    fullName: "Nom complet",
    password: "Mot de passe",
    loginBtn: "Se connecter",
    registerBtn: "Créer le compte",
    haveAccount: "Déjà un compte ? Se connecter",
    noAccount: "Pas encore de compte ? S'inscrire",
    errRequired: "Email/téléphone et mot de passe requis",
  },
  en: {
    title: "My account",
    hello: "Hello",
    role: "Role",
    logout: "Log out",
    login: "Login",
    register: "Create account",
    email: "Email",
    phone: "WhatsApp (+226…)",
    fullName: "Full name",
    password: "Password",
    loginBtn: "Log in",
    registerBtn: "Create account",
    haveAccount: "Already have an account? Log in",
    noAccount: "No account yet? Sign up",
    errRequired: "Email/phone and password required",
  },
};

export default function LoginScreen() {
  const { lang } = useLang();
  const t = T[lang] || T.fr;

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("immobf_user").then((v) => {
      if (v) { try { setMe(JSON.parse(v)); } catch (_) {} }
    });
  }, []);

  async function doLogin() {
    if ((!email && !phone) || !password) {
      return Alert.alert("Erreur", t.errRequired);
    }
    setBusy(true);
    try {
      const payload = { password };
      if (email.includes("@")) payload.email = email;
      else payload.phone = email || phone;
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
      return Alert.alert("Erreur", "Email, téléphone et mot de passe requis");
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

        {/* Email (login: email OU téléphone) */}
        <TextInput
          placeholder={mode === "login" ? `${t.email} ou ${t.phone}` : t.email}
          value={email} onChangeText={setEmail}
          style={s.input} keyboardType="email-address" autoCapitalize="none"
        />

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
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginTop: 12, fontSize: 15 },
  pwRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  eyeBtn: { padding: 10, justifyContent: "center" },
  btn: { marginTop: 20, backgroundColor: "#0E7C66", borderRadius: 8, padding: 14, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  switchBtn: { marginTop: 16, alignItems: "center", padding: 8 },
  switchText: { color: "#0E7C66", fontSize: 14 },
});
