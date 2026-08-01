/**
 * tokenStore — stockage des tokens JWT via AsyncStorage.
 *
 * Note: expo-secure-store est incompatible avec Gradle 8.x (EAS/SDK 50).
 * AsyncStorage est utilisé en attendant la migration SDK 51+.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_TOKEN   = "immobf_token";
const KEY_REFRESH = "immobf_refresh";
const KEY_USER    = "immobf_user";

export const getToken    = ()  => AsyncStorage.getItem(KEY_TOKEN);
export const setToken    = (v) => AsyncStorage.setItem(KEY_TOKEN, v);

export const getRefresh  = ()  => AsyncStorage.getItem(KEY_REFRESH);
export const setRefresh  = (v) => AsyncStorage.setItem(KEY_REFRESH, v);

/**
 * Efface la session complète : tokens + profil utilisateur.
 */
export const clearSession = async () => {
  await Promise.all([
    AsyncStorage.removeItem(KEY_TOKEN),
    AsyncStorage.removeItem(KEY_REFRESH),
    AsyncStorage.removeItem(KEY_USER),
  ]);
};
