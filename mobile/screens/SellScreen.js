import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, FlatList,
  Modal, Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Properties, Photos, Payments } from "../lib/api";
import { useLang } from "../lib/lang";

// ─── Constantes ──────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "BF", flag: "🇧🇫", name: "Burkina Faso",   dial: "+226" },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire",  dial: "+225" },
  { code: "SN", flag: "🇸🇳", name: "Sénégal",        dial: "+221" },
  { code: "ML", flag: "🇲🇱", name: "Mali",            dial: "+223" },
  { code: "TG", flag: "🇹🇬", name: "Togo",            dial: "+228" },
  { code: "BJ", flag: "🇧🇯", name: "Bénin",           dial: "+229" },
  { code: "NE", flag: "🇳🇪", name: "Niger",           dial: "+227" },
  { code: "GN", flag: "🇬🇳", name: "Guinée",          dial: "+224" },
  { code: "GH", flag: "🇬🇭", name: "Ghana",           dial: "+233" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria",         dial: "+234" },
  { code: "CM", flag: "🇨🇲", name: "Cameroun",        dial: "+237" },
  { code: "MA", flag: "🇲🇦", name: "Maroc",           dial: "+212" },
  { code: "CD", flag: "🇨🇩", name: "Congo RDC",       dial: "+243" },
  { code: "RW", flag: "🇷🇼", name: "Rwanda",          dial: "+250" },
  { code: "KE", flag: "🇰🇪", name: "Kenya",           dial: "+254" },
];

const TX_TYPES = {
  fr: [
    { value: "sale",       label: "🏷️ Vente" },
    { value: "rent_long",  label: "🔑 Location longue" },
    { value: "rent_short", label: "🌙 Location courte" },
  ],
  en: [
    { value: "sale",       label: "🏷️ Sale" },
    { value: "rent_long",  label: "🔑 Long-term rental" },
    { value: "rent_short", label: "🌙 Short-term rental" },
  ],
};

const PROP_TYPES = {
  fr: [
    { value: "land",       label: "Terrain" },
    { value: "house",      label: "Maison" },
    { value: "apartment",  label: "Appartement" },
    { value: "office",     label: "Bureau" },
    { value: "commercial", label: "Commerce" },
  ],
  en: [
    { value: "land",       label: "Land" },
    { value: "house",      label: "House" },
    { value: "apartment",  label: "Apartment" },
    { value: "office",     label: "Office" },
    { value: "commercial", label: "Commercial" },
  ],
};

const LISTING_PLANS = [
  { months: 1,  price: 2000,  label: "1 mois",  labelEn: "1 month",   saving: null },
  { months: 3,  price: 5500,  label: "3 mois",  labelEn: "3 months",  saving: "−8%" },
  { months: 6,  price: 10000, label: "6 mois",  labelEn: "6 months",  saving: "−17%" },
  { months: 12, price: 18000, label: "12 mois", labelEn: "12 months", saving: "−25%" },
];

const PAWAPAY_OPS = {
  BF: [
    { value: "moov",   label: "Moov Money" },
    { value: "orange", label: "Orange Money (OTP)", otp: true },
  ],
  default: [
    { value: "moov",   label: "Moov Money" },
    { value: "orange", label: "Orange Money" },
  ],
};

const PROVIDER_LABELS = {
  pawapay:         "PawaPay (Mobile Money)",
  fedapay:         "FedaPay (Orange, MTN, Wave…)",
  cinetpay:        "CinetPay",
  flutterwave:     "Flutterwave",
  paydunya:        "PayDunya",
  orange_money_bf: "Orange Money BF",
  moov_money_bf:   "Moov Money BF",
  wave:            "Wave",
};

const T = {
  fr: {
    title: "Publier une annonce",
    step1: "1. Détails",
    step2: "2. Paiement",
    step3: "3. Photos",
    // Form
    txType: "Type de transaction *",
    propType: "Type de bien *",
    propTitle: "Titre de l'annonce *",
    titlePlaceholder: "Ex: Belle villa F5 à Ouaga 2000",
    country: "Pays *",
    city: "Ville *",
    cityPlaceholder: "Ex: Ouagadougou",
    price: "Prix *",
    pricePlaceholder: "Ex: 50000",
    currency: "Devise",
    description: "Description (facultatif)",
    descPlaceholder: "Décrivez le bien, ses atouts, l'accès…",
    nextBtn: "Suivant →",
    errRequired: "Titre, ville, type et prix sont requis",
    // Payment
    plan: "Durée de publication",
    buyerCountry: "Votre pays de paiement",
    paymentOp: "Mode de paiement",
    phoneLabel: "Numéro mobile money",
    mobileNet: "Réseau mobile",
    otpLabel: "Code OTP Orange Money",
    otpHint: "Composez *144*4*6# puis entrez le code reçu",
    payBtn: "Payer",
    errPhone: "Entrez votre numéro",
    errOtp: "Entrez le code OTP",
    fedapayHint: "Vous serez redirigé vers la page de paiement FedaPay.",
    noProvider: "Aucun moyen de paiement disponible pour ce pays.",
    dialCode: "Composez",
    toValidate: "pour valider.",
    waitPayment: "En attente de confirmation…",
    // Photos
    addPhotos: "Ajouter des photos",
    photosHint: "Jusqu'à 10 photos (conseillé : au moins 3)",
    uploadBtn: "Envoyer les photos",
    skipBtn: "Passer (sans photos)",
    uploadDone: "Photos envoyées !",
    // Done
    published: "✅ Annonce publiée !",
    publishedHint: "Votre annonce est en ligne. Vous pouvez la retrouver dans \"Parcourir\".",
    backBrowse: "Voir mes annonces",
    // Misc
    notLogged: "Vous devez être connecté pour publier.",
    loginBtn: "Se connecter",
    chooseCountry: "Choisir le pays",
  },
  en: {
    title: "Publish a listing",
    step1: "1. Details",
    step2: "2. Payment",
    step3: "3. Photos",
    txType: "Transaction type *",
    propType: "Property type *",
    propTitle: "Listing title *",
    titlePlaceholder: "e.g. Beautiful 5BR villa in Ouaga 2000",
    country: "Country *",
    city: "City *",
    cityPlaceholder: "e.g. Ouagadougou",
    price: "Price *",
    pricePlaceholder: "e.g. 50000",
    currency: "Currency",
    description: "Description (optional)",
    descPlaceholder: "Describe the property, highlights, access…",
    nextBtn: "Next →",
    errRequired: "Title, city, type and price are required",
    plan: "Listing duration",
    buyerCountry: "Your payment country",
    paymentOp: "Payment method",
    phoneLabel: "Mobile money number",
    mobileNet: "Mobile network",
    otpLabel: "Orange Money OTP code",
    otpHint: "Dial *144*4*6# then enter the received code",
    payBtn: "Pay",
    errPhone: "Enter your phone number",
    errOtp: "Enter the OTP code",
    fedapayHint: "You will be redirected to the FedaPay checkout page.",
    noProvider: "No payment method available for this country.",
    dialCode: "Dial",
    toValidate: "to validate.",
    waitPayment: "Waiting for confirmation…",
    addPhotos: "Add photos",
    photosHint: "Up to 10 photos (recommended: at least 3)",
    uploadBtn: "Upload photos",
    skipBtn: "Skip (no photos)",
    uploadDone: "Photos uploaded!",
    published: "✅ Listing published!",
    publishedHint: "Your listing is live. Find it in \"Browse\".",
    backBrowse: "See my listings",
    notLogged: "You must be logged in to publish.",
    loginBtn: "Log in",
    chooseCountry: "Choose country",
  },
};

// ─── Modal sélecteur pays ─────────────────────────────────────────────────────
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
              <Text style={s.optionText}>{item.flag} {item.name}</Text>
              {selected === item.code && <Text style={{ color: "#0E7C66" }}>✓</Text>}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SellScreen({ navigation }) {
  const { lang } = useLang();
  const t = T[lang] || T.fr;
  const txTypes = TX_TYPES[lang] || TX_TYPES.fr;
  const propTypes = PROP_TYPES[lang] || PROP_TYPES.fr;

  const [loggedIn, setLoggedIn] = useState(null); // null=loading

  useEffect(() => {
    AsyncStorage.getItem("immobf_token").then((tok) => setLoggedIn(Boolean(tok)));
  }, []);

  // ─── Étape courante ───────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [propertyId, setPropertyId] = useState(null);

  // ─── Étape 1 : formulaire ─────────────────────────────────────────────────
  const [form, setForm] = useState({
    transaction_type: "sale",
    type: "house",
    title: "",
    description: "",
    price: "",
    currency: "XOF",
    country_code: "BF",
    city: "",
  });
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [formBusy, setFormBusy] = useState(false);

  async function submitForm() {
    if (!form.title.trim() || !form.city.trim() || !form.price) {
      return Alert.alert("Erreur", t.errRequired);
    }
    setFormBusy(true);
    try {
      const isRent = form.transaction_type !== "sale";
      const payload = {
        ...form,
        price: Number(form.price),
        rent_period: isRent ? "monthly" : null,
      };
      const res = await Properties.create(payload);
      setPropertyId(res.property.id);
      setStep(2);
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || e.message);
    } finally { setFormBusy(false); }
  }

  // ─── Étape 2 : paiement frais de publication ──────────────────────────────
  const [selectedPlan, setSelectedPlan] = useState(LISTING_PLANS[0]);
  const [buyerCountry, setBuyerCountry] = useState(COUNTRIES[0]);
  const [showBuyerCountryModal, setShowBuyerCountryModal] = useState(false);
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [pawapayOperator, setPawapayOperator] = useState("moov");
  const [pawapayOtp, setPawapayOtp] = useState("");
  const [txId, setTxId] = useState(null);
  const [ussdCode, setUssdCode] = useState(null);
  const [payBusy, setPayBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);

  // Init buyer country from form country when arriving at step 2
  useEffect(() => {
    if (step !== 2) return;
    const c = COUNTRIES.find((c) => c.code === form.country_code) || COUNTRIES[0];
    setBuyerCountry(c);
  }, [step]);

  // Reload providers when buyer country changes
  useEffect(() => {
    if (step !== 2) return;
    setPawapayOperator("moov");
    setPawapayOtp("");
    Payments.providers(buyerCountry.code).then((d) => {
      const list = d.providers || [];
      setProviders(list);
      const fp = list.find((p) => p.name === "fedapay");
      setProvider(fp ? "fedapay" : (list[0]?.name || ""));
    }).catch(() => {});
  }, [step, buyerCountry]);

  // Polling after payment initiation
  useEffect(() => {
    if (!polling || !txId) return;
    pollRef.current = setInterval(async () => {
      try {
        const data = await Payments.get(txId);
        if (data.transaction.status === "succeeded") {
          clearInterval(pollRef.current);
          setPolling(false);
          setStep(3);
        } else if (data.transaction.status === "failed") {
          clearInterval(pollRef.current);
          setPolling(false);
          Alert.alert("Erreur", lang === "fr" ? "Le paiement a échoué." : "Payment failed.");
        }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [polling, txId]);

  const ops = PAWAPAY_OPS[buyerCountry.code] || PAWAPAY_OPS.default;
  const currentOp = ops.find((o) => o.value === pawapayOperator);
  const needsOtp = provider === "pawapay" && currentOp?.otp;
  const fullPhone = `${buyerCountry.dial}${localPhone.replace(/^0+/, "")}`;

  async function payListingFee() {
    if (!localPhone) return Alert.alert("Erreur", t.errPhone);
    if (needsOtp && !pawapayOtp) return Alert.alert("Erreur", t.errOtp);
    setPayBusy(true);
    try {
      const res = await Payments.initiate({
        provider,
        amount: selectedPlan.price,
        currency: "XOF",
        property_id: propertyId,
        purpose: "listing_fee",
        customer_phone: fullPhone,
        preferred_operator: provider === "pawapay" ? pawapayOperator : null,
        pawapay_otp: needsOtp ? pawapayOtp : null,
        description: `ImmoBF Africa — ${selectedPlan.price.toLocaleString("fr-FR")} FCFA`,
      });
      setTxId(res.transaction_id);
      if (res.status === "succeeded") { setStep(3); return; }
      if (res.payment_url) { Linking.openURL(res.payment_url); setPolling(true); return; }
      if (res.ussd_code) { setUssdCode(res.ussd_code); }
      setPolling(true);
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || e.message);
    } finally { setPayBusy(false); }
  }

  // ─── Étape 3 : photos ─────────────────────────────────────────────────────
  const [photos, setPhotos] = useState([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function pickPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission requise", "Autorisez l'accès à la galerie dans les paramètres.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets].slice(0, 10));
    }
  }

  async function uploadPhotos() {
    if (!photos.length) { setDone(true); return; }
    setUploadBusy(true);
    try {
      await Photos.upload(propertyId, photos);
      setDone(true);
    } catch (e) {
      Alert.alert("Erreur", e?.response?.data?.error?.message || e.message);
    } finally { setUploadBusy(false); }
  }

  // ─── Garde : non connecté ─────────────────────────────────────────────────
  if (loggedIn === null) {
    return <View style={s.center}><ActivityIndicator color="#0E7C66" /></View>;
  }
  if (!loggedIn) {
    return (
      <View style={s.center}>
        <Text style={s.notLogged}>{t.notLogged}</Text>
        <TouchableOpacity style={s.btn} onPress={() => navigation.navigate("Compte")}>
          <Text style={s.btnText}>{t.loginBtn}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Stepper ──────────────────────────────────────────────────────────────
  const steps = [t.step1, t.step2, t.step3];

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <Text style={s.h1}>{t.title}</Text>

      {/* Steps indicator */}
      <View style={s.stepRow}>
        {steps.map((label, i) => (
          <View key={i} style={[s.stepChip, step === i + 1 && s.stepChipActive, step > i + 1 && s.stepChipDone]}>
            <Text style={[s.stepChipText, (step === i + 1 || step > i + 1) && s.stepChipTextActive]}>
              {step > i + 1 ? "✓" : label}
            </Text>
          </View>
        ))}
      </View>

      {/* ─── ÉTAPE 1 : Formulaire ──────────────────────────────────────────── */}
      {step === 1 && (
        <View>
          {/* Type de transaction */}
          <Text style={s.label}>{t.txType}</Text>
          <View style={s.chipRow}>
            {txTypes.map((tx) => (
              <TouchableOpacity
                key={tx.value}
                style={[s.chip, form.transaction_type === tx.value && s.chipActive]}
                onPress={() => setForm({ ...form, transaction_type: tx.value })}
              >
                <Text style={[s.chipText, form.transaction_type === tx.value && s.chipTextActive]}>
                  {tx.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Type de bien */}
          <Text style={s.label}>{t.propType}</Text>
          <View style={s.chipRow}>
            {propTypes.map((pt) => (
              <TouchableOpacity
                key={pt.value}
                style={[s.chip, form.type === pt.value && s.chipActive]}
                onPress={() => setForm({ ...form, type: pt.value })}
              >
                <Text style={[s.chipText, form.type === pt.value && s.chipTextActive]}>
                  {pt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Titre */}
          <Text style={s.label}>{t.propTitle}</Text>
          <TextInput
            placeholder={t.titlePlaceholder}
            value={form.title} onChangeText={(v) => setForm({ ...form, title: v })}
            style={s.input} maxLength={120}
          />

          {/* Pays */}
          <Text style={s.label}>{t.country}</Text>
          <TouchableOpacity style={s.countryBtn} onPress={() => setShowCountryModal(true)}>
            <Text style={s.countryBtnText}>
              {(COUNTRIES.find((c) => c.code === form.country_code) || COUNTRIES[0]).flag}{" "}
              {(COUNTRIES.find((c) => c.code === form.country_code) || COUNTRIES[0]).name}
            </Text>
            <Text style={s.arrow}>▾</Text>
          </TouchableOpacity>

          {/* Ville */}
          <Text style={s.label}>{t.city}</Text>
          <TextInput
            placeholder={t.cityPlaceholder}
            value={form.city} onChangeText={(v) => setForm({ ...form, city: v })}
            style={s.input}
          />

          {/* Prix + devise */}
          <Text style={s.label}>{t.price}</Text>
          <View style={s.priceRow}>
            <TextInput
              placeholder={t.pricePlaceholder}
              value={form.price} onChangeText={(v) => setForm({ ...form, price: v })}
              style={[s.input, { flex: 1, marginTop: 0 }]}
              keyboardType="numeric"
            />
            <View style={s.currencyBtns}>
              {["XOF", "EUR", "USD"].map((cur) => (
                <TouchableOpacity
                  key={cur}
                  style={[s.currencyChip, form.currency === cur && s.currencyChipActive]}
                  onPress={() => setForm({ ...form, currency: cur })}
                >
                  <Text style={[s.currencyText, form.currency === cur && s.currencyTextActive]}>
                    {cur}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <Text style={s.label}>{t.description}</Text>
          <TextInput
            placeholder={t.descPlaceholder}
            value={form.description} onChangeText={(v) => setForm({ ...form, description: v })}
            style={[s.input, { height: 90, textAlignVertical: "top" }]}
            multiline numberOfLines={4}
          />

          <TouchableOpacity
            style={[s.btn, formBusy && s.btnDisabled]}
            onPress={submitForm} disabled={formBusy}
          >
            {formBusy
              ? <ActivityIndicator color="white" />
              : <Text style={s.btnText}>{t.nextBtn}</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* ─── ÉTAPE 2 : Paiement ────────────────────────────────────────────── */}
      {step === 2 && (
        <View>
          {/* Plans */}
          <Text style={s.label}>{t.plan}</Text>
          <View style={s.chipRow}>
            {LISTING_PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.months}
                style={[s.planChip, selectedPlan.months === plan.months && s.chipActive]}
                onPress={() => setSelectedPlan(plan)}
              >
                <Text style={[s.chipText, selectedPlan.months === plan.months && s.chipTextActive]}>
                  {lang === "en" ? plan.labelEn : plan.label}
                </Text>
                <Text style={[s.planPrice, selectedPlan.months === plan.months && { color: "white" }]}>
                  {plan.price.toLocaleString("fr-FR")} XOF
                </Text>
                {plan.saving && (
                  <Text style={[s.planSaving, selectedPlan.months === plan.months && { color: "#b2f0e0" }]}>
                    {plan.saving}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Pays de paiement */}
          <Text style={s.label}>{t.buyerCountry}</Text>
          <TouchableOpacity style={s.countryBtn} onPress={() => setShowBuyerCountryModal(true)}>
            <Text style={s.countryBtnText}>{buyerCountry.flag} {buyerCountry.name}</Text>
            <Text style={s.arrow}>▾</Text>
          </TouchableOpacity>

          {/* Mode de paiement */}
          <Text style={s.label}>{t.paymentOp}</Text>
          {providers.length === 0 ? (
            <Text style={s.noProvider}>{t.noProvider}</Text>
          ) : (
            <View style={s.chipRow}>
              {providers.map((p) => (
                <TouchableOpacity
                  key={p.name}
                  style={[s.chip, provider === p.name && s.chipActive]}
                  onPress={() => setProvider(p.name)}
                >
                  <Text style={[s.chipText, provider === p.name && s.chipTextActive]}>
                    {PROVIDER_LABELS[p.name] || p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* FedaPay : hint */}
          {provider === "fedapay" && (
            <View style={s.infoBox}>
              <Text style={s.infoText}>{t.fedapayHint}</Text>
            </View>
          )}

          {/* PawaPay : réseau + OTP */}
          {provider === "pawapay" && (
            <>
              <Text style={s.label}>{t.mobileNet}</Text>
              <View style={s.chipRow}>
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
              value={localPhone} onChangeText={setLocalPhone}
              style={[s.input, { flex: 1, marginTop: 0 }]}
              keyboardType="phone-pad" placeholder="70 00 00 00"
            />
          </View>

          {/* USSD code */}
          {ussdCode && (
            <View style={s.ussdBox}>
              <Text style={s.ussdText}>{t.dialCode} <Text style={{ fontWeight: "700" }}>{ussdCode}</Text> {t.toValidate}</Text>
            </View>
          )}

          {/* Attente polling */}
          {polling && (
            <View style={s.waitBox}>
              <ActivityIndicator color="#0E7C66" />
              <Text style={s.waitText}>{t.waitPayment}</Text>
            </View>
          )}

          {!polling && (
            <TouchableOpacity
              style={[s.btn, (payBusy || !provider || providers.length === 0) && s.btnDisabled]}
              onPress={payListingFee}
              disabled={payBusy || !provider || providers.length === 0}
            >
              {payBusy
                ? <ActivityIndicator color="white" />
                : <Text style={s.btnText}>
                    {t.payBtn} — {selectedPlan.price.toLocaleString("fr-FR")} XOF
                  </Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ─── ÉTAPE 3 : Photos ──────────────────────────────────────────────── */}
      {step === 3 && !done && (
        <View>
          <Text style={s.hint}>{t.photosHint}</Text>

          <TouchableOpacity style={s.photoPickBtn} onPress={pickPhotos}>
            <Text style={s.photoPickText}>📷 {t.addPhotos} ({photos.length}/10)</Text>
          </TouchableOpacity>

          {photos.length > 0 && (
            <View style={s.photoGrid}>
              {photos.map((a, i) => (
                <View key={i} style={s.photoThumb}>
                  <Image source={{ uri: a.uri }} style={s.thumbImg} />
                  <TouchableOpacity
                    style={s.removePhoto}
                    onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[s.btn, uploadBusy && s.btnDisabled]}
            onPress={uploadPhotos} disabled={uploadBusy}
          >
            {uploadBusy
              ? <ActivityIndicator color="white" />
              : <Text style={s.btnText}>{t.uploadBtn}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.skipBtn} onPress={() => setDone(true)}>
            <Text style={s.skipText}>{t.skipBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── SUCCÈS ────────────────────────────────────────────────────────── */}
      {step === 3 && done && (
        <View style={s.doneBox}>
          <Text style={s.doneTitle}>{t.published}</Text>
          <Text style={s.doneHint}>{t.publishedHint}</Text>
          <TouchableOpacity
            style={[s.btn, { marginTop: 24 }]}
            onPress={() => navigation.navigate("Parcourir")}
          >
            <Text style={s.btnText}>{t.backBrowse}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals pays */}
      <CountryModal
        visible={showCountryModal}
        selected={form.country_code}
        onSelect={(c) => setForm({ ...form, country_code: c.code })}
        onClose={() => setShowCountryModal(false)}
        title={t.chooseCountry}
      />
      <CountryModal
        visible={showBuyerCountryModal}
        selected={buyerCountry.code}
        onSelect={setBuyerCountry}
        onClose={() => setShowBuyerCountryModal(false)}
        title={t.buyerCountry}
      />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  notLogged: { fontSize: 16, color: "#555", textAlign: "center", marginBottom: 16 },
  h1: { fontSize: 22, fontWeight: "700", marginTop: 8, marginBottom: 12 },
  // Steps
  stepRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  stepChip: { flex: 1, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 6, borderWidth: 1, borderColor: "#ccc", alignItems: "center" },
  stepChipActive: { borderColor: "#0E7C66", backgroundColor: "#0E7C66" },
  stepChipDone: { borderColor: "#0E7C66", backgroundColor: "#d4ede8" },
  stepChipText: { fontSize: 11, color: "#888" },
  stepChipTextActive: { color: "white", fontWeight: "700" },
  // Form
  label: { marginTop: 14, marginBottom: 4, fontWeight: "600", color: "#444" },
  hint: { fontSize: 12, color: "#888", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 15, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { backgroundColor: "#eee", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: "#0E7C66" },
  chipText: { color: "#333", fontSize: 13 },
  chipTextActive: { color: "white", fontWeight: "600" },
  countryBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#0E7C66", borderRadius: 8, padding: 12, marginTop: 4, backgroundColor: "#f0faf6" },
  countryBtnText: { flex: 1, fontSize: 15, color: "#333" },
  arrow: { fontSize: 12, color: "#888" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  currencyBtns: { flexDirection: "row", gap: 4 },
  currencyChip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#eee" },
  currencyChipActive: { backgroundColor: "#0E7C66" },
  currencyText: { fontSize: 13, color: "#333" },
  currencyTextActive: { color: "white", fontWeight: "700" },
  // Payment
  planChip: { backgroundColor: "#eee", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minWidth: 80 },
  planPrice: { fontSize: 11, color: "#555", marginTop: 2 },
  planSaving: { fontSize: 10, color: "#0E7C66", marginTop: 1 },
  noProvider: { color: "#888", fontStyle: "italic", fontSize: 14, marginTop: 6 },
  infoBox: { backgroundColor: "#e8f5e9", borderRadius: 8, padding: 10, marginTop: 8 },
  infoText: { color: "#2e7d32", fontSize: 13, lineHeight: 18 },
  phoneRow: { flexDirection: "row", gap: 8, marginTop: 4, alignItems: "center" },
  dialBox: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, backgroundColor: "#f5f5f5" },
  dialText: { fontSize: 15, color: "#333", fontWeight: "600" },
  ussdBox: { marginTop: 10, padding: 12, backgroundColor: "#fffbea", borderRadius: 8 },
  ussdText: { color: "#555", fontSize: 14 },
  waitBox: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 16, padding: 12, backgroundColor: "#f0faf6", borderRadius: 8 },
  waitText: { color: "#0E7C66", fontSize: 14 },
  // Photos
  photoPickBtn: { marginTop: 8, borderWidth: 2, borderColor: "#0E7C66", borderStyle: "dashed", borderRadius: 10, padding: 16, alignItems: "center" },
  photoPickText: { color: "#0E7C66", fontSize: 15, fontWeight: "600" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  photoThumb: { width: 80, height: 80, borderRadius: 6, overflow: "hidden", position: "relative" },
  thumbImg: { width: 80, height: 80 },
  removePhoto: { position: "absolute", top: 2, right: 2, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  skipBtn: { marginTop: 12, alignItems: "center", padding: 10 },
  skipText: { color: "#0E7C66", fontSize: 14 },
  // Done
  doneBox: { alignItems: "center", paddingVertical: 40 },
  doneTitle: { fontSize: 24, fontWeight: "700", color: "#0E7C66" },
  doneHint: { fontSize: 15, color: "#555", textAlign: "center", marginTop: 12, lineHeight: 22 },
  // Shared
  btn: { marginTop: 20, backgroundColor: "#0E7C66", borderRadius: 8, padding: 14, alignItems: "center" },
  btnDisabled: { backgroundColor: "#aaa" },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  // Modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "65%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  sheetTitle: { fontSize: 16, fontWeight: "700" },
  sheetClose: { fontSize: 18, color: "#888", padding: 4 },
  option: { padding: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  optionActive: { backgroundColor: "#f0faf6" },
  optionText: { flex: 1, fontSize: 15, color: "#333" },
});
