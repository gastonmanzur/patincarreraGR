import axios from 'axios';

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
const api = axios.create({
  baseURL: envUrl
    ? envUrl.endsWith('/api')
      ? envUrl
      : `${envUrl}/api`
    : defaultBaseUrl
});



/*const api = axios.create({
  baseURL,
  withCredentials: true,
});*/


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

