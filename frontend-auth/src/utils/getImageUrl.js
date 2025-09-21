import api from '../api';

/**
 * Normaliza las rutas de imágenes provenientes del backend.
 * Muchos registros antiguos almacenan solo el nombre del archivo o
 * un path relativo como `uploads/archivo.png`. Esta función garantiza
 * que siempre devolvamos una URL absoluta válida hacia `/api/uploads`.
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
  try {
    backendHost = normalizeHost(new URL(base).hostname);
  } catch (error) {
    console.warn('No se pudo determinar el host base para las imágenes.', error);
  }
  const currentHost = normalizeHost(window.location.hostname);

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
      const shouldRewriteHttpSameDomain =
        parsed.protocol === 'http:' &&
        (candidateHost === backendHost || candidateHost === currentHost);

      if (!isLocalHost && !shouldRewriteHttpSameDomain) {
        return candidate;
      }
      // Tomamos únicamente la ruta, preservando posibles prefijos como `/api`.
      candidate = `${parsed.pathname}${parsed.search || ''}`;
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
  let normalized = candidate.replace(/^\/+/, '').replace(/\\+/g, '/');

  normalized = normalized.replace(new RegExp('^api/+', 'i'), '');

  if (!normalized.startsWith('uploads/')) {
    normalized = `uploads/${normalized}`;
  }

  try {
    return new URL(normalized, `${base}/`).href;
  } catch (err) {
    console.error('No se pudo construir la URL de la imagen:', err);
    return `${base}/${normalized}`;
  }
}

