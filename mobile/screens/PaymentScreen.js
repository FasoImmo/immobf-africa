import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking } from "react-native";
import { Payments } from "../lib/api";

export default function PaymentScreen({ route }) {
  const { property, amount } = route.params;
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    Payments.providers(property.country_code || "BF").then((d) => {
      setProviders(d.providers);
      setProvider(d.providers[0]?.name || "");
    });
  }, [property]);

  async function pay() {
    if (!phone || !provider) return Alert.alert("Téléphone requis");
    setBusy(true);
    try {
      const r = await Payments.initiate({
        provider, amount, currency: property.currency || "XOF",
        property_id: property.id, purpose: "deposit", customer_phone: phone,
      });
      setResult(r);
      if (r.payment_url) Linking.openURL(r.payment_url);
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || e.message);
    } finally { setBusy(false); }
  }

  return (
    <View style={s.container}>
      <Text style={s.h1}>{property.title}</Text>
      <Text style={s.amount}>{amount.toLocaleString("fr-FR")} {property.currency}</Text>

      <Text style={s.label}>Opérateur</Text>
      <View style={s.row}>
        {providers.map((p) => (
          <TouchableOpacity
            key={p.name}
            style={[s.chip, provider === p.name && s.chipActive]}
            onPress={() => setProvider(p.name)}
          >
            <Text style={[s.chipText, provider === p.name && s.chipTextActive]}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Numéro (+226…)</Text>
      <TextInput value={phone} onChangeText={setPhone} style={s.input} keyboardType="phone-pad" />

      <TouchableOpacity style={s.btn} onPress={pay} disabled={busy}>
        {busy ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>Payer</Text>}
      </TouchableOpacity>

      {result?.ussd_code && (
        <View style={s.info}>
          <Text>Composez <Text style={{ fontWeight: "700" }}>{result.ussd_code}</Text> pour valider.</Text>
          <Text style={{ color: "#666", marginTop: 6 }}>Référence : {result.reference}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  h1: { fontSize: 18, fontWeight: "600" },
  amount: { fontSize: 28, fontWeight: "700", color: "#0E7C66", marginTop: 6 },
  label: { marginTop: 16, color: "#666" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { backgroundColor: "#eee", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: "#0E7C66" },
  chipText: { color: "#333" },
  chipTextActive: { color: "white", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginTop: 8 },
  btn: { marginTop: 24, backgroundColor: "#0E7C66", borderRadius: 8, padding: 14, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700" },
  info: { marginTop: 16, backgroundColor: "#fffbea", padding: 12, borderRadius: 8 },
});
