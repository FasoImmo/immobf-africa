import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const api = axios.create({ baseURL: `${baseURL}/api/v1` });

api.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("immobf_token");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

export default api;

/** Retourne la langue active (stockée par le switcher de langue). */
function getLang() {
  if (typeof window === "undefined") return "fr";
  return localStorage.getItem("immobf_lang") || "fr";
}

export const Properties = {
  search: (params) => api.get("/properties", { params: { ...params, lang: getLang() } }).then((r) => r.data),
  get: (id) => api.get(`/properties/${id}`, { params: { lang: getLang() } }).then((r) => r.data),
  create: (data) => api.post("/properties", data).then((r) => r.data),
  publish: (id) => api.post(`/properties/${id}/publish`).then((r) => r.data),
  estimate: (data) => api.post("/properties/estimate", data).then((r) => r.data),
};

export const Auth = {
  register: (data) => api.post("/auth/register", data).then((r) => r.data),
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  verifyOtp: (data) => api.post("/auth/otp/verify", data).then((r) => r.data),
};

export const Payments = {
  providers: (country = "BF") => api.get("/payme