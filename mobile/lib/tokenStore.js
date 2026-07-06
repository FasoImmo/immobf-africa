/**
 * tokenStore — stockage sécurisé des tokens JWT.
 *
 * Les tokens d'accès et de rafraîchissement sont des secrets de session :
 * ils permettent d'agir en tant qu'utilisateur jusqu'à leur expiration.
 * On les stocke dans expo-secure-store (chiffré via le keystore Android /
 * Secure Enclave iOS) plutôt que AsyncStorage (non chiffré).
 *
 * Le profil utilisateur (`immobf_user`) n'est PAS un secret — c'est juste
 * du JSON d'affichage. Il reste dans AsyncStorage pour éviter les limites
 * de taille de SecureStore (~2 KB sur certains appareils anciens).
 */
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_TOKEN   = "immobf_token";
const KEY_REFRESH = "immobf_refresh";
const KEY_USER    = "immobf_user";

export const getToken    = ()  => SecureStore.getItemAsync(KEY_TOKEN);
export const setToken    = (v) => SecureStore.setItemAsync(KEY_TOKEN, v);

export const getRefresh  = ()  => SecureStore.getItemAsync(KEY_REFRESH);
export const setRefresh  = (v) => SecureStore.setItemAsync(KEY_REFRESH, v);

/**
 * Efface la session complète : tokens (SecureStore) + profil (AsyncStorage).
 * À appeler à la déconnexion ou quand le refresh échoue (401 non récupérable).
 */
export const clearSession = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_TOKEN),
    SecureStore.deleteItemAsync(KEY_REFRESH),
    AsyncStorage.removeItem(KEY_USER),
  ]);
};
