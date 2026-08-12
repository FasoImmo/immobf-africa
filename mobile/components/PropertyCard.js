import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FallbackImage from "./FallbackImage";

const FAVS_KEY = "immobf_favorites";

function fmtNum(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatFCFA(n) {
  if (n == null) return "—";
  return `${fmtNum(n)} FCFA`;
}

function formatArea(m2) {
  if (m2 == null) return null;
  return `${fmtNum(m2)} m²`;
}

const TX_COLORS = {
  sale:       { bg: "#1565c0", label_fr: "Vente",       label_en: "For sale" },
  rent_long:  { bg: "#2e7d32", label_fr: "Location",    label_en: "Rental" },
  rent_short: { bg: "#6a1b9a", label_fr: "Court séjour", label_en: "Short stay" },
};

const TYPE_COLORS = {
  house:       { bg: "#0E7C66", label_fr: "Maison",      label_en: "House" },
  apartment:   { bg: "#01579b", label_fr: "Appartement", label_en: "Apartment" },
  land:        { bg: "#e65100", label_fr: "Terrain",     label_en: "Land" },
  commercial:  { bg: "#4a148c", label_fr: "Commercial",  label_en: "Commercial" },
  villa:       { bg: "#880e4f", label_fr: "Villa",       label_en: "Villa" },
};

async function loadFavs() {
  try {
    const raw = await AsyncStorage.getItem(FAVS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveFavs(favs) {
  await AsyncStorage.setItem(FAVS_KEY, JSON.stringify(favs));
}

/**
 * PropertyCard — carte immobilière riche, identique au site web.
 *
 * Props:
 *   property  — objet annonce (id, title, city, country_code, price, currency,
 *               transaction_type, property_type, photos, area_m2, bedrooms,
 *               is_furnished, is_boosted)
 *   onPress   — callback quand on appuie sur la carte
 *   lang      — "fr" | "en"
 */
export default function PropertyCard({ property, onPress, lang = "fr" }) {
  const [isFav, setIsFav] = useState(false);

  const p = property || {};
  const photoUrl = p.photos?.[0]?.url;
  const coverUri = photoUrl
    ? { uri: photoUrl }
    : { uri: `https://picsum.photos/seed/${p.id || "img"}/600/400` };

  const tx = TX_COLORS[p.transaction_type] || TX_COLORS.sale;
  const pt = TYPE_COLORS[p.property_type] || TYPE_COLORS.house;
  const txLabel = lang === "fr" ? tx.label_fr : tx.label_en;
  const ptLabel = lang === "fr" ? pt.label_fr : pt.label_en;
  const area = formatArea(p.area_m2);
  const beds = p.bedrooms ? `${p.bedrooms} ch.` : null;

  // Load favorite state on mount
  useEffect(() => {
    loadFavs().then((favs) => setIsFav(favs.includes(String(p.id))));
  }, [p.id]);

  async function toggleFav(e) {
    e.stopPropagation?.();
    const favs = await loadFavs();
    const id = String(p.id);
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    await saveFavs(next);
    setIsFav(!isFav);
  }

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.88}>
      {/* Photo */}
      <View style={s.coverWrap}>
        <FallbackImage source={coverUri} style={s.cover} resizeMode="cover" />

        {/* Boosted badge */}
        {p.is_boosted && (
          <View style={s.boostedBadge}>
            <Text style={s.boostedText}>★ Boost</Text>
          </View>
        )}

        {/* Favorite button */}
        <TouchableOpacity style={s.favBtn} onPress={toggleFav} hitSlop={8}>
          <Text style={s.favIcon}>{isFav ? "❤️" : "🤍"}</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={s.body}>
        {/* Badges row */}
        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: pt.bg }]}>
            <Text style={s.badgeText}>{ptLabel}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: tx.bg }]}>
            <Text style={s.badgeText}>{txLabel}</Text>
          </View>
          {p.is_furnished && (
            <View style={[s.badge, s.badgeOutline]}>
              <Text style={[s.badgeText, { color: "#0E7C66" }]}>
                {lang === "fr" ? "Meublé" : "Furnished"}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={s.title} numberOfLines={2}>{p.title || "—"}</Text>

        {/* Location */}
        <Text style={s.location}>
          📍 {[p.city, p.country_code].filter(Boolean).join(", ")}
        </Text>

        {/* Meta row: area + bedrooms */}
        {(area || beds) && (
          <Text style={s.meta}>
            {[area, beds].filter(Boolean).join(" · ")}
          </Text>
        )}

        {/* Price */}
        <Text style={s.price}>{formatFCFA(p.price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  coverWrap: {
    position: "relative",
  },
  cover: {
    width: "100%",
    height: 190,
  },
  boostedBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#f57f17",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  boostedText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  favBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  favIcon: {
    fontSize: 18,
  },
  body: {
    padding: 12,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#0E7C66",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
    lineHeight: 21,
  },
  location: {
    fontSize: 13,
    color: "#555",
    marginBottom: 3,
  },
  meta: {
    fontSize: 13,
    color: "#777",
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0E7C66",
    marginTop: 2,
  },
});
