import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking, ScrollView, Modal, FlatList,
} from "react-native";
import { Payments } from "../lib/api";
import { useLang } from "../lib/lang";

const COUNTRIES = [
  { code: "BF", label: "🇧🇫 Burkina Faso", dial: "+226" },
  { code: "CI", label: "🇨🇮 Côte d'Ivoire", dial: "+225" },
  { code: "SN", label: "🇸🇳 Sénégal",       dial: "+221" },
  { code: "ML", label: "🇲🇱 Mali",           dial: "+223" },
  { code: "TG", label: "🇹🇬 Togo",           dial: "+228" },
  { code: "BJ", label: "🇧🇯 Bénin",          dial: "+229" },
  { code: "NE", label: "🇳🇪 Niger",          dial: "+227" },
  { code: "GN", label: "🇬🇳 Guinée",         dial: "+224" },
  { code: "GH", label: "🇬🇭 Ghana",          dial: "+233" },
  { code: "NG", label: "🇳🇬 Nigeria",        dial: "+234" },
  { code: "CM", label: "🇨🇲 Cameroun",       dial: "+237" },
  { code: "CD", label: "🇨🇩 Congo RDC",      dial: "+243" },
  { code: "MA", label: "🇲🇦 Maroc",          dial: "+212" },
  { code: "RW", label: "🇷🇼 Rwanda",         dial: "+250" },
  { code: "KE", label: "🇰🇪 Kenya",          dial: "+254" },
];

// Opérateurs PawaPay par pays
const PAWAPAY_OPS = {
  BF: [
    { value: "moov",   label: "Moov Money" },
    { value: "orange", label: "Orange Money (OTP requis)", otp: true },
  ],
  CI: [
    { value: "orange", label: "Orange Money" },
    { value: "mtn",    label: "MTN Mobile Money" },
  ],
  SN: [
    { value: "orange", label: "Orange Money" },
    { value: "free",   label: "Free Money" },
  ],
  ML: [
    { value: "orange", label: "Orange Money" },
    { value: "moov",   label: "Moov Money" },
  ],
  default: [
    { value: "moov",   label: "Moov Money" },
    { value: "orange", label: "Orange Money" },
  ],
};

const T = {
  fr: {
    buyerCountry: "Votre pays",
    chooseCountry: "Choisir votre pays",
    paymentOp: "Opérateur de paiement",
    mobileNet: "Réseau mobile",
    otpLabel: "Code OTP Orange Money",
    otpHint: "Composez *144*4*6# puis entrez le code reçu",
    phoneLabel: "Numéro de téléphone mobile money",
    payBtn: "Payer",
    errPhone: "Entrez votre numéro de téléphone",
    errOtp: "Entrez le code OTP Orange Money",
    confirmed: "✓ Paiement confirmé",
    openPage: "Ouvrir la page de paiement →",
    dialCode: "Composez",
    toValidate: "pour valider.",
    ref: "Réf",
  },
  en: {
    buyerCountry: "Your country",
    chooseCountry: "Choose your country",
    paymentOp: "Payment operator",
    mobileNet: "Mobile network",
    otpLabel: "Orange Money OTP code",
    otpHint: "Dial *144*4*6# then enter the code received",
    phoneLabel: "Mobile money phone number",
    payBtn: "Pay",
    errPhone: "Enter your phone number",
    errOtp: "Enter the Orange Money OTP code",
    confirmed: "✓ Payment confirmed",
    openPage: "Open payment page →",
    dialCode: "Dial",
    toValidate: "to validate.",
    ref: "Ref",
  },
};

function CountryModal({ visible, selected, onSelect, onClose, title }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}><Text style={s.sheetClose}>✕</Text></TouchableOpacity>
        </View>
        <FlatList
          data={COUNTRIES}
          keyExtractor={(c) => c.code}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.option, selected === item.code && s.optionActive]}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={[s.optionText, selected === item.code && s.optionTextActive]}>
                {item.label}
              </Text>
              <Text style={s.optionDial}>{item.dial}</Text>
              {selected === item.code && <Text style={{ color: "#0E7C66" }}>✓</Text>}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

export default function PaymentScreen({ route }) {
  const { lang } = useLang();
  const t = T[lang] || T.fr;

  const { property, amount, purpose = "commission" } = route.params;

  // Pays de l'acheteur (pas forcément celui de l'annonce)
  const defaultCountry = COUNTRIES.find((c) => c.code === (property.country_code || "BF")) || COUNTRIES[0];
  const [buyerCountry, setBuyerCountry] = useState(defaultCountry);
  const [showCountryModal, setShowCountryModal] = useState(false);

  const ops = PAWAPAY_OPS[buyerCountry.code] || PAWAPAY_OPS.default;

  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  const [pawapayOperator, setPawapayOperator] = useState(ops[0]?.value || "moov");
  const [pawapayOtp, setPawapayOtp] = useState("");
  const [phoneLocal, setPhoneLocal] = useState(""); // numéro sans indicatif
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  // Recharger les opérateurs quand le pays change
  useEffect(() => {
    setProvider("");
    setPawapayOperator((PAWAPAY_OPS[buyerCountry.code] || PAWAPAY_OPS.default)[0]?.value || "moov");
    setPawapayOtp("");
    Payments.providers(buyerCountry.code).then((d) => {
      setProviders(d.providers || []);
      setProvider(d.providers?.[0]?.name || "");
    }).catch(() => {});
  }, [buyerCountry]);

  const fullPhone = `${buyerCountry.dial}${phoneLocal.replace(/^0+/, "")}`;
  const currentOp = ops.find((o) => o.value === pawapayOperator);
  const needsOtp = provider === "pawapay" && currentOp?.otp;
  const canPay = phoneLocal.length >= 6 && provider && !(needsOtp && !pawapayOtp);

  async function pay() {
    if (!canPay) {
      Alert.alert("Champs requis", needsOtp ? t.errOtp : t.errPhone);
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
        customer_phone: fullPhone,
        buyer_country: buyerCountry.code,
      };
      if (provider === "pawapay") {
        payload.preferred_operator = pawapayOperator;
        if (needsOtp) payload.pawapay_otp = pawapayOtp;
      }
      const r = await Payments.initiate(payload);
      setResult(r);
      if (r.payment_url) Linking.openURL(r.payment_url);
    } catch (e) {
      Alert.alert("Erreur paiement", e?.response?.data?.error?.message || e.message);
    } finally { setBusy(false); }
  }

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>{property.title}</Text>
      <Text style={s.amount}>{amount.toLocaleString("fr-FR")} {property.currency || "XOF"}</Text>

      {/* Pays de l'acheteur */}
      <Text style={s.label}>{t.buyerCountry}</Text>
      <TouchableOpacity style={s.countryBtn} onPress={() => setShowCountryModal(true)}>
        <Text style={s.countryBtnText}>{buyerCountry.label}</Text>
        <Text style={s.countryDial}>{buyerCountry.dial}</Text>
        <Text style={s.arrow}>▾</Text>
      </TouchableOpacity>

      {/* Opérateur de paiement */}
      {providers.length > 0 && (
        <>
          <Text style={s.label}>{t.paymentOp}</Text>
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

      {/* PawaPay : choix réseau */}
      {provider === "pawapay" && (
        <>
          <Text style={s.label}>{t.mobileNet}</Text>
          <View style={s.row}>
            {ops.map((op) => (
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

          {needsOtp && (
            <>
              <Text style={s.label}>{t.otpLabel}</Text>
              <Text style={s.hint}>{t.otpHint}</Text>
              <TextInput
                value={pawapayOtp} onChangeText={setPawapayOtp}
                style={s.input} keyboardType="numeric" placeholder="Ex: 123456" maxLength={8}
              />
            </>
          )}
        </>
      )}

      {/* Numéro de téléphone */}
      <Text style={s.label}>{t.phoneLabel}</Text>
      <View style={s.phoneRow}>
        <View style={s.dialBox}><Text style={s.dialText}>{buyerCountry.dial}</Text></View>
        <TextInput
          value={phoneLocal}
          onChangeText={setPhoneLocal}
          style={[s.input, { flex: 1, marginTop: 0 }]}
          keyboardType="phone-pad"
          placeholder="70 00 00 00"
        />
      </View>

      <TouchableOpacity style={[s.btn, !canPay && s.btnDisabled]} onPress={pay} disabled={busy || !canPay}>
        {busy
          ? <ActivityIndicator color="white" />
          : <Text style={s.btnText}>{t.payBtn} {amount.toLocaleString("fr-FR")} {property.currency || "XOF"}</Text>
        }
      </TouchableOpacity>

      {result?.ussd_code && (
        <View style={s.info}>
          <Text style={{ fontWeight: "600" }}>{t.dialCode} {result.ussd_code} {t.toValidate}</Text>
          <Text style={{ color: "#666", marginTop: 6 }}>{t.ref} : {result.reference}</Text>
        </View>
      )}
      {result?.payment_url && (
        <TouchableOpacity onPress={() => Linking.openURL(result.payment_url)} style={s.linkBtn}>
          <Text style={s.linkBtnText}>{t.openPage}</Text>
        </TouchableOpacity>
      )}
      {result?.status === "succeeded" && (
        <View style={[s.info, { backgroundColor: "#d4edda" }]}>
          <Text style={{ color: "#155724", fontWeight: "600" }}>{t.confirmed}</Text>
        </View>
      )}

      <CountryModal
        visible={showCountryModal}
        selected={buyerCountry.code}
        onSelect={setBuyerCountry}
        onClose={() => setShowCountryModal(false)}
        title={t.chooseCountry}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  h1: { fontSize: 18, fontWeight: "600", marginTop: 8 },
  amount: { fontSize: 28, fontWeight: "700", color: "#0E7C66", marginTop: 4 },
  label: { marginTop: 16, color: "#555", fontWeight: "500" },
  hint: { fontSize: 12, color: "#888", marginTop: 2 },
  countryBtn: {
    flexDirection: "row", alignItems: "center", marginTop: 8,
    borderWidth: 1, borderColor: "#0E7C66", borderRadius: 8,
    padding: 12, backgroundColor: "#f0faf6",
  },
  countryBtnText: { flex: 1, fontSize: 15, color: "#333" },
  countryDial: { fontSize: 14, color: "#0E7C66", fontWeight: "600", marginRight: 8 },
  arrow: { fontSize: 12, color: "#888" },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  dialBox: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 8,
    padding: 12, backgroundColor: "#f5f5f5",
  },
  dialText: { fontSize: 16, color: "#333", fontWeight: "600" },
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
  // Modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "65%" },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee",
  },
  sheetTitle: { fontSize: 16, fontWeight: "700" },
  sheetClose: { fontSize: 18, color: "#888", padding: 4 },
  option: { padding: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  optionActive: { backgroundColor: "#f0faf6" },
  optionText: { flex: 1, fontSize: 15, color: "#333" },
  optionTextActive: { color: "#0E7C66", fontWeight: "600" },
  optionDial: { fontSize: 13, color: "#888", marginRight: 8 },
});
