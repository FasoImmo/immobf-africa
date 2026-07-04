import React, { useState, useEffect, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLang } from "../lib/lang";
import { Properties } from "../lib/api";
import FallbackImage from "../components/FallbackImage";

const T = {
  fr: {
    noListing: "Aucune annonce",
    commission: "Commission (5%)",
    total: "Total séjour",
    nights: "nuit(s)",
    months: "mois",
    duration: "Durée",
    arrival: "Date d'arrivée",
    departure: "Date de départ",
    pricePerNight: "Prix / nuit",
    pricePerMonth: "Prix / mois",
    salePrice: "Prix de vente",
    payBtn: "Réserver et payer la commission",
    whatsappBtn: "Contacter sur WhatsApp",
    contactOwner: "Contacter l'annonceur",
    sale: "Vente",
    rentLong: "Location longue durée",
    rentShort: "Court séjour",
    noContact: "Aucun contact disponible",
    lockMsg: "🔒 Réglez la commission pour débloquer le contact WhatsApp de l'annonceur.",
  },
  en: {
    noListing: "No listing",
    commission: "Commission (5%)",
    total: "Total stay",
    nights: "night(s)",
    months: "month(s)",
    duration: "Duration",
    arrival: "Check-in date",
    departure: "Check-out date",
    pricePerNight: "Price / night",
    pricePerMonth: "Price / month",
    salePrice: "Sale price",
    payBtn: "Book and pay commission",
    whatsappBtn: "Contact on WhatsApp",
    contactOwner: "Contact the advertiser",
    sale: "For sale",
    rentLong: "Long-term rental",
    rentShort: "Short stay",
    noContact: "No contact available",
    lockMsg: "🔒 Pay the commission to unlock the advertiser's WhatsApp contact.",
  },
};

// Formate une date en DD/MM/YYYY
function fmtDate(d) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function Stepper({ value, onChange, min = 1, max = 365 }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - 1))}>
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.min(max, value + 1))}>
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function DateStepper({ label, date, onPrev, onNext }) {
  return (
    <View style={styles.dateStepper}>
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateBtn} onPress={onPrev}>
          <Text style={styles.dateBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateValue}>{fmtDate(date)}</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={onNext}>
          <Text style={styles.dateBtnText}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PropertyScreen({ route, navigation }) {
  const { lang } = useLang();
  const t = T[lang] || T.fr;

  const initialProp = route.params?.property;
  const [prop, setProp] = useState(initialProp);
  const [loading, setLoading] = useState(false);
  const [commissionPaid, setCommissionPaid] = useState(false);

  // Recharge l'état "commission payée" depuis AsyncStorage chaque fois que l'écran est visible
  // (notamment au retour depuis PaymentScreen)
  useFocusEffect(useCallback(() => {
    const id = initialProp?.id;
    if (!id) return;
    AsyncStorage.getItem(`commission_paid_${id}`)
      .then((v) => { if (v === "1") setCommissionPaid(true); })
      .catch(() => {});
  }, [initialProp?.id]));

  // Re-fetch avec la bonne langue quand lang change
  useEffect(() => {
    if (!initialProp?.id) return;
    setLoading(true);
    Properties.get(initialProp.id, lang)
      .then((d) => setProp(d.property || d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lang, initialProp?.id]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [duration, setDuration] = useState(1);
  const [arrival, setArrival] = useState(today);

  const p = prop || initialProp;
  if (!p) return <Text style={{ padding: 20 }}>{t.noListing}</Text>;

  const unitPrice = Number(p.price) || 0;
  const cur = p.currency || "XOF";
  const cover = p.photos?.[0]?.url;
  const type = p.transaction_type;

  const isShort = type === "rent_short";
  const isLong = type === "rent_long";
  const isSale = !isShort && !isLong;

  // Commission court séjour (sur durée choisie) et longue durée (1 mois)
  const totalAmount = unitPrice * duration;
  const commission = Math.round(totalAmount * (Number(p.deposit_pct || 5) / 100));
  const commissionLong = Math.max(100, Math.round(unitPrice * (Number(p.deposit_pct || 5) / 100)));
  const departure = addDays(arrival, duration);

  const typeLabel = isShort ? t.rentShort : isLong ? t.rentLong : t.sale;
  const priceLabel = isShort ? t.pricePerNight : isLong ? t.pricePerMonth : t.salePrice;
  const unitLabel = t.nights;

  // Contact WhatsApp de l'annonceur
  const ownerWa = p.owner_whatsapp || p.owner_phone || null;
  function openWhatsApp() {
    if (!ownerWa) return;
    const clean = ownerWa.replace(/\s+/g, "").replace(/^\+/, "");
    const msg = encodeURIComponent(
      lang === "fr"
        ? `Bonjour, je vous contacte au sujet de votre annonce "${p.title}" sur ImmoBF Africa.`
        : `Hello, I'm contacting you about your listing "${p.title}" on ImmoBF Africa.`
    );
    Linking.openURL(`https://wa.me/${clean}?text=${msg}`);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "white" }}>
      <FallbackImage source={{ uri: cover }} style={{ width: "100%", height: 240 }} />
      <View style={{ padding: 16 }}>
        {loading && <ActivityIndicator color="#0E7C66" style={{ marginBottom: 8 }} />}

        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{typeLabel}</Text>
        </View>
        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.city}>{p.city}, {p.country_code}</Text>
        <Text style={styles.body}>{p.description}</Text>

        {/* Prix unitaire */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>{priceLabel}</Text>
          <Text style={styles.price}>{unitPrice.toLocaleString("fr-FR")} {cur}</Text>
        </View>

        {/* ── COURT SÉJOUR : sélecteur dates + commission + paiement ── */}
        {isShort && (
          <>
            <View style={styles.durationBox}>
              <DateStepper
                label={t.arrival}
                date={arrival}
                onPrev={() => { const d = addDays(arrival, -1); if (d >= today) setArrival(d); }}
                onNext={() => setArrival(addDays(arrival, 1))}
              />
              <View style={[styles.durationRow, { marginTop: 14 }]}>
                <Text style={styles.durationLabel}>{t.duration}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Stepper value={duration} onChange={setDuration} min={1} max={90} />
                  <Text style={styles.durationUnit}>{unitLabel}</Text>
                </View>
              </View>
              <View style={[styles.dateRow, { marginTop: 10, justifyContent: "flex-start", gap: 8 }]}>
                <Text style={styles.dateLabel}>{t.departure}</Text>
                <Text style={[styles.dateValue, { fontSize: 14, color: "#0E7C66" }]}>{fmtDate(departure)}</Text>
              </View>
            </View>

            <View style={styles.recap}>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>{t.total}</Text>
                <Text style={styles.recapValue}>{totalAmount.toLocaleString("fr-FR")} {cur}</Text>
              </View>
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>{t.commission}</Text>
                <Text style={[styles.recapValue, { color: "#0E7C66", fontWeight: "700" }]}>
                  {commission.toLocaleString("fr-FR")} {cur}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.btn}
              onPress={() => navigation.navigate("Payment", {
                property: p,
                amount: commission,
                duration,
                arrival: fmtDate(arrival),
                departure: fmtDate(departure),
                total: totalAmount,
              })}
            >
              <Text style={styles.btnText}>{t.payBtn}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── COURT SÉJOUR : WhatsApp affiché si commission déjà payée ── */}
        {isShort && commissionPaid && ownerWa && (
          <View style={[styles.contactBox, { marginTop: 12 }]}>
            <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp}>
              <Text style={styles.waIcon}>💬</Text>
              <Text style={styles.waBtnText}>{ownerWa}  —  {t.whatsappBtn}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── LOCATION LONGUE DURÉE : commission + WhatsApp gated ── */}
        {isLong && (
          <View style={styles.contactBox}>
            <Text style={styles.contactLabel}>{t.contactOwner}</Text>
            {!commissionPaid ? (
              <>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => navigation.navigate("Payment", {
                    property: p,
                    amount: commissionLong,
                    duration: 1,
                    arrival: fmtDate(today),
                    departure: fmtDate(addDays(today, 30)),
                    total: unitPrice,
                  })}
                >
                  <Text style={styles.btnText}>{t.payBtn} — {commissionLong.toLocaleString("fr-FR")} {cur}</Text>
                </TouchableOpacity>
                {ownerWa && <Text style={styles.lockMsg}>{t.lockMsg}</Text>}
              </>
            ) : (
              ownerWa ? (
                <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp}>
                  <Text style={styles.waIcon}>💬</Text>
                  <Text style={styles.waBtnText}>{ownerWa}  —  {t.whatsappBtn}</Text>
                </TouchableOpacity>
              ) : <Text style={styles.noContact}>{t.noContact}</Text>
            )}
          </View>
        )}

        {/* ── VENTE : contact WhatsApp direct (pas de commission) ── */}
        {isSale && (
          <View style={styles.contactBox}>
            <Text style={styles.contactLabel}>{t.contactOwner}</Text>
            {ownerWa ? (
              <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp}>
                <Text style={styles.waIcon}>💬</Text>
                <Text style={styles.waBtnText}>{ownerWa}  —  {t.whatsappBtn}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noContact}>{t.noContact}</Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dateStepper: { marginBottom: 4 },
  dateLabel: { color: "#555", fontWeight: "600", fontSize: 13, marginBottom: 6 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#0E7C66", alignItems: "center", justifyContent: "center",
  },
  dateBtnText: { color: "white", fontSize: 20, fontWeight: "700", lineHeight: 24 },
  dateValue: { fontSize: 16, fontWeight: "600", color: "#333" },
  typeBadge: {
    alignSelf: "flex-start", backgroundColor: "#e8f5f1",
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  typeBadgeText: { color: "#0E7C66", fontWeight: "600", fontSize: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  city: { color: "#666", marginTop: 4 },
  body: { marginTop: 10, lineHeight: 22, color: "#333" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  priceLabel: { color: "#666", fontSize: 14 },
  price: { color: "#0E7C66", fontSize: 20, fontWeight: "700" },
  durationBox: {
    marginTop: 16, backgroundColor: "#f7f7f7", borderRadius: 10, padding: 14,
  },
  durationLabel: { color: "#555", fontWeight: "600", marginBottom: 10 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  durationUnit: { color: "#555", fontSize: 15 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 0 },
  stepBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: "#0E7C66", alignItems: "center", justifyContent: "center",
  },
  stepBtnText: { color: "white", fontSize: 22, fontWeight: "700", lineHeight: 26 },
  stepValue: { minWidth: 44, textAlign: "center", fontSize: 20, fontWeight: "700" },
  recap: {
    marginTop: 16, backgroundColor: "#f0faf6", borderRadius: 10, padding: 14, gap: 8,
  },
  recapRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recapLabel: { color: "#555", fontSize: 14 },
  recapValue: { fontSize: 15 },
  btn: { backgroundColor: "#0E7C66", borderRadius: 8, padding: 14, marginTop: 20, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700", fontSize: 15 },
  // Contact WhatsApp (vente / location longue durée)
  contactBox: {
    marginTop: 20, backgroundColor: "#f0faf6", borderRadius: 12, padding: 16,
  },
  contactLabel: { color: "#555", fontWeight: "600", fontSize: 13, marginBottom: 10 },
  waBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#25D366", borderRadius: 10, padding: 14,
  },
  waIcon: { fontSize: 20 },
  waBtnText: { color: "white", fontWeight: "700", fontSize: 14, flex: 1 },
  noContact: { color: "#999", fontStyle: "italic" },
  lockMsg: { color: "#888", fontSize: 12, marginTop: 8, textAlign: "center" },
});
