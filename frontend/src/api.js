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
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401/403 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/signUp');
    if (!isAuthRoute && error.response && (error.response.status === 401 || error.response.status === 403)) {
      const hadToken = !!localStorage.getItem('jwt');
      localStorage.removeItem('jwt');
      if (hadToken) {
        window.dispatchEvent(new Event('jwt_expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
