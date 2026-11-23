import axios from 'axios';

/**
 * Axios API client instance with baseURL from environment variables.
 * Injects Authorization header if JWT token is stored in localStorage.
 * Automatically clears session and redirects to /login on 401 Unauthorized responses.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('performiq_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: On 401 Unauthorized, purge stored auth and redirect to /login
// Note: Do NOT purge or redirect if the failing request is the login request itself (/auth/login),
// so wrong passwords/credentials can display error feedback on the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRequest = error.config && error.config.url && error.config.url.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('performiq_token');
        localStorage.removeItem('performiq_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
