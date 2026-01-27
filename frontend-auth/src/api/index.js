import axios from 'axios';
import { clearStoredClubId, getStoredClubId } from '../utils/clubContext';

const ensureApiSuffix = (value) => {
  if (!value) return null;
  const trimmed = value.replace(/\/+$/, '');
  const withSuffix = trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  return `${withSuffix}/`;
};

const unique = (values) => Array.from(new Set(values.filter(Boolean)));
const isAbsoluteUrl = (value) =>
  typeof value === 'string' && (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.startsWith('//'));

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

// Build a list of candidate base URLs used by the Axios instance. The helper
// normalises values received from the environment so every deployment ends up
// calling the backend under the expected `/api` prefix while still allowing a
// graceful fallback when the primary endpoint is temporarily unavailable or
// misconfigured during deploys.
const buildApiBaseUrlCandidates = () => {
  const rawEnvUrl =
    import.meta.env.VITE_API_BASE?.trim() || import.meta.env.VITE_API_URL?.trim();
  const envIsRelative = rawEnvUrl ? !isAbsoluteUrl(rawEnvUrl) : false;

  const isBrowser = typeof window !== 'undefined';
  const candidates = [];

  if (rawEnvUrl) {
    const normalised = ensureApiSuffix(rawEnvUrl);

    if (!isBrowser) {
      if (normalised) candidates.push(normalised);
    } else {
      const configured = ensureApiSuffix(
        resolveConfiguredBase(rawEnvUrl, window.location.origin) || normalised
      );
      if (configured) candidates.push(configured);

      if (envIsRelative) {
        const { protocol, hostname } = window.location;
        const hasWwwPrefix = hostname.startsWith('www.');
        const alternateHost = hasWwwPrefix ? hostname.replace(/^www\./i, '') : `www.${hostname}`;

        if (alternateHost && alternateHost !== hostname) {
          const alternateConfigured = resolveConfiguredBase(
            rawEnvUrl,
            `${protocol}//${alternateHost}`
          );
          if (alternateConfigured) {
            candidates.push(ensureApiSuffix(alternateConfigured));
          }
        }
      }
    }
  }

  if (rawEnvUrl) {
    if (isBrowser && !envIsRelative) {
      const { protocol, hostname } = window.location;
      const hasWwwPrefix = hostname.startsWith('www.');
      const alternateHost = hasWwwPrefix ? hostname.replace(/^www\./i, '') : `www.${hostname}`;

      if (alternateHost && alternateHost !== hostname) {
        candidates.push(ensureApiSuffix(`${protocol}//${alternateHost}`));
      }
    }

    return unique(candidates);
  }

  if (!isBrowser) {
    candidates.push(ensureApiSuffix('/'));
    return unique(candidates);
  }

  const backendPort = import.meta.env.VITE_BACKEND_PORT?.trim();
  const { protocol, hostname, origin } = window.location;
  const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(hostname);

  if (backendPort) {
    candidates.push(ensureApiSuffix(`${protocol}//${hostname}:${backendPort}`));
  }

  if (isLocalHost || import.meta.env.DEV) {
    const port = backendPort || '5000';
    candidates.push(ensureApiSuffix(`${protocol}//${hostname}:${port}`));
  }

  // Prefer staying on the current origin to avoid accidental cross-origin
  // fallbacks (e.g. patincarrera.net -> www.patincarrera.net) that would
  // trigger CORS errors in production. Additional hosts can be injected via
  // `VITE_API_BASE`/`VITE_API_URL` when explicitly required.
  candidates.push(ensureApiSuffix(origin));

  // If the primary origin is temporarily unavailable (e.g. DNS propagation,
  // upstream 502) try the alternate host with/without the `www.` prefix before
  // giving up. This keeps the app usable during brief outages handled by the
  // CDN or while the apex domain is being updated.
  const hasWwwPrefix = hostname.startsWith('www.');
  const alternateHost = hasWwwPrefix ? hostname.replace(/^www\./i, '') : `www.${hostname}`;
  if (alternateHost && alternateHost !== hostname) {
    candidates.push(ensureApiSuffix(`${protocol}//${alternateHost}`));
  }

  return unique(candidates);
};

const baseUrlCandidates = buildApiBaseUrlCandidates();
let activeBaseUrlIndex = 0;

const getBaseUrlForIndex = (index) =>
  baseUrlCandidates[index] || baseUrlCandidates[0] || ensureApiSuffix('/');

const resolvedEnvBaseUrl = ensureApiSuffix(import.meta.env.VITE_API_URL?.trim());

const api = axios.create({
  baseURL: resolvedEnvBaseUrl || getBaseUrlForIndex(activeBaseUrlIndex),
  withCredentials: true
});

// Ensure the Axios instance ends up using the fully normalised base URL while
// keeping the snippet required by downstream consumers that rely on the raw
// `VITE_API_URL` configuration. When the environment variable isn't present we
// fall back to the dynamically resolved backend base.
api.defaults.baseURL = resolvedEnvBaseUrl || getBaseUrlForIndex(activeBaseUrlIndex);


api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  const clubId = getStoredClubId();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (clubId) {
    config.headers['X-Club-Id'] = clubId;
  }

  const fallbackAttempt = typeof config.__fallbackAttempt === 'number' ? config.__fallbackAttempt : 0;
  const candidateIndex =
    typeof config.__candidateIndex === 'number' ? config.__candidateIndex : activeBaseUrlIndex;

  config.__candidateIndex = candidateIndex;
  config.__fallbackAttempt = fallbackAttempt;

  const shouldForceCandidate = fallbackAttempt > 0;
  const baseUrl = shouldForceCandidate
    ? getBaseUrlForIndex(candidateIndex)
    : resolvedEnvBaseUrl || getBaseUrlForIndex(candidateIndex);

  config.baseURL = baseUrl;

  // Ensure request URLs remain relative so the Axios base URL is respected.
  if (config.baseURL && config.url?.startsWith('/')) {
    if (!config.baseURL.endsWith('/')) {
      config.baseURL = `${config.baseURL}/`;
    }
    config.url = config.url.replace(/^\/+/, '');
  }

  return config;
});

const shouldRetryWithFallback = (error) => {
  if (!error || !error.config) return false;

  const attempts = typeof error.config.__fallbackAttempt === 'number'
    ? error.config.__fallbackAttempt
    : 0;

  if (attempts >= baseUrlCandidates.length - 1) return false;

  const status = error.response?.status;

  if (!status) return true;

  return [500, 502, 503, 504, 521, 522, 523].includes(status);
};

api.interceptors.response.use(
  (response) => {
    if (typeof response?.config?.__candidateIndex === 'number') {
      const currentIndex = response.config.__candidateIndex;
      if (currentIndex !== activeBaseUrlIndex) {
        activeBaseUrlIndex = currentIndex;
        api.defaults.baseURL = resolvedEnvBaseUrl || getBaseUrlForIndex(activeBaseUrlIndex);
      }
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('rol');
      sessionStorage.removeItem('foto');
      clearStoredClubId();
      window.location.href = '/';
      return Promise.reject(error);
    }

    if (baseUrlCandidates.length > 1 && shouldRetryWithFallback(error)) {
      const currentIndex = typeof error.config.__candidateIndex === 'number'
        ? error.config.__candidateIndex
        : activeBaseUrlIndex;
      const nextIndex = currentIndex + 1;

      if (nextIndex < baseUrlCandidates.length) {
        const nextBaseUrl = getBaseUrlForIndex(nextIndex);
        error.config.__candidateIndex = nextIndex;
        error.config.__fallbackAttempt =
          (typeof error.config.__fallbackAttempt === 'number'
            ? error.config.__fallbackAttempt
            : 0) + 1;
        error.config.baseURL = nextBaseUrl;

        activeBaseUrlIndex = nextIndex;
        api.defaults.baseURL = nextBaseUrl;

        return api(error.config);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

export const login = (email, password) =>
  api.post('/auth/login', { email, password });
