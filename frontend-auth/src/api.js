import axios from 'axios';

// Axios instance that automatically attaches the JWT token from localStorage
// Use the API URL from environment variables when available. If it is not
// provided, fall back to a relative `/api` path so the frontend can work
// regardless of where the backend is hosted. During development the Vite
// proxy will redirect these calls to the backend server.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
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
