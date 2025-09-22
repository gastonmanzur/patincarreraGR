import axios from 'axios';

// Axios instance that automatically attaches the JWT token from localStorage.
// Use the API URL from environment variables when available. Otherwise, build
// a default URL using the page's protocol and hostname. For local development
// (`localhost`/`127.0.0.1`) default to port 5000, but in other environments use
// the current page's port (or the default port for the protocol). The port can
// always be overridden via `VITE_BACKEND_PORT`.
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const port =
  import.meta.env.VITE_BACKEND_PORT ||
  (isLocalhost ? 5000 : window.location.port);
const defaultBaseUrl =
  `${window.location.protocol}//${window.location.hostname}${port ? `:${port}` : ''}/api`;
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
