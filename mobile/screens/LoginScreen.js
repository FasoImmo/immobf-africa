import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as tokenStore from "../lib/tokenStore";
import { Auth, Properties } from "../lib/api";
import { useLang } from "../lib/lang";

// ─── Helpers dates ────────────────────────────────────────────────────────────
function addDaysLogin(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function fmtDateLogin(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}
function displayDate(str) {
  // "2026-08-10" → "10/08/2026"
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Modal blocage dates annonceur ───────────────────────────────────────────
function BlockDatesModal({ visible, propertyId, propertyTitle, onClose }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [blocks, setBlocks] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [blockStart, setBlockStart] = React.useState(today);
  const [blockEnd, setBlockEnd] = React.useState(addDaysLogin(today, 1));

  React.useEffect(() => {
    if (!visible || !propertyId) return;
    setLoading(true);
    Properties.getBlocks(propertyId)
      .then((d) => setBlocks(d.blocks || []))
      .catch(() => Alert.alert("Erreur", "Impossible de charger les dates bloquées."))
      .finally(() => setLoading(false));
  }, [visible, propertyId]);

  async function handleAdd() {
    if (blockEnd <= blockStart) {
      return Alert.alert("Erreur", "La date de fin doit être après la date de début.");
    }
    setSaving(true);
    try {
      const d = await Properties.addBlock(
        propertyId,
        fmtDateLogin(blockStart),
        fmtDateLogin(blockEnd),
        null
      );
      setBlocks((prev) => [...prev, d.block]);
      setBlockStart(today);
      setBlockEnd(addDaysLogin(today, 1));
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || "Impossible d'ajouter le bloc.");
    } finally { setSaving(false); }
  }

  async function handleRemove(blockId) {
    try {
      await Properties.removeBlock(propertyId, blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || "Impossible de supprimer.");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={bdStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={bdStyles.sheet}>
        <View style={bdStyles.header}>
          <Text style={bdStyles.title} numberOfLines={1}>📅 Bloquer des dates</Text>
          <TouchableOpacity onPress={onClose}><Text style={bdStyles.close}>✕</Text></TouchableOpacity>
        </View>
        <Text style={bdStyles.sub} numberOfLines={1}>{propertyTitle}</Text>

        {/* Sélecteur nouvelle période */}
        <View style={bdStyles.row}>
          <View style={bdStyles.dateBox}>
            <Text style={bdStyles.dateLabel}>Début</Text>
            <View style={bdStyles.stepper}>
              <TouchableOpacity style={bdStyles.stepBtn} onPress={() => { const d = addDaysLogin(blockStart, -1); if (d >= today) setBlockStart(d); }}>
                <Text style={bdStyles.stepTxt}>‹</Text>
              </TouchableOpacity>
              <Text style={bdStyles.dateVal}>{displayDate(fmtDateLogin(blockStart))}</Text>
              <TouchableOpacity style={bdStyles.stepBtn} onPress={() => setBlockStart(addDaysLogin(blockStart, 1))}>
                <Text style={bdStyles.stepTxt}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={bdStyles.dateBox}>
            <Text style={bdStyles.dateLabel}>Fin</Text>
            <View style={bdStyles.stepper}>
              <TouchableOpacity style={bdStyles.stepBtn} onPress={() => { const d = addDaysLogin(blockEnd, -1); if (d > blockStart) setBlockEnd(d); }}>
                <Text style={bdStyles.stepTxt}>‹</Text>
              </TouchableOpacity>
              <Text style={bdStyles.dateVal}>{displayDate(fmtDateLogin(blockEnd))}</Text>
              <TouchableOpacity style={bdStyles.stepBtn} onPress={() => setBlockEnd(addDaysLogin(blockEnd, 1))}>
                <Text style={bdStyles.stepTxt}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={bdStyles.addBtn} onPress={handleAdd} disabled={saving}>
          <Text style={bdStyles.addBtnText}>{saving ? "…" : "➕ Ajouter ce blocage"}</Text>
        </TouchableOpacity>

        {/* Liste des blocages existants */}
        <Text style={bdStyles.listTitle}>Dates bloquées</Text>
        {loading ? (
          <ActivityIndicator color="#0E7C66" style={{ marginTop: 8 }} />
        ) : blocks.length === 0 ? (
          <Text style={{ color: "#888", fontSize: 13, marginTop: 6 }}>Aucune date bloquée.</Text>
        ) : (
          <FlatList
            data={blocks}
            keyExtractor={(b) => String(b.id)}
            style={{ maxHeight: 180 }}
            renderItem={({ item }) => (
              <View style={bdStyles.blockRow}>
                <Text style={bdStyles.blockText}>
                  {displayDate(item.check_in ? item.check_in.slice(0,10) : "")} → {displayDate(item.check_out ? item.check_out.slice(0,10) : "")}
                  {item.note ? `  (${item.note})` : ""}
                </Text>
                <TouchableOpacity onPress={() => handleRemove(item.id)}>
                  <Text style={{ color: "#c0392b", fontSize: 18, paddingHorizontal: 6 }}>🗑</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const bdStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 32, maxHeight: "80%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontWeight: "700", fontSize: 16, flex: 1 },
  close: { fontSize: 20, paddingLeft: 12, color: "#555" },
  sub: { color: "#666", fontSize: 12, marginTop: 2, marginBottom: 12 },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  dateBox: { flex: 1 },
  dateLabel: { fontSize: 12, color: "#555", marginBottom: 4 },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 8, paddingVertical: 6 },
  stepBtn: { paddingHorizontal: 12 },
  stepTxt: { fontSize: 20, color: "#0E7C66", fontWeight: "700" },
  dateVal: { flex: 1, textAlign: "center", fontSize: 13, fontWeight: "600" },
  addBtn: { backgroundColor: "#0E7C66", borderRadius: 8, padding: 12, alignItems: "center", marginBottom: 14 },
  addBtnText: { color: "#fff", fontWeight: "700" },
  listTitle: { fontWeight: "700", fontSize: 13, marginBottom: 6, color: "#333" },
  blockRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  blockText: { fontSize: 13, color: "#333", flex: 1 },
});

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
    errFullNameRequired: "Nom complet requis (2 caractères minimum)",
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
    errFullNameRequired: "Full name required (min. 2 characters)",
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


function ProfileView({ me, onLogout, t, navigation }) {
  const [listings, setListings] = React.useState([]);
  const [loadingListings, setLoadingListings] = React.useState(false);
  const [showListings, setShowListings] = React.useState(false);
  const [stats, setStats] = React.useState(null);
  const [loadingStats, setLoadingStats] = React.useState(true);
  const [blockModal, setBlockModal] = React.useState(null); // { id, title }

  React.useEffect(() => {
    Properties.myStats()
      .then((d) => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, []);

  function loadListings() {
    if (showListings) { setShowListings(false); return; }
    setLoadingListings(true);
    Properties.myListings()
      .then((d) => { setListings(d.items || []); setShowListings(true); })
      .catch(() => Alert.alert("Erreur", "Impossible de charger vos annonces."))
      .finally(() => setLoadingListings(false));
  }

  async function handleDelete(id, title) {
    Alert.alert(
      "Supprimer",
      `Supprimer "${title}" ? Action irréversible.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer", style: "destructive",
          onPress: async () => {
            try {
              await Properties.deleteListing(id);
              setListings((prev) => prev.filter((l) => l.id !== id));
            } catch (e) {
              Alert.alert("Erreur", e?.response?.data?.error?.message || "Erreur lors de la suppression.");
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.profileCard}>
        <Text style={s.avatar}>{(me.full_name || me.phone || "?")[0].toUpperCase()}</Text>
        <Text style={s.h1}>{t.hello}, {me.full_name || me.phone}</Text>
        {me.email && <Text style={s.sub}>{me.email}</Text>}
        <Text style={s.sub}>{t.role} : {me.role}</Text>
      </View>

      {/* ── Statistiques annonces ─────────────────────────────── */}
      {loadingStats ? (
        <View style={{ alignItems: "center", marginTop: 16 }}>
          <Text style={{ color: "#888" }}>Chargement des stats…</Text>
        </View>
      ) : stats && stats.listings && stats.listings.length > 0 ? (() => {
        const ls = stats.listings;
        const totalViews     = ls.reduce((s, l) => s + Number(l.total_views || 0), 0);
        const views7d        = ls.reduce((s, l) => s + Number(l.views_7d || 0), 0);
        const waClicks       = ls.reduce((s, l) => s + Number(l.whatsapp_clicks || 0), 0);
        const activeCount    = ls.filter((l) => l.subscription_status === "active").length;
        return (
          <View style={{ backgroundColor: "#f0faf7", borderRadius: 10, padding: 14, marginTop: 16, borderWidth: 1, borderColor: "#b2dfdb" }}>
            <Text style={{ fontWeight: "700", fontSize: 13, color: "#0E7C66", marginBottom: 10 }}>📊 Mes statistiques</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <View style={statBox}><Text style={statNum}>{ls.length}</Text><Text style={statLbl}>Annonces</Text></View>
              <View style={statBox}><Text style={statNum}>{activeCount}</Text><Text style={statLbl}>Actives</Text></View>
              <View style={statBox}><Text style={statNum}>{totalViews}</Text><Text style={statLbl}>Vues totales</Text></View>
              <View style={statBox}><Text style={statNum}>{views7d}</Text><Text style={statLbl}>Vues (7j)</Text></View>
              <View style={statBox}><Text style={statNum}>{waClicks}</Text><Text style={statLbl}>Clics WA</Text></View>
            </View>
          </View>
        );
      })() : null}

      <TouchableOpacity style={[s.btn, { backgroundColor: "#0E7C66", marginTop: 16 }]} onPress={loadListings}>
        <Text style={s.btnText}>{loadingListings ? "…" : (showListings ? "Masquer mes annonces" : "Mes annonces")}</Text>
      </TouchableOpacity>

      {showListings && listings.length === 0 && (
        <Text style={{ textAlign: "center", color: "#666", marginTop: 12 }}>Aucune annonce.</Text>
      )}

      {showListings && listings.map((item) => (
        <View key={item.id} style={{ backgroundColor: "#fff", borderRadius: 8, padding: 12, marginTop: 10, borderWidth: 1, borderColor: "#e0e0e0" }}>
          <Text style={{ fontWeight: "700", fontSize: 14 }} numberOfLines={1}>{item.title || "Sans titre"}</Text>
          <Text style={{ color: "#666", fontSize: 12, marginTop: 2 }}>{item.city} — {item.status}</Text>
          {item.listing_expires_at && (
            <Text style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
              Expire : {new Date(item.listing_expires_at).toLocaleDateString("fr-FR")}
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <TouchableOpacity
              style={{ flex: 1, minWidth: 90, padding: 8, backgroundColor: "#0E7C66", borderRadius: 6, alignItems: "center" }}
              onPress={() => navigation.navigate("Publier", { editMode: true, propertyId: item.id, initialData: item })}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>✏️ Modifier</Text>
            </TouchableOpacity>
            {(item.transaction_type === "rent_short" || item.transaction_type === "rent_long") && (
              <TouchableOpacity
                style={{ flex: 1, minWidth: 90, padding: 8, backgroundColor: "#1565c0", borderRadius: 6, alignItems: "center" }}
                onPress={() => setBlockModal({ id: item.id, title: item.title || "Annonce" })}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>📅 Dates</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{ flex: 1, minWidth: 90, padding: 8, backgroundColor: "#c0392b", borderRadius: 6, alignItems: "center" }}
              onPress={() => handleDelete(item.id, item.title || "cette annonce")}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>🗑 Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={[s.btn, { backgroundColor: "#c0392b", marginTop: 24 }]} onPress={onLogout}>
        <Text style={s.btnText}>{t.logout}</Text>
      </TouchableOpacity>

      <BlockDatesModal
        visible={!!blockModal}
        propertyId={blockModal?.id}
        propertyTitle={blockModal?.title}
        onClose={() => setBlockModal(null)}
      />
    </ScrollView>
  );
}

export default function LoginScreen({ navigation }) {
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
      await tokenStore.setToken(r.access);
      if (r.refresh) await tokenStore.setRefresh(r.refresh);
      await AsyncStorage.setItem("immobf_user", JSON.stringify(r.user));
      setMe(r.user);
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || e.message);
    } finally { setBusy(false); }
  }

  async function doRegister() {
    if (!fullName || fullName.trim().length < 2) {
      return Alert.alert("Erreur", t.errFullNameRequired);
    }
    if (!email || !phone || !password) {
      return Alert.alert("Erreur", t.errRegRequired);
    }
    setBusy(true);
    try {
      const r = await Auth.register({ email, phone, password, full_name: fullName });
      await tokenStore.setToken(r.access);
      if (r.refresh) await tokenStore.setRefresh(r.refresh);
      await AsyncStorage.setItem("immobf_user", JSON.stringify(r.user));
      setMe(r.user);
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || e.message);
    } finally { setBusy(false); }
  }

  async function doLogout() {
    await tokenStore.clearSession();
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
    return <ProfileView me={me} onLogout={doLogout} t={t} navigation={navigation} />;
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

// Styles boîtes stats (hors StyleSheet pour usage inline)
const statBox = { backgroundColor: "#fff", borderRadius: 8, padding: 10, alignItems: "center", minWidth: 70, borderWidth: 1, borderColor: "#b2dfdb" };
const statNum = { fontSize: 18, fontWeight: "700", color: "#0E7C66" };
const statLbl = { fontSize: 11, color: "#555", marginTop: 2 };

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
