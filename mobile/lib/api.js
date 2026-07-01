import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const baseURL = Constants?.expoConfig?.extra?.apiUrl || "http://10.0.2.2:4000";

const api = axios.create({ baseURL: `${baseURL}/api/v1`, timeout: 15000 });

api.interceptors.request.use(async (cfg) => {
  const token = await AsyncStorage.getItem("immobf_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Refresh token : re-tente automatiquement sur 401
let _refreshPromise = null;

async function doRefresh() {
  const refresh = await AsyncStorage.getItem("immobf_refresh");
  if (!refresh) throw new Error("No refresh token");
  const { data } = await axios.post(`${baseURL}/api/v1/auth/refresh`, { refresh });
  await AsyncStorage.setItem("immobf_token", data.access);
  await AsyncStorage.setItem("immobf_refresh", data.refresh);
  return data.access;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (!response || response.status !== 401 || config._retried) {
      return Promise.reject(error);
    }
    config._retried = true;
    try {
      _refreshPromise = _refreshPromise || doRefresh().finally(() => { _refreshPromise = null; });
      const newToken = await _refreshPromise;
      config.headers.Authorization = `Bearer ${newToken}`;
      return api(config);
    } catch (_) {
      await AsyncStorage.multiRemove(["immobf_token", "immobf_refresh", "immobf_user"]);
      return Promise.reject(error);
    }
  }
);

export default api;

export const Properties = {
  search: (params) => api.get("/properties", { params }).then((r) => r.data),
  get: (id, lang) => api.get(`/properties/${id}`, { params: lang ? { lang } : {} }).then((r) => r.data),
};

export const Auth = {
  register: (data) => api.post("/auth/register", data).then((r) => r.data),
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  forgotPassword: (phone) => api.post("/auth/forgot-password", { phone }).then((r) => r.data),
};

export const Payments = {
  providers: (country = "BF") => api.get("/payments/providers", { params: { country } }).then((r) => r.data),
  initiate: (data) => api.post("/payments/initiate", data).then((r) => r.data),
  list: () => api.get("/payments").then((r) => r.data),
  get: (id) => api.get(`/payments/${id}`).then((r) => r.data),
};
