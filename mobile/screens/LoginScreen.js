import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Auth } from "../lib/api";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [me, setMe] = useState(null);

  async function doLogin() {
    try {
      const r = await Auth.login({ phone, password });
      await AsyncStorage.setItem("immobf_token", r.access);
      setMe(r.user);
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || e.message);
    }
  }

  if (me) {
    return (
      <View style={s.container}>
        <Text style={s.h1}>Bonjour {me.full_name || me.phone}</Text>
        <Text style={{ marginTop: 8 }}>Rôle : {me.role}</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.h1}>Connexion</Text>
      <TextInput placeholder="Téléphone" value={phone} onChangeText={setPhone} style={s.input} keyboardType="phone-pad" />
      <TextInput placeholder="Mot de passe" value={password} onChangeText={setPassword} style={s.input} secureTextEntry />
      <TouchableOpacity style={s.btn} onPress={doLogin}><Text style={s.btnText}>Se connecter</Text></TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "white" },
  h1: { fontSize: 22, fontWeight: "700", marginTop: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginTop: 12 },
  btn: { marginTop: 20, backgroundColor: "#0E7C66", borderRadius: 8, padding: 14, alignItems: "center" },
  btnText: { color: "white", fontWeight: "600" },
});
