import axios from 'axios';

// Determine the base URL for API requests. If an explicit URL is provided via
// `VITE_API_URL`, ensure it includes the `/api` prefix expected by the backend.
// Otherwise, default to the current origin with the `/api` path.
const envUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const baseURL = envUrl
  ? envUrl.endsWith('/api')
    ? envUrl
    : `${envUrl}/api`
  : `${window.location.origin}/api`;

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Ensure request URLs are relative so the `/api` prefix in `baseURL` remains.
  if (config.url?.startsWith('/')) {
    config.url = config.url.slice(1);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('rol');
      localStorage.removeItem('foto');
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export default api;
