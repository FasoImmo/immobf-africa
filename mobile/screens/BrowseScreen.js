import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, RefreshControl, TextInput } from "react-native";
import { Properties } from "../lib/api";
import { cacheProperty, listCached } from "../lib/offline";

function formatFCFA(n) {
  if (n == null) return "—";
  return `${Number(n).toLocaleString("fr-FR")} FCFA`;
}

export default function BrowseScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await Properties.search({ q, limit: 30 });
      setItems(d.items || []);
      for (const p of d.items || []) await cacheProperty(p);
    } catch {
      // Offline fallback
      setItems(await listCached());
    } finally { setRefreshing(false); }
  }, [q]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      <TextInput
        value={q} onChangeText={setQ} placeholder="Ville, quartier, type…"
        onSubmitEditing={load} style={styles.search}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Property", { property: item })}>
            <Image
              source={{ uri: item.photos?.[0]?.url || `https://picsum.photos/seed/${item.id}/600/400` }}
              style={styles.cover}
            />
            <View style={{ padding: 12 }}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.sub}>{item.city}, {item.country_code}</Text>
              <Text style={styles.price}>{formatFCFA(item.price)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: "#888", marginTop: 40 }}>Aucune annonce.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f7", padding: 12 },
  search: { backgroundColor: "white", borderRadius: 8, padding: 10, marginBottom: 12 },
  card: { backgroundColor: "white", borderRadius: 10, marginBottom: 12, overflow: "hidden" },
  cover: { width: "100%", height: 160 },
  title: { fontSize: 16, fontWeight: "600" },
  sub: { color: "#666", marginTop: 2 },
  price: { color: "#0E7C66", fontWeight: "700", marginTop: 6, fontSize: 16 },
});
