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

export const Analytics = {
  trackView: (id, eventType = "view") => {
    if (typeof window === "undefined") return;
    const session_id = sessionStorage.getItem("immobf_sid") || (() => {
      const sid = Math.random().toString(36).slice(2);
      sessionStorage.setItem("immobf_sid", sid);
      return sid;
    })();
    return api.post(`/properties/${id}/view`, {
      event_type: eventType,
      session_id,
      referrer: document.referrer || null,
    }).catch(() => {}); // non bloquant
  },
  trackSearch: (params, resultsCount) => {
    if (typeof window === "undefined") return;
    const session_id = sessionStorage.getItem("immobf_sid") || "";
    return api.post("/events/search", { ...params, session_id, results_count: resultsCount })
      .catch(() => {});
  },
  similar: (id) => api.get(`/properties/${id}/similar`).then((r) => r.data),
  suggestions: (sessionId) => api.get("/suggestions", { params: { session_id: sessionId } }).then((r) => r.data),
  myStats: () => api.get("/my/stats").then((r) => r.data),
};

export const Photos = {
  upload: (propertyId, files) => {
    const form = new FormData();
    files.forEach((f) => form.append("photos", f));
    return api.post(`/properties/${propertyId}/photos`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
};

export const Payments = {
  providers: (country = "BF") => api.get("/payments/providers", { params: { country } }).then((r) => r.data),
  initiate: (data) => api.post("/payments/initiate", data).then((r) => r.data),
  list: () => api.get("/payments").then((r) => r.data),
  get: (id) => api.get(`/payments/${id}`).then((r) => r.data),
};
