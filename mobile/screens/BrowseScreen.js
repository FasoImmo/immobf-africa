import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, Modal, FlatList as FList,
  SafeAreaView,
} from "react-native";
import { Properties } from "../lib/api";
import { cacheProperty, listCached } from "../lib/offline";
import { useLang } from "../lib/lang";
import FallbackImage from "../components/FallbackImage";

function formatFCFA(n) {
  if (n == null) return "—";
  return `${Number(n).toLocaleString("fr-FR")} FCFA`;
}

const T = {
  fr: {
    allCountries: "Tous les pays",
    allTypes: "Tous types",
    cityPlaceholder: "Ville",
    chooseCountry: "Choisir un pays",
    chooseType: "Type de transaction",
    sale: "🏷️ Vente",
    rentLong: "🔑 Location longue durée",
    rentShort: "🌙 Court séjour",
    labelSale: "Vente",
    labelRentLong: "Location",
    labelRentShort: "Court séjour",
    empty: "Aucune annonce trouvée.",
  },
  en: {
    allCountries: "All countries",
    allTypes: "All types",
    cityPlaceholder: "City",
    chooseCountry: "Choose a country",
    chooseType: "Transaction type",
    sale: "🏷️ For sale",
    rentLong: "🔑 Long-term rental",
    rentShort: "🌙 Short stay",
    labelSale: "For sale",
    labelRentLong: "Rental",
    labelRentShort: "Short stay",
    empty: "No listings found.",
  },
};

const COUNTRIES = [
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
  { code: "CD", label: "🇨🇩 Congo RDC" },
  { code: "MA", label: "🇲🇦 Maroc" },
];

function DropdownModal({ visible, title, allLabel, options, selected, onSelect, onClose, labelKey = "label", valueKey = "code" }) {
  const all = { [valueKey]: "", [labelKey]: allLabel };
  const rows = [all, ...options];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={s.sheetClose}>✕</Text>
          </TouchableOpacity>
        </View>
        <FList
          data={rows}
          keyExtractor={(item) => String(item[valueKey])}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.option, selected === item[valueKey] && s.optionActive]}
              onPress={() => { onSelect(item[valueKey]); onClose(); }}
            >
              <Text style={[s.optionText, selected === item[valueKey] && s.optionTextActive]}>
                {item[labelKey]}
              </Text>
              {selected === item[valueKey] && <Text style={{ color: "#0E7C66" }}>✓</Text>}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

export default function BrowseScreen({ navigation }) {
  const { lang } = useLang();
  const t = T[lang] || T.fr;

  const TX_TYPES = [
    { value: "sale", label: t.sale },
    { value: "rent_long", label: t.rentLong },
    { value: "rent_short", label: t.rentShort },
  ];

  const [items, setItems] = useState([]);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [txType, setTxType] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showCountry, setShowCountry] = useState(false);
  const [showType, setShowType] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = { limit: 30, lang };
      if (country) params.country_code = country;
      if (city.trim()) params.q = city.trim();
      if (txType) params.transaction_type = txType;
      const d = await Properties.search(params);
      setItems(d.items || []);
      for (const p of d.items || []) await cacheProperty(p);
    } catch {
      setItems(await listCached());
    } finally { setRefreshing(false); }
  }, [country, city, txType]);

  useEffect(() => { load(); }, [load]);

  const countryLabel = country
    ? (COUNTRIES.find((c) => c.code === country)?.label || country)
    : t.allCountries;
  const typeLabel = txType
    ? (TX_TYPES.find((tp) => tp.value === txType)?.label || txType)
    : t.allTypes;

  function txBadgeLabel(type) {
    if (type === "sale") return t.labelSale;
    if (type === "rent_long") return t.labelRentLong;
    if (type === "rent_short") return t.labelRentShort;
    return type;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7f7" }}>
      {/* Filtres */}
      <View style={s.filters}>
        {/* Pays */}
        <TouchableOpacity style={s.drop} onPress={() => setShowCountry(true)}>
          <Text style={s.dropText} numberOfLines={1}>{countryLabel}</Text>
          <Text style={s.arrow}>▾</Text>
        </TouchableOpacity>

        {/* Ville */}
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder={t.cityPlaceholder}
          onSubmitEditing={load}
          returnKeyType="search"
          style={s.cityInput}
        />

        {/* Type */}
        <TouchableOpacity style={s.drop} onPress={() => setShowType(true)}>
          <Text style={s.dropText} numberOfLines={1}>{typeLabel}</Text>
          <Text style={s.arrow}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => navigation.navigate("Property", { property: item })}
          >
            <FallbackImage
              source={{ uri: item.photos?.[0]?.url }}
              style={s.cover}
            />
            <View style={{ padding: 12 }}>
              <Text style={s.title} numberOfLines={1}>{item.title}</Text>
              <Text style={s.sub}>{item.city}{item.country_code ? `, ${item.country_code}` : ""}</Text>
              <Text style={s.price}>{formatFCFA(item.price)}</Text>
              {item.transaction_type && (
                <Text style={s.badge}>{txBadgeLabel(item.transaction_type)}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: "#888", marginTop: 40 }}>
            {t.empty}
          </Text>
        }
      />

      {/* Modals */}
      <DropdownModal
        visible={showCountry}
        title={t.chooseCountry}
        allLabel={t.allCountries}
        options={COUNTRIES}
        selected={country}
        onSelect={setCountry}
        onClose={() => setShowCountry(false)}
        labelKey="label"
        valueKey="code"
      />
      <DropdownModal
        visible={showType}
        title={t.chooseType}
        allLabel={t.allTypes}
        options={TX_TYPES}
        selected={txType}
        onSelect={setTxType}
        onClose={() => setShowType(false)}
        labelKey="label"
        valueKey="value"
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  filters: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "white", paddingHorizontal: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#eee", gap: 6,
  },
  drop: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: "#ddd", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 8, backgroundColor: "#fafafa",
  },
  dropText: { fontSize: 12, color: "#333", flex: 1 },
  arrow: { fontSize: 10, color: "#888", marginLeft: 2 },
  cityInput: {
    flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 8, fontSize: 12,
    backgroundColor: "#fafafa",
  },
  card: { backgroundColor: "white", borderRadius: 10, marginBottom: 12, overflow: "hidden" },
  cover: { width: "100%", height: 160 },
  title: { fontSize: 16, fontWeight: "600" },
  sub: { color: "#666", marginTop: 2 },
  price: { color: "#0E7C66", fontWeight: "700", marginTop: 6, fontSize: 16 },
  badge: { fontSize: 11, color: "#0E7C66", marginTop: 4 },
  // Modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "white", borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: "60%",
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee",
  },
  sheetTitle: { fontSize: 16, fontWeight: "700" },
  sheetClose: { fontSize: 18, color: "#888", padding: 4 },
  option: { padding: 14, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  optionActive: { backgroundColor: "#f0faf6" },
  optionText: { fontSize: 15, color: "#333" },
  optionTextActive: { color: "#0E7C66", fontWeight: "600" },
});
