import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, TextInput, ScrollView, FlatList,
  TouchableOpacity, StyleSheet, Modal, RefreshControl,
  StatusBar, SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Properties } from "../lib/api";
import { useLang } from "../lib/lang";
import PropertyCard from "../components/PropertyCard";
import FallbackImage from "../components/FallbackImage";

const RECENT_KEY = "immobf_recent";

// ─── Traductions ──────────────────────────────────────────────────────────────
const T = {
  fr: {
    tagline: "Nous optimisons votre choix.",
    searchPlaceholder: "Mot-clé, titre...",
    allCountries: "Tous les pays",
    allCities: "Ville",
    allTxTypes: "Transaction",
    allPropTypes: "Type de bien",
    btnSearch: "PARCOURIR",
    recentTitle: "Récemment consultés",
    newTitle: "Nouvelles annonces",
    empty: "Aucune annonce trouvée.",
    sale: "Vente",
    rentLong: "Location",
    rentShort: "Court séjour",
    house: "Maison",
    apartment: "Appartement",
    land: "Terrain",
    commercial: "Commercial",
    villa: "Villa",
    chooseCountry: "Choisir un pays",
    chooseTx: "Type de transaction",
    choosePropType: "Type de bien",
  },
  en: {
    tagline: "We optimize your choice.",
    searchPlaceholder: "Keyword, title...",
    allCountries: "All countries",
    allCities: "City",
    allTxTypes: "Transaction",
    allPropTypes: "Property type",
    btnSearch: "BROWSE",
    recentTitle: "Recently viewed",
    newTitle: "New listings",
    empty: "No listings found.",
    sale: "For sale",
    rentLong: "Rental",
    rentShort: "Short stay",
    house: "House",
    apartment: "Apartment",
    land: "Land",
    commercial: "Commercial",
    villa: "Villa",
    chooseCountry: "Choose a country",
    chooseTx: "Transaction type",
    choosePropType: "Property type",
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

const TX_OPTIONS = (t) => [
  { code: "sale",       label: t.sale },
  { code: "rent_long",  label: t.rentLong },
  { code: "rent_short", label: t.rentShort },
];

const PROP_OPTIONS = (t) => [
  { code: "house",      label: t.house },
  { code: "apartment",  label: t.apartment },
  { code: "land",       label: t.land },
  { code: "commercial", label: t.commercial },
  { code: "villa",      label: t.villa },
];

// ─── DropdownModal ─────────────────────────────────────────────────────────────
function DropdownModal({ visible, title, allLabel, options, onSelect, onClose }) {
  const all = [{ code: "", label: allLabel }];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
      <View style={m.sheet}>
        <View style={m.sheetHeader}>
          <Text style={m.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={m.sheetClose}>✕</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={[...all, ...options]}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity style={m.sheetItem} onPress={() => { onSelect(item.code, item.label); onClose(); }}>
              <Text style={m.sheetItemText}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

// ─── Mini card for "Récemment consultés" ──────────────────────────────────────
function RecentCard({ property, onPress, lang }) {
  const p = property || {};
  const photoUrl = p.photos?.[0]?.url;
  const coverUri = photoUrl
    ? { uri: photoUrl }
    : { uri: `https://picsum.photos/seed/${p.id || "r"}/300/200` };

  return (
    <TouchableOpacity style={rc.card} onPress={onPress} activeOpacity={0.88}>
      <FallbackImage source={coverUri} style={rc.cover} resizeMode="cover" />
      <View style={rc.info}>
        <Text style={rc.title} numberOfLines={1}>{p.title || "—"}</Text>
        <Text style={rc.price}>{p.price ? `${Number(p.price).toLocaleString("fr-FR")} FCFA` : "—"}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { lang } = useLang();
  const t = T[lang] || T.fr;

  // Search form state
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState({ code: "", label: t.allCountries });
  const [city, setCity] = useState("");
  const [txType, setTxType] = useState({ code: "", label: t.allTxTypes });
  const [propType, setPropType] = useState({ code: "", label: t.allPropTypes });

  // Modal visibility
  const [showCountry, setShowCountry] = useState(false);
  const [showTx, setShowTx]           = useState(false);
  const [showProp, setShowProp]       = useState(false);

  // Data state
  const [listings, setListings]   = useState([]);
  const [recents, setRecents]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load recent property objects from AsyncStorage
  const loadRecents = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      const ids = raw ? JSON.parse(raw) : [];
      const items = await Promise.all(ids.slice(0, 3).map((id) =>
        Properties.get(id, lang).catch(() => null)
      ));
      setRecents(items.filter(Boolean));
    } catch {}
  }, [lang]);

  // Fetch latest listings (no filters initially)
  const fetchListings = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const res = await Properties.search({ page: 1, limit: 10, ...params });
      setListings(res.items || res.results || []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
    loadRecents();
  }, []);

  // Refresh on pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchListings(), loadRecents()]);
    setRefreshing(false);
  }, [fetchListings, loadRecents]);

  // Re-load recents when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", loadRecents);
    return unsubscribe;
  }, [navigation, loadRecents]);

  function doSearch() {
    const params = {};
    if (query.trim()) params.q = query.trim();
    if (country.code) params.country_code = country.code;
    if (city.trim()) params.city = city.trim();
    if (txType.code) params.transaction_type = txType.code;
    if (propType.code) params.property_type = propType.code;
    // Navigate to Browse tab with filters pre-applied
    navigation.navigate("Parcourir", { filters: params });
  }

  function goToProperty(id) {
    navigation.navigate("Property", { id });
    // Record visit
    AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      const ids = raw ? JSON.parse(raw) : [];
      const updated = [String(id), ...ids.filter((x) => x !== String(id))].slice(0, 10);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    });
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0E7C66"]} />}
      >
        {/* ── Hero ── */}
        <View style={s.hero}>
          <Text style={s.heroTitle}>ImmoBF Africa</Text>
          <Text style={s.heroTagline}>{t.tagline}</Text>

          {/* Search form */}
          <View style={s.form}>
            {/* Keyword */}
            <TextInput
              style={s.input}
              placeholder={t.searchPlaceholder}
              placeholderTextColor="#aaa"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={doSearch}
            />

            {/* Country picker */}
            <TouchableOpacity style={s.select} onPress={() => setShowCountry(true)}>
              <Text style={s.selectText}>{country.label}</Text>
              <Text style={s.selectArrow}>▾</Text>
            </TouchableOpacity>

            {/* City */}
            <TextInput
              style={s.input}
              placeholder={t.allCities}
              placeholderTextColor="#aaa"
              value={city}
              onChangeText={setCity}
            />

            {/* Tx type picker */}
            <TouchableOpacity style={s.select} onPress={() => setShowTx(true)}>
              <Text style={s.selectText}>{txType.label}</Text>
              <Text style={s.selectArrow}>▾</Text>
            </TouchableOpacity>

            {/* Property type picker */}
            <TouchableOpacity style={s.select} onPress={() => setShowProp(true)}>
              <Text style={s.selectText}>{propType.label}</Text>
              <Text style={s.selectArrow}>▾</Text>
            </TouchableOpacity>

            {/* Search button */}
            <TouchableOpacity style={s.btnSearch} onPress={doSearch}>
              <Text style={s.btnSearchText}>{t.btnSearch}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Récemment consultés ── */}
        {recents.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t.recentTitle}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {recents.map((p) => (
                <RecentCard
                  key={p.id}
                  property={p}
                  lang={lang}
                  onPress={() => goToProperty(p.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Nouvelles annonces ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.newTitle}</Text>
          <View style={{ paddingHorizontal: 16 }}>
            {loading ? (
              <Text style={s.emptyText}>…</Text>
            ) : listings.length === 0 ? (
              <Text style={s.emptyText}>{t.empty}</Text>
            ) : (
              listings.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  lang={lang}
                  onPress={() => goToProperty(p.id)}
                />
              ))
            )}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Modals ── */}
      <DropdownModal
        visible={showCountry}
        title={t.chooseCountry}
        allLabel={t.allCountries}
        options={COUNTRIES.map((c) => ({ code: c.code, label: c.label }))}
        onSelect={(code, label) => setCountry({ code, label: label || t.allCountries })}
        onClose={() => setShowCountry(false)}
      />
      <DropdownModal
        visible={showTx}
        title={t.chooseTx}
        allLabel={t.allTxTypes}
        options={TX_OPTIONS(t)}
        onSelect={(code, label) => setTxType({ code, label: label || t.allTxTypes })}
        onClose={() => setShowTx(false)}
      />
      <DropdownModal
        visible={showProp}
        title={t.choosePropType}
        allLabel={t.allPropTypes}
        options={PROP_OPTIONS(t)}
        onSelect={(code, label) => setPropType({ code, label: label || t.allPropTypes })}
        onClose={() => setShowProp(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f5" },

  // Hero
  hero: {
    backgroundColor: "#0E7C66",
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  heroTagline: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
  form: {
    gap: 10,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#222",
  },
  select: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectText: {
    fontSize: 14,
    color: "#444",
  },
  selectArrow: {
    fontSize: 13,
    color: "#888",
  },
  btnSearch: {
    backgroundColor: "#13a48c",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 2,
  },
  btnSearchText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 1,
  },

  // Sections
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
  },
});

// Mini card styles
const rc = StyleSheet.create({
  card: {
    width: 180,
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cover: {
    width: "100%",
    height: 110,
  },
  info: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  price: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0E7C66",
  },
});

// Modal styles
const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "60%",
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  sheetClose: {
    fontSize: 18,
    color: "#888",
  },
  sheetItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sheetItemText: {
    fontSize: 15,
    color: "#222",
  },
});
