import api from '../api';

/**
 * Normaliza las rutas de imágenes provenientes del backend.
 * Muchos registros antiguos almacenan solo el nombre del archivo o
 * un path relativo como `uploads/archivo.png`. Esta función garantiza
 * que siempre devolvamos una URL absoluta válida hacia `/api/uploads`.
 *
 * @param {string | undefined | null} rawPath Ruta cruda recibida desde la API.
 * @returns {string} URL lista para usarse en etiquetas <img>. Devuelve
 *          una cadena vacía si no existe imagen.
 */
export default function getImageUrl(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    return '';
  }

  const trimmed = rawPath.trim();
  if (!trimmed) {
    return '';
  }

  // Si ya es una URL absoluta o un data URI, la devolvemos tal cual.
  if (/^(https?:\/\/|data:)/i.test(trimmed)) {
    return trimmed;
  }

  // Eliminamos barras iniciales y el prefijo "api/" si estuviera presente.
  let normalized = trimmed.replace(/^\/+/, '').replace(/\\+/g, '/');

  if (/^api\//i.test(normalized)) {
    normalized = normalized.replace(/^api\/+/, '');
  }

  if (!normalized.startsWith('uploads/')) {
    normalized = `uploads/${normalized}`;
  }

  const base = (api.defaults?.baseURL || `${window.location.origin}/api`).replace(/\/+$/, '');

  try {
    return new URL(normalized, `${base}/`).href;
  } catch (err) {
    console.error('No se pudo construir la URL de la imagen:', err);
    return `${base}/${normalized}`;
  }
}

