import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const api = axios.create({ baseURL: baseURL + "/api/v1" });

api.interceptors.request.use(function(cfg) {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("immobf_token");
    if (token) cfg.headers.Authorization = "Bearer " + token;
  }
  return cfg;
});

export default api;

function getLang() {
  if (typeof window === "undefined") return "fr";
  return localStorage.getItem("immobf_lang") || "fr";
}

export var Properties = {
  search: function(params) {
    return api.get("/properties", { params: Object.assign({}, params, { lang: getLang() }) }).then(function(r) { return r.data; });
  },
  get: function(id) {
    return api.get("/properties/" + id, { params: { lang: getLang() } }).then(function(r) { return r.data; });
  },
  create: function(data) { return api.post("/properties", data).then(function(r) { return r.data; }); },
  publish: function(id) { return api.post("/properties/" + id + "/publish").then(function(r) { return r.data; }); },
  estimate: function(data) { return api.post("/properties/estimate", data).then(function(r) { return r.data; }); }
};

export var Auth = {
  register: function(data) { return api.post("/auth/register", data).then(function(r) { return r.data; }); },
  login: function(data) { return api.post("/auth/login", data).then(function(r) { return r.data; }); },
  me: function() { return api.get("/auth/me").then(function(r) { return r.data; }); },
  verifyOtp: function(data) { return api.post("/auth/otp/verify", data).then(function(r) { return r.data; }); }
};

export var Payments = {
  providers: function(country) {
    var c = country || "BF";
    return api.get("/payments/providers", { params: { country: c } }).then(function(r) { return r.data; });
  },
  initiate: function(data) { return api.post("/payments/initiate", data).then(function(r) { return r.data; }); },
  list: function() { return api.get("/payments").then(function(r) { return r.data; }); },
  get: function(id) { return api.get("/payments/" + id).then(function(r) { return r.data; }); }
};

export var Photos = {
  upload: function(propertyId, files) {
    var formData = new FormData();
    for (var i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    return api.post("/properties/" + propertyId + "/photos", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }).then(function(r) { return r.data; });
  }
};
