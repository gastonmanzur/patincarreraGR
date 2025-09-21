import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import placeholderImage from '../assets/image-placeholder.svg';

/**
 * Imagen resiliente que reemplaza la fuente original por un marcador
 * de posición cuando la petición devuelve 404 u otro error de carga.
 * También evita bucles infinitos de reintentos.
 */
export default function ImageWithFallback({ src, alt, fallback, onError, ...props }) {
  const resolvedFallback = useMemo(() => {
    const trimmed = typeof fallback === 'string' ? fallback.trim() : '';
    return trimmed || placeholderImage;
  }, [fallback]);

  const [currentSrc, setCurrentSrc] = useState(() => {
    const trimmed = typeof src === 'string' ? src.trim() : '';
    return trimmed || resolvedFallback;
  });

  useEffect(() => {
    const trimmed = typeof src === 'string' ? src.trim() : '';
    setCurrentSrc(trimmed || resolvedFallback);
  }, [src, resolvedFallback]);

  const handleError = (event) => {
    if (event?.currentTarget) {
      // Evitar bucles infinitos en navegadores antiguos.
      event.currentTarget.onerror = null;
    }
    if (typeof onError === 'function') {
      onError(event);
    }
    setCurrentSrc((previous) => (previous === resolvedFallback ? previous : resolvedFallback));
  };

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      onError={handleError}
    />
  );
}

ImageWithFallback.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  fallback: PropTypes.string,
  onError: PropTypes.func
};

ImageWithFallback.defaultProps = {
  src: '',
  fallback: undefined,
  onError: undefined
};
