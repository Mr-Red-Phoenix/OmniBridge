import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track if refresh is currently pending to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle token refresh and session expiry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/') ||
      originalRequest?.url?.includes('/ott/') ||
      originalRequest?.url?.includes('/otp/');

    if (
      !isAuthRoute &&
      error.response &&
      (error.response.status === 401 || error.response.status === 403) &&
      !originalRequest._retry
    ) {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const res = await axios.post('/api/auth/refreshToken', {
            token: refreshToken,
          });
          const newAccessToken = res.data.accessToken;
          const newRefreshToken = res.data.refreshToken || refreshToken;

          localStorage.setItem('jwt', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          if (res.data.role) localStorage.setItem('role', res.data.role);

          api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          window.dispatchEvent(new Event('auth_changed'));
          return api(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem('jwt');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('role');
          window.dispatchEvent(new Event('jwt_expired'));
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      } else {
        localStorage.removeItem('jwt');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        window.dispatchEvent(new Event('jwt_expired'));
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Helper to build an EventSource URL with proper query params
 */
export const buildSseUrl = (endpoint, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/api${endpoint}${query ? `?${query}` : ''}`;
};

export default api;
