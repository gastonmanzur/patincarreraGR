import axios from 'axios';

// Axios instance that automatically attaches the JWT token from localStorage.
// Use the API URL from environment variables when available. If not provided,
// build a default URL using the current page's protocol and hostname. This
// avoids mixed-content errors when the frontend is served over HTTPS by
// matching the protocol used by the page while still defaulting to port 5000
// for local development. The port can be overridden via `VITE_BACKEND_PORT`.
const port = import.meta.env.VITE_BACKEND_PORT || 5000;
const defaultBaseUrl = `${window.location.protocol}//${window.location.hostname}:${port}/api`;
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el servidor responde 401, limpiamos los datos y redirigimos al inicio
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
  }
);

export default api;
