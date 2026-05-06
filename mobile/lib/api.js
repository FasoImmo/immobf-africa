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

export default api;

export const Properties = {
  search: (params) => api.get("/properties", { params }).then((r) => r.data),
  get: (id) => api.get(`/properties/${id}`).then((r) => r.data),
};

export const Auth = {
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
};

export const Payments = {
  providers: (country = "BF") => api.get("/payments/providers", { params: { country } }).then((r) => r.data),
  initiate: (data) => api.post("/payments/initiate", data).then((r) => r.data),
};
