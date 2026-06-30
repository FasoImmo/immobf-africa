import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Image, RefreshControl, TextInput, ScrollView,
} from "react-native";
import { Properties } from "../lib/api";
import { cacheProperty, listCached } from "../lib/offline";

function formatFCFA(n) {
  if (n == null) return "—";
  return `${Number(n).toLocaleString("fr-FR")} FCFA`;
}

// Pays les plus fréquents en tête, puis alphabétique
const COUNTRIES = [
  { code: "", label: "🌍 Tous les pays" },
  { code: "BF", label: "🇧🇫 Burkina Faso" },
  { code: "CI", label: "🇨🇮 Côte d'Ivoire" },
  { code: "SN", label: "🇸🇳 Sénégal" },
  { code: "ML", label: "🇲🇱 Mali" },
  { code: "TG", label: "🇹🇬 Togo" },
  { code: "BJ", label: "🇧🇯 Bénin" },
  { code: "NE", label: "🇳🇪 Niger" },
  { code: "GN", label: "🇬🇳 Guinée" },
  { code: "GH", label: "🇬🇭 Ghana" },
  { code: "NG", label: "🇳🇬 Nigeria" },
  { code: "CM", label: "🇨🇲 Cameroun" },
];

const TX_TYPES = [
  { value: "", label: "Tous types" },
  { value: "sale", label: "Vente" },
  { value: "rent_long", label: "Location longue durée" },
  { value: "rent_short", label: "Location courte durée" },
];

export default function BrowseScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [txType, setTxType] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = { limit: 30 };
      if (q) params.q = q;
      if (country) params.country_code = country;
      if (txType) params.transaction_type = txType;
      const d = await Properties.search(params);
      setItems(d.items || []);
      for (const p of d.items || []) await cacheProperty(p);
    } catch {
      setItems(await listCached());
    } finally { setRefreshing(false); }
  }, [q, country, txType]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={s.container}>
      {/* Barre de recherche */}
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Rechercher par ville, type…"
        onSubmitEditing={load}
        style={s.search}
        returnKeyType="search"
      />

      {/* Filtre Pays */}
      <Text style={s.filterLabel}>Pays</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
        {COUNTRIES.map((c) => (
          <TouchableOpacity
            key={c.code}
            style={[s.chip, country === c.code && s.chipActive]}
            onPress={() => setCountry(c.code)}
          >
            <Text style={[s.chipText, country === c.code && s.chipTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filtre Type de transaction */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.chipRow, { marginBottom: 8 }]}>
        {TX_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[s.chip, txType === t.value && s.chipActive]}
            onPress={() => setTxType(t.value)}
          >
            <Text style={[s.chipText, txType === t.value && s.chipTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => navigation.navigate("Property", { property: item })}
          >
            <Image
              source={{ uri: item.photos?.[0]?.url || `https://picsum.photos/seed/${item.id}/600/400` }}
              style={s.cover}
            />
            <View style={{ padding: 12 }}>
              <Text style={s.title} numberOfLines={1}>{item.title}</Text>
              <Text style={s.sub}>{item.city}{item.country_code ? `, ${item.country_code}` : ""}</Text>
              <Text style={s.price}>{formatFCFA(item.price)}</Text>
              {item.transaction_type && (
                <Text style={s.badge}>
                  {item.transaction_type === "sale" ? "Vente" :
                   item.transaction_type === "rent_long" ? "Location" : "Court séjour"}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: "#888", marginTop: 40 }}>
            Aucune annonce trouvée.
          </Text>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f7", padding: 12 },
  search: {
    backgroundColor: "white", borderRadius: 8, padding: 12,
    marginBottom: 8, fontSize: 15, borderWidth: 1, borderColor: "#e0e0e0",
  },
  filterLabel: { fontSize: 12, color: "#888", marginBottom: 4, fontWeight: "600" },
  chipRow: { flexDirection: "row", marginBottom: 6 },
  chip: {
    backgroundColor: "white", borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8,
    borderWidth: 1, borderColor: "#ddd",
  },
  chipActive: { backgroundColor: "#0E7C66", borderColor: "#0E7C66" },
  chipText: { fontSize: 13, color: "#444" },
  chipTextActive: { color: "white", fontWeight: "600" },
  card: { backgroundColor: "white", borderRadius: 10, marginBottom: 12, overflow: "hidden" },
  cover: { width: "100%", height: 160 },
  title: { fontSize: 16, fontWeight: "600" },
  sub: { color: "#666", marginTop: 2 },
  price: { color: "#0E7C66", fontWeight: "700", marginTop: 6, fontSize: 16 },
  badge: { fontSize: 11, color: "#0E7C66", marginTop: 4, fontWeight: "500" },
});
