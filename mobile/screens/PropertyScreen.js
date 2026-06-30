import React from "react";
import { ScrollView, View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useLang } from "../lib/lang";

const T = {
  fr: { noListing: "Aucune annonce", deposit: "Acompte", payBtn: "Payer l'acompte en mobile money" },
  en: { noListing: "No listing", deposit: "Deposit", payBtn: "Pay deposit via mobile money" },
};

export default function PropertyScreen({ route, navigation }) {
  const { lang } = useLang();
  const t = T[lang] || T.fr;

  const p = route.params?.property;
  if (!p) return <Text style={{ padding: 20 }}>{t.noListing}</Text>;
  const deposit = Math.round((Number(p.price) * Number(p.deposit_pct || 5)) / 100);
  const cover = p.photos?.[0]?.url || `https://picsum.photos/seed/${p.id}/1200/600`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "white" }}>
      <Image source={{ uri: cover }} style={{ width: "100%", height: 240 }} />
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.city}>{p.city}, {p.country_code}</Text>
        <Text style={styles.price}>{Number(p.price).toLocaleString("fr-FR")} {p.currency}</Text>
        <Text style={styles.body}>{p.description}</Text>
        <Text style={styles.depositLabel}>{t.deposit} ({p.deposit_pct || 5}%)</Text>
        <Text style={styles.deposit}>{deposit.toLocaleString("fr-FR")} {p.currency}</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate("Payment", { property: p, amount: deposit })}
        >
          <Text style={styles.btnText}>{t.payBtn}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700" },
  city: { color: "#666", marginTop: 4 },
  price: { color: "#0E7C66", fontSize: 22, fontWeight: "700", marginVertical: 8 },
  body: { marginTop: 12, lineHeight: 22, color: "#333" },
  depositLabel: { marginTop: 16, color: "#666" },
  deposit: { fontSize: 18, fontWeight: "600" },
  btn: { backgroundColor: "#0E7C66", borderRadius: 8, padding: 14, marginTop: 20, alignItems: "center" },
  btnText: { color: "white", fontWeight: "600" },
});
