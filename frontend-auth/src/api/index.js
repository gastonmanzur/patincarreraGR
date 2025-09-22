import axios from 'axios';

// Normalise a raw URL so it always points to the backend `/api` prefix.
const buildApiBaseUrl = () => {
  const rawEnvUrl = import.meta.env.VITE_API_URL?.trim();

  if (rawEnvUrl) {
    const normalised = rawEnvUrl.replace(/\/+$/, '');
    return normalised.endsWith('/api') ? normalised : `${normalised}/api`;
  }

  const backendPort = import.meta.env.VITE_BACKEND_PORT?.trim();
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(hostname);

  if (isLocalHost) {
    const port = backendPort || '5000';
    return `${protocol}//${hostname}:${port}/api`;
  }

  const origin = window.location.origin.replace(/\/+$/, '');
  if (backendPort) {
    return `${protocol}//${hostname}:${backendPort}/api`;
  }

  return `${origin}/api`;
};

const api = axios.create({
  baseURL: buildApiBaseUrl()
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
