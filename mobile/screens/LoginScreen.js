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
    if (!fullName || fullName.trim().length < 2) {
      return Alert.alert("Erreur", t.errFullNameRequired);
    }
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
          {me.email && <Text style={s.sub}>{me.email