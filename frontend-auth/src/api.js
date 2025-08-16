import axios from 'axios';

// Axios instance that automatically attaches the JWT token from localStorage
// Use the API URL from environment variables when available. If it is not
// provided, fall back to `http://localhost:5000/api` so the frontend
// connects directly to the backend without relying on Vite's dev proxy.
// This avoids proxy connection errors when the dev server cannot reach the
// backend.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
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
