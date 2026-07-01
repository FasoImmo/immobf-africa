import React, { useState } from "react";
import { ScrollView, View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useLang } from "../lib/lang";

const T = {
  fr: {
    noListing: "Aucune annonce",
    commission: "Commission (5%)",
    total: "Total séjour",
    nights: "nuit(s)",
    months: "mois",
    duration: "Durée",
    pricePerNight: "Prix / nuit",
    pricePerMonth: "Prix / mois",
    salePrice: "Prix de vente",
    payBtn: "Réserver et payer la commission",
    sale: "Vente",
    rentLong: "Location longue durée",
    rentShort: "Court séjour",
  },
  en: {
    noListing: "No listing",
    commission: "Commission (5%)",
    total: "Total stay",
    nights: "night(s)",
    months: "month(s)",
    duration: "Duration",
    pricePerNight: "Price / night",
    pricePerMonth: "Price / month",
    salePrice: "Sale price",
    payBtn: "Book and pay commission",
    sale: "For sale",
    rentLong: "Long-term rental",
    rentShort: "Short stay",
  },
};

function Stepper({ value, onChange, min = 1, max = 365 }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => onChange(Math.max(min, value - 1))}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => onChange(Math.min(max, value + 1))}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PropertyScreen({ route, navigation }) {
  const { lang } = useLang();
  const t = T[lang] || T.fr;

  const p = route.params?.property;
  const [duration, setDuration] = useState(1); // nuits ou mois

  if (!p) return <Text style={{ padding: 20 }}>{t.noListing}</Text>;

  const unitPrice = Number(p.price) || 0;
  const cur = p.currency || "XOF";
  const cover = p.photos?.[0]?.url || `https://picsum.photos/seed/${p.id}/1200/600`;
  const type = p.transaction_type;

  // Calcul du total et de la commission selon le type
  const isShort = type === "rent_short";
  const isLong = type === "rent_long";
  const isSale = type === "sale" || !type;

  const totalAmount = isSale ? unitPrice : unitPrice * duration;
  const commission = Math.round(totalAmount * (Number(p.deposit_pct || 5) / 100));

  const typeLabel = isShort ? t.rentShort : isLong ? t.rentLong : t.sale;
  const priceLabel = isShort ? t.pricePerNight : isLong ? t.pricePerMonth : t.salePrice;
  const unitLabel = isShort ? t.nights : t.months;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "white" }}>
      <Image source={{ uri: cover }} style={{ width: "100%", height: 240 }} />
      <View style={{ padding: 16 }}>
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

        {/* Sélecteur de durée (location seulement) */}
        {(isShort || isLong) && (
          <View style={styles.durationBox}>
            <Text style={styles.durationLabel}>{t.duration}</Text>
            <View style={styles.durationRow}>
              <Stepper
                value={duration}
                onChange={setDuration}
                min={1}
                max={isShort ? 90 : 24}
              />
              <Text style={styles.durationUnit}>{unitLabel}</Text>
            </View>
          </View>
        )}

        {/* Récapitulatif */}
        <View style={styles.recap}>
          {(isShort || isLong) && (
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>{t.total}</Text>
              <Text style={styles.recapValue}>{totalAmount.toLocaleString("fr-FR")} {cur}</Text>
            </View>
          )}
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
            total: totalAmount,
          })}
        >
          <Text style={styles.btnText}>{t.payBtn}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
});
