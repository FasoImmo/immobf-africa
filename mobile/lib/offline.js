import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "immobf_cached_properties";
const MAX_ITEMS = 100;

export function init() {
  // AsyncStorage needs no initialization
}

export async function cacheProperty(p) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((item) => item.id === p.id);
    const entry = { ...p, cached_at: Date.now() };
    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.unshift(entry);
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch (_) {}
}

export async function listCached() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return list.sort((a, b) => (b.cached_at || 0) - (a.cached_at || 0));
  } catch (_) {
    return [];
  }
}
