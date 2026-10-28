import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

let isRefreshing = false;
let refreshSubscribers = [];

/* ======================================================
   Notify queued requests
====================================================== */

const onRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

/* ======================================================
   REQUEST INTERCEPTOR
====================================================== */

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/* ======================================================
   RESPONSE INTERCEPTOR
====================================================== */

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    /*
      Ignore requests without responses
      (network loss, internet outage, Cloudflare tunnel restart, etc.)
    */

    if (!error.response) {
      console.warn("Network connection unavailable.");

      return Promise.reject(error);
    }

    /*
      Ignore anything except 401
    */

    if (error.response.status !== 401) {
      return Promise.reject(error);
    }

    /*
      Prevent infinite refresh loop
    */

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    /*
      If another refresh is already running,
      wait for it.
    */

    if (isRefreshing) {
      return new Promise((resolve) => {
        addRefreshSubscriber((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;

          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        throw new Error("Missing refresh token.");
      }

      const response = await axios.post(`${API_BASE}/auth/refresh`, {
        refreshToken,
      });

      const newToken = response.data.token;
      const newRefreshToken = response.data.refreshToken;

      localStorage.setItem("token", newToken);

      localStorage.setItem("refreshToken", newRefreshToken);

      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      onRefreshed(newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      //localStorage.clear();

      //window.location.replace("/login");

      console.error("REFRESH FAILED", refreshError);

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
