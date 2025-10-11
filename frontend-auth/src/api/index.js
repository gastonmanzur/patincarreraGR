import axios from 'axios';

const ensureApiSuffix = (value) => {
  if (!value) return null;
  const trimmed = value.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const resolveConfiguredBase = (rawUrl, origin) => {
  try {
    const resolved = new URL(rawUrl, origin);
    resolved.hash = '';
    resolved.search = '';
    const basePath = resolved.pathname.replace(/\/+$/, '');
    return ensureApiSuffix(`${resolved.origin}${basePath}`);
  } catch {
    return null;
  }
};

// Build the base URL used by the Axios instance. The helper normalises
// values received from the environment so every deployment ends up
// calling the backend under the expected `/api` prefix.
const buildApiBaseUrl = () => {
  const rawEnvUrl =
    import.meta.env.VITE_API_BASE?.trim() || import.meta.env.VITE_API_URL?.trim();

  const isBrowser = typeof window !== 'undefined';

  if (rawEnvUrl) {
    const normalised = ensureApiSuffix(rawEnvUrl);

    if (!isBrowser) {
      if (normalised) return normalised;
    } else {
      const configured = resolveConfiguredBase(rawEnvUrl, window.location.origin) || normalised;
      if (configured) return configured;
    }
  }

  if (!isBrowser) return '/api';

  const backendPort = import.meta.env.VITE_BACKEND_PORT?.trim();
  const { protocol, hostname, origin } = window.location;
  const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(hostname);

  // During local development the Vite dev server might be accessed via the
  // machine's LAN IP (e.g. from a phone on the same network). In those cases
  // `hostname` isn't `localhost` so we also check `import.meta.env.DEV` to keep
  // pointing requests to the Express server running on the backend port.
  if (isLocalHost || import.meta.env.DEV) {
    const port = backendPort || '5000';
    return `${protocol}//${hostname}:${port}/api`;
  }

  if (backendPort) {
    return `${protocol}//${hostname}:${backendPort}/api`;
  }

  const normalisedOrigin = origin.replace(/\/+$/, '');
  return `${normalisedOrigin}/api`;
};

const resolvedEnvBaseUrl = ensureApiSuffix(import.meta.env.VITE_API_URL?.trim());

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || buildApiBaseUrl(),
  withCredentials: true
});

// Ensure the Axios instance ends up using the fully normalised base URL while
// keeping the snippet required by downstream consumers that rely on the raw
// `VITE_API_URL` configuration. When the environment variable isn't present we
// fall back to the dynamically resolved backend base.
api.defaults.baseURL = resolvedEnvBaseUrl || buildApiBaseUrl();


api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  const clubId = sessionStorage.getItem('clubId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (clubId && clubId !== 'null') {
    config.headers['X-Club-Id'] = clubId;
  }

  // Ensure request URLs remain relative so the Axios base URL is respected.
  if (config.url?.startsWith('/')) {
    config.url = config.url.slice(1);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('rol');
      sessionStorage.removeItem('foto');
      sessionStorage.removeItem('clubId');
      window.location.href = '/';
    }

    return Promise.reject(error);
  },
);

export default api;

export const login = (email, password) =>
  api.post('/auth/login', { email, password });
