import api from '../api';

const resolveUploadsBasePath = () => {
  const raw =
    import.meta.env.VITE_UPLOADS_BASE_PATH ||
    import.meta.env.VITE_UPLOADS_PUBLIC_PATH ||
    '/uploads';
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return '/uploads';
  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}`;
};

const uploadsBasePath = resolveUploadsBasePath();

const stripLeadingUploadsSegments = (value) =>
  value
    .replace(/^\/+/, '')
    .replace(/\\+/g, '/')
    .replace(/^api(?:\/+|$)/i, '')
    .replace(/^uploads(?:\/+|$)/i, '');

/**
 * Normaliza las rutas de imágenes provenientes del backend.
 * Muchos registros antiguos almacenan solo el nombre del archivo o
 * un path relativo como `uploads/archivo.png`. Esta función garantiza
 * que siempre devolvamos una URL absoluta válida hacia `/uploads`.
 *
 * @param {string | undefined | null} rawPath Ruta cruda recibida desde la API.
 * También reescribe URLs absolutas que apuntan a `localhost` u otros hosts
 * sólo accesibles en entornos de desarrollo, tomando únicamente la ruta y
 * reconstruyéndola con el dominio configurado para el backend actual. Adicionalmente
 * convierte URLs `http://` del mismo dominio (con o sin `www`) a `https://` para
 * evitar que los navegadores las bloqueen por contenido mixto.
 *
 * @returns {string} URL lista para usarse en etiquetas <img>. Devuelve una
 *          cadena vacía si no existe imagen.
 */
export default function getImageUrl(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    return '';
  }

  const trimmed = rawPath.trim();
  if (!trimmed) {
    return '';
  }

  const base = (api.defaults?.baseURL || `${window.location.origin}/api`).replace(/\/+$/, '');
  const normalizeHost = (host) => host?.replace(/^www\./i, '') || '';

  let backendHost = '';
  let backendProtocol = '';
  let backendOrigin = '';
  try {
    const backendUrl = new URL(base);
    backendHost = normalizeHost(backendUrl.hostname);
    backendProtocol = backendUrl.protocol;
    backendOrigin = backendUrl.origin;
  } catch (error) {
    console.warn('No se pudo determinar el host base para las imágenes.', error);
  }
  const currentHost = normalizeHost(window.location.hostname);
  const isPageServedOverHttps = window.location.protocol === 'https:';

  // Las URLs absolutas son válidas siempre que no apunten a hosts locales
  // (como `http://localhost:5000`) que quedan inaccesibles en producción.
  // En esos casos reciclamos únicamente la ruta para reconstruirla con el
  // host configurado en `api.defaults.baseURL`.
  let candidate = trimmed;

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const parsed = new URL(candidate);
      const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(parsed.hostname);
      const candidateHost = normalizeHost(parsed.hostname);
      const isSameBackendHost =
        candidateHost &&
        (candidateHost === backendHost || candidateHost === currentHost);
      const shouldRewriteHttpSameDomain =
        parsed.protocol === 'http:' &&
        isSameBackendHost &&
        (backendProtocol === 'https:' || isPageServedOverHttps);
      const pathWithoutLeadingSlash = parsed.pathname.replace(/^\/+/, '');
      const isUploadPath = /^((api\/)?uploads\/)/i.test(pathWithoutLeadingSlash);

      if (!isLocalHost && !shouldRewriteHttpSameDomain && (!isSameBackendHost || !isUploadPath)) {
        return candidate;
      }
      // Tomamos únicamente la ruta, preservando posibles prefijos como `/api` y
      // parámetros de consulta.
      const search = parsed.search || '';
      candidate = `${parsed.pathname}${search}`;

      if (isSameBackendHost && isUploadPath) {
        const cleanedPath = pathWithoutLeadingSlash.replace(/^api\/+/, '');
        if (!cleanedPath) {
          return '';
        }
        candidate = `${cleanedPath}${search}`;
      }
    } catch (error) {
      console.warn('URL de imagen inválida recibida, se usará el valor original.', error);
      return candidate;
    }
  }

  // Data URIs ya contienen toda la información necesaria.
  if (/^data:/i.test(candidate)) {
    return candidate;
  }

  // Normalizamos la ruta relativa eliminando barras iniciales, el prefijo
  // `api/` si estuviera presente y convirtiendo backslashes en forward
  // slashes.
  let pathPortion = candidate;
  let query = '';
  const queryIndex = pathPortion.indexOf('?');
  if (queryIndex !== -1) {
    query = pathPortion.slice(queryIndex);
    pathPortion = pathPortion.slice(0, queryIndex);
  }

  const normalized = stripLeadingUploadsSegments(pathPortion);

  if (!normalized) {
    return '';
  }

  const origin = backendOrigin || window.location.origin || '';
  const uploadsBaseUrl = origin
    ? `${origin.replace(/\/+$/, '')}${uploadsBasePath}`
    : uploadsBasePath;

  const baseWithoutTrailingSlash = uploadsBaseUrl.replace(/\/+$/, '');

  return `${baseWithoutTrailingSlash}/${normalized}${query}`;
}

