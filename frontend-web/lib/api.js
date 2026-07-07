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

// Le token d'accès expire vite (15 min par défaut). Sans ce mécanisme,
// toute session active plus longtemps que ça (ex. formulaire de
// publication d'annonce en plusieurs étapes) échoue avec "Invalid or
// expired token" sans recours — l'utilisateur perd son formulaire.
// Ici : sur un 401, on échange le refresh token contre un nouveau couple
// access/refresh et on rejoue la requête originale une seule fois.
let refreshPromise = null;

function clearSessionAndRedirect() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("immobf_token");
  localStorage.removeItem("immobf_refresh");
  localStorage.removeItem("immobf_user");
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?redirect=${next}`;
}

async function refreshAccessToken() {
  const refresh = typeof window !== "undefined" ? localStorage.getItem("immobf_refresh") : null;
  if (!refresh) throw new Error("No refresh token");
  // Appel direct via axios (pas `api`) pour éviter de re-déclencher l'intercepteur.
  const { data } = await axios.post(`${baseURL}/api/v1/auth/refresh`, { refresh });
  localStorage.setItem("immobf_token", data.access);
  localStorage.setItem("immobf_refresh", data.refresh);
  return data.access;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (!response || response.status !== 401 || config._retried || typeof window === "undefined") {
      return Promise.reject(error);
    }
    config._retried = true;
    try {
      // Mutualise les refresh concurrents : si plusieurs requêtes échouent
      // en même temps, une seule paire de tokens est échangée.
      refreshPromise = refreshPromise || refreshAccessToken().finally(() => { refreshPromise = null; });
      const newAccess = await refreshPromise;
      config.headers.Authorization = `Bearer ${newAccess}`;
      return api(config);
    } catch (_e) {
      clearSessionAndRedirect();
      return Promise.reject(error);
    }
  }
);

export default api;

/** Retourne la langue active (stockée par le switcher de langue). */
function getLang() {
  if (typeof window === "undefined") return "fr";
  return localStorage.getItem("immobf_lang") || "fr";
}

export const Properties = {
  search: (params) => api.get("/properties", { params: { ...params, lang: getLang() } }).then((r) => r.data),
  get: (id) => api.get(`/properties/${id}`, { params: { lang: getLang() } }).then((r) => r.data),
  availability: (id) => api.get(`/properties/${id}/availability`).then((r) => r.data),
  create: (data) => api.post("/properties", data).then((r) => r.data),
  update: (id, data) => api.patch(`/properties/${id}`, data).then((r) => r.data),
  publish: (id) => api.post(`/properties/${id}/publish`).then((r) => r.data),
  trackView: (id, payload = {}) => api.post(`/properties/${id}/view`, payload).then((r) => r.data),
  estimate: (data) => api.post("/properties/estimate", data).then((r) => r.data),
  myListings: () => api.get("/my/listings").then((r) => r.data),
  deleteListing: (id) => api.delete(`/my/listings/${id}`).then((r) => r.data),
  renewListing: (id) => api.post(`/my/listings/${id}/renew`).then((r) => r.data),
  // Blocage manuel de dates (annonceur, court séjour)
  listBlockDates: (id) => api.get(`/my/listings/${id}/block-dates`).then((r) => r.data),
  addBlockDate: (id, data) => api.post(`/my/listings/${id}/block-dates`, data).then((r) => r.data),
  deleteBlockDate: (id, blockId) => api.delete(`/my/listings/${id}/block-dates/${blockId}`).then((r) => r.data),
};

export const Sellers = {
  get: (id) => api.get(`/sellers/${id}`).then((r) => r.data),
};

export const Messages = {
  start: (property_id) => api.post("/conversations", { property_id }).then((r) => r.data),
  list: () => api.get("/conversations").then((r) => r.data),
  unread: () => api.get("/conversations/unread").then((r) => r.data),
  getMessages: (id) => api.get(`/conversations/${id}/messages`).then((r) => r.data),
  send: (id, body) => api.post(`/conversations/${id}/messages`, { body }).then((r) => r.data),
};

export const Auth = {
  register: (data) => api.post("/auth/register", data).then((r) => r.data),
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  verifyOtp: (data) => api.post("/auth/otp/verify", data).then((r) => r.data),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (data) => api.post("/auth/reset-password", data).then((r) => r.data),
  updateEmail: (email) => api.patch("/auth/me/email", { email }).then((r) => r.data),
  updateProfile: (data) => api.patch("/auth/me/profile", data).then((r) => r.data),
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
  availability: (id) => api.get(`/properties/${id}/availability`).then((r) => r.data),
  suggestions: (sessionId) => api.get("/suggestions", { params: { session_id: sessionId } }).then((r) => r.data),
  myStats: () => api.get("/my/stats").then((r) => r.data),
  dashboard: () => api.get("/my/stats/dashboard").then((r) => r.data),
};

export const Photos = {
  upload: (propertyId, files) => {
    const form = new FormData();
    files.forEach((f) => form.append("photos", f));
    return api.post(`/properties/${propertyId}/photos`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
  delete: (propertyId, photoId) =>
    api.delete(`/properties/${propertyId}/photos/${photoId}`).then((r) => r.data),
};

export const Payments = {
  providers: (country = "BF") => api.get("/payments/providers", { params: { country } }).then((r) => r.data),
  initiate: (data) => api.post("/payments/initiate", data).then((r) => r.data),
  list: () => api.get("/payments").then((r) => r.data),
  get: (id) => api.get(`/payments/${id}`).then((r) => r.data),
};

// Dashboard admin réel : liste des abonnés, délais de publication des
// annonces, blocage/déblocage et déconnexion forcée d'un compte.
export const Admin = {
  users: (params) => api.get("/admin/users", { params }).then((r) => r.data),
  setUserBlocked: (id, blocked) => api.patch(`/admin/users/${id}/block`, { blocked }).then((r) => r.data),
  logoutUser: (id) => api.post(`/admin/users/${id}/logout`).then((r) => r.data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`).then((r) => r.data),
  properties: (params) => api.get("/admin/properties", { params }).then((r) => r.data),
  deleteProperty: (id) => api.delete(`/admin/properties/${id}`).then((r) => r.data),
  revenues: () => api.get("/admin/revenues").then((r) => r.data),
  paymentStats: (params) => api.get("/admin/payment-stats", { params }).then((r) => r.data),
  updateProfile: (data) => api.patch("/admin/profile", data).then((r) => r.data),
  testEmail: (to) => api.post("/admin/test-email", { to }).then((r) => r.data),
  userStats: (id) => api.get(`/admin/users/${id}/stats`).then((r) => r.data),
  sendNewsletter: (data) => api.post("/admin/newsletter", data).then((r) => r.data),
  getPromo: () => api.get("/admin/promo").then((r) => r.data),
  setPromo: (data) => api.post("/admin/promo", data).then((r) => r.data),
  extendListing: (id, days, note) => api.post(`/admin/properties/${id}/extend`, { days, note }).then((r) => r.data),
  suspendListing: (id, note) => api.post(`/admin/properties/${id}/suspend`, { note }).then((r) => r.data),
  restoreListing: (id) => api.post(`/admin/properties/${id}/restore`).then((r) => r.data),
  transactions: (params) => api.get("/admin/transactions", { params }).then((r) => r.data),
  contacts: (params) => api.get("/admin/contacts", { params }).then((r) => r.data),
  sendContactNewsletter: (data) => api.post("/admin/contacts/newsletter", data).then((r) => r.data),
  getPricing: () => api.get("/admin/pricing").then((r) => r.data),
  setPricing: (data) => api.patch("/admin/pricing", data).then((r) => r.data),
  reviews: () => api.get("/admin/reviews").then((r) => r.data),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`).then((r) => r.data),
};

export const Config = {
  promo: () => api.get("/config/promo").then((r) => r.data),
  pricing: () => api.get("/config/pricing").then((r) => r.data),
};

export const Reviews = {
  submit:    (propertyId, data) => api.post(`/properties/${propertyId}/review`, data).then((r) => r.data),
  myReview:  (propertyId)       => api.get(`/properties/${propertyId}/review/me`).then((r) => r.data),
  forSeller: (sellerId, params) => api.get(`/sellers/${sellerId}/reviews`, { params }).then((r) => r.data),
};
