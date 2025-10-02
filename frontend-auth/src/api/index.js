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
    if (!isBrowser) {
      const direct = ensureApiSuffix(rawEnvUrl);
      if (direct) return direct;
    } else {
      const configured = resolveConfiguredBase(rawEnvUrl, window.location.origin);
      if (configured) {
        const configuredUrl = new URL(configured);
        const hostMatches = configuredUrl.origin === window.location.origin;
        const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(
          window.location.hostname
        );

        if (hostMatches || import.meta.env.DEV || isLocalHost) {
          return configured;
        }
      }
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

const api = axios.create({
  baseURL: buildApiBaseUrl(),
  withCredentials: true
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem('token');
      localStorage.removeItem('rol');
      localStorage.removeItem('foto');
      window.location.href = '/';
    }

    return Promise.reject(error);
  },
);

export default api;
