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

// Determine the base URL for API requests. If an explicit URL is provided via
// `VITE_API_URL`, ensure it includes the `/api` prefix expected by the backend.
// Otherwise, default to the current origin with the `/api` path.

/*const envUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

// Strip any trailing slashes from the provided API URL to avoid "//" in requests.
const envUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

const baseURL = envUrl
  ? envUrl.endsWith('/api')
    ? envUrl
    : `${envUrl}/api`
  : `${window.location.origin}/api`;*/


// When an explicit API URL is provided, ensure it always targets the
// `/api` prefix expected by the backend. This avoids subtle deployment
// bugs where `VITE_API_URL` lacks the `/api` suffix and requests end up
// hitting the wrong path (e.g. `https://api.example.com/auth/registro`
// instead of `https://api.example.com/api/auth/registro`).
const envUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

// When running the Vite dev server the frontend lives on port 5173 while the
// API continues listening on 5000. Without an explicit API URL the previous
// logic attempted to hit `http://localhost:5173/api`, which obviously does not
// exist and resulted in 404 responses such as the one reported for
// `/api/competencias`. Detect the common local development hostnames and
// fallback to the backend port instead so developers get a working experience
// without having to define environment variables.
const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/.test(
  window.location.origin
);
const backendPort = import.meta.env.VITE_BACKEND_PORT?.trim();

const localFallbackBaseUrl = backendPort
  ? `${window.location.protocol}//${window.location.hostname}:${backendPort}/api`
  : 'http://localhost:5000/api';

const defaultBaseUrl = isLocalhost
  ? localFallbackBaseUrl
  : `${window.location.origin.replace(/\/+$/, '')}/api`;


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
