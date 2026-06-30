import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking, ScrollView,
} from "react-native";
import { Payments } from "../lib/api";

// Opérateurs PawaPay disponibles au Burkina Faso
const PAWAPAY_OPERATORS = [
  { value: "moov",   label: "Moov Money" },
  { value: "orange", label: "Orange Money (OTP requis)" },
];

// Indicatifs pays fréquents (fallback)
const DIAL_CODES = {
  BF: "+226", BJ: "+229", CI: "+225", SN: "+221", TG: "+228",
  NE: "+227", ML: "+223", GN: "+224", GH: "+233", NG: "+234",
  CM: "+237", CD: "+243", RW: "+250", TZ: "+255", KE: "+254",
};

export default function PaymentScreen({ route }) {
  const { property, amount, purpose = "commission" } = route.params;
  const countryCode = property.country_code || "BF";

  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  const [pawapayOperator, setPawapayOperator] = useState("moov");
  const [pawapayOtp, setPawapayOtp] = useState("");
  const [phone, setPhone] = useState(DIAL_CODES[countryCode] || "+226");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    Payments.providers(countryCode).then((d) => {
      setProviders(d.providers || []);
      setProvider(d.providers?.[0]?.name || "");
    }).catch(() => {});
  }, [countryCode]);

  const canPay = phone.length >= 8 && provider &&
    !(provider === "pawapay" && pawapayOperator === "orange" && !pawapayOtp);

  async function pay() {
    if (!canPay) {
      Alert.alert("Champs requis", provider === "pawapay" && pawapayOperator === "orange"
        ? "Entrez le code OTP Orange Money"
        : "Entrez votre numéro de téléphone");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const payload = {
        provider,
        amount,
        currency: property.currency || "XOF",
        property_id: property.id,
        purpose,
        customer_phone: phone,
      };
      if (provider === "pawapay") {
        payload.preferred_operator = pawapayOperator;
        if (pawapayOperator === "orange") payload.pawapay_otp = pawapayOtp;
      }
      const r = await Payments.initiate(payload);
      setResult(r);
      if (r.payment_url) Linking.openURL(r.payment_url);
    } catch (e) {
      Alert.alert("Erreur paiement", e?.response?.data?.error?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>{property.title}</Text>
      <Text style={s.amount}>{amount.toLocaleString("fr-FR")} {property.currency || "XOF"}</Text>

      {/* Sélection opérateur */}
      {providers.length > 0 && (
        <>
          <Text style={s.label}>Opérateur de paiement</Text>
          <View style={s.row}>
            {providers.map((p) => (
              <TouchableOpacity
                key={p.name}
                style={[s.chip, provider === p.name && s.chipActive]}
                onPress={() => setProvider(p.name)}
              >
                <Text style={[s.chipText, provider === p.name && s.chipTextActive]}>
                  {p.label || p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* PawaPay : choix Moov / Orange */}
      {provider === "pawapay" && (
        <>
          <Text style={s.label}>Réseau mobile</Text>
          <View style={s.row}>
            {PAWAPAY_OPERATORS.map((op) => (
              <TouchableOpacity
                key={op.value}
                style={[s.chip, pawapayOperator === op.value && s.chipActive]}
                onPress={() => { setPawapayOperator(op.value); setPawapayOtp(""); }}
              >
                <Text style={[s.chipText, pawapayOperator === op.value && s.chipTextActive]}>
                  {op.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {pawapayOperator === "orange" && (
            <>
              <Text style={s.label}>Code OTP Orange Money</Text>
              <Text style={s.hint}>Composez *144*4*6# puis entrez le code reçu</Text>
              <TextInput
                value={pawapayOtp}
                onChangeText={setPawapayOtp}
                style={s.input}
                keyboardType="numeric"
                placeholder="Ex: 123456"
                maxLength={8}
              />
            </>
          )}
        </>
      )}

      {/* Numéro de téléphone */}
      <Text style={s.label}>Numéro de téléphone</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        style={s.input}
        keyboardType="phone-pad"
        placeholder="+226 70 00 00 00"
      />

      <TouchableOpacity
        style={[s.btn, !canPay && s.btnDisabled]}
        onPress={pay}
        disabled={busy || !canPay}
      >
        {busy
          ? <ActivityIndicator color="white" />
          : <Text style={s.btnText}>Payer {amount.toLocaleString("fr-FR")} {property.currency || "XOF"}</Text>
        }
      </TouchableOpacity>

      {/* Résultat */}
      {result?.ussd_code && (
        <View style={s.info}>
          <Text style={{ fontWeight: "600" }}>Composez {result.ussd_code} pour valider.</Text>
          <Text style={{ color: "#666", marginTop: 6 }}>Réf : {result.reference}</Text>
        </View>
      )}
      {result?.payment_url && (
        <TouchableOpacity onPress={() => Linking.openURL(result.payment_url)} style={s.linkBtn}>
          <Text style={s.linkBtnText}>Ouvrir la page de paiement →</Text>
        </TouchableOpacity>
      )}
      {result?.status === "succeeded" && (
        <View style={[s.info, { backgroundColor: "#d4edda" }]}>
          <Text style={{ color: "#155724", fontWeight: "600" }}>✓ Paiement confirmé</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  h1: { fontSize: 18, fontWeight: "600", marginTop: 8 },
  amount: { fontSize: 28, fontWeight: "700", color: "#0E7C66", marginTop: 4 },
  label: { marginTop: 16, color: "#555", fontWeight: "500" },
  hint: { fontSize: 12, color: "#888", marginTop: 2 },
  row: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 8 },
  chip: { backgroundColor: "#eee", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: "#0E7C66" },
  chipText: { color: "#333", fontSize: 14 },
  chipTextActive: { color: "white", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginTop: 8, fontSize: 16 },
  btn: { marginTop: 24, backgroundColor: "#0E7C66", borderRadius: 8, padding: 16, alignItems: "center" },
  btnDisabled: { backgroundColor: "#aaa" },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  info: { marginTop: 16, backgroundColor: "#fffbea", padding: 12, borderRadius: 8 },
  linkBtn: { marginTop: 12, padding: 12, alignItems: "center" },
  linkBtnText: { color: "#0E7C66", fontWeight: "600" },
});
