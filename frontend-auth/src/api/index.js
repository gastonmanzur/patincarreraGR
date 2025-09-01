import axios from 'axios';

// Axios instance that automatically attaches the JWT token from localStorage.
// Use the API URL from environment variables when available. If not provided,
// build a default URL using the current hostname so that the frontend can reach
// the backend even when it runs on a different machine from the browser.
const defaultBaseUrl = `http://${window.location.hostname}:5000/api`;
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
