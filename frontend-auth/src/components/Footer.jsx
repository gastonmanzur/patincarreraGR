import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import {
  CLUB_CONTEXT_EVENT,
  getStoredClubContactInfo,
  getStoredClubId,
  setStoredClubContactInfo
} from '../utils/clubContext';

const CONTACT_INFO_KEYS = [
  'phone',
  'email',
  'address',
  'mapUrl',
  'facebook',
  'instagram',
  'whatsapp',
  'x'
];

const normaliseContactValue = (value) => (typeof value === 'string' ? value : '');

const DEFAULT_CONTACT_INFO = Object.freeze({
  phone: '+54 9 117372-6166',
  email: 'patincarreragr25@gmail.com',
  address: 'Leandro N. Alem, B1748 Gran Buenos Aires, Provincia de Buenos Aires',
  mapUrl: 'https://maps.app.goo.gl/t7Wb4ci6P9zZrtGB8',
  facebook: 'https://www.facebook.com/',
  instagram: 'https://www.instagram.com/stories/patincarrerag.r/',
  whatsapp: '5491173726166',
  x: 'https://x.com/?lang=es'
});

const buildContactInfoState = (data = {}, fallback = DEFAULT_CONTACT_INFO) =>
  CONTACT_INFO_KEYS.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      acc[key] = normaliseContactValue(data[key]);
    } else if (fallback && Object.prototype.hasOwnProperty.call(fallback, key)) {
      acc[key] = normaliseContactValue(fallback[key]);
    } else {
      acc[key] = '';
    }
    return acc;
  }, {});

const createEmptyContactInfo = () =>
  CONTACT_INFO_KEYS.reduce((acc, key) => {
    acc[key] = '';
    return acc;
  }, {});

export default function Footer() {
  const [message, setMessage] = useState('');
  const [contactInfo, setContactInfo] = useState(() => {
    const stored = getStoredClubContactInfo();
    if (stored) {
      return buildContactInfoState(stored, DEFAULT_CONTACT_INFO);
    }
    return { ...DEFAULT_CONTACT_INFO };
  });

  const applyContactInfo = useCallback((data = {}) => {
    setContactInfo((prev) => {
      const next = buildContactInfoState(data, prev);
      setStoredClubContactInfo(next);
      return next;
    });
  }, []);

  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchContactInfo = useCallback(async () => {
    try {
      const clubId = getStoredClubId();
      const config = clubId ? { params: { clubId } } : {};
      const res = await api.get('/public/club-contact', config);
      if (!mountedRef.current) return;
      applyContactInfo(res.data?.contactInfo || {});
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Error al obtener la información de contacto del club', err);
      applyContactInfo(DEFAULT_CONTACT_INFO);
    }
  }, [applyContactInfo]);

  useEffect(() => {
    void fetchContactInfo();
  }, [fetchContactInfo]);

  useEffect(() => {
    const handleClubContextChange = () => {
      setContactInfo(createEmptyContactInfo());
      void fetchContactInfo();
    };

    window.addEventListener(CLUB_CONTEXT_EVENT, handleClubContextChange);
    return () => {
      window.removeEventListener(CLUB_CONTEXT_EVENT, handleClubContextChange);
    };
  }, [fetchContactInfo]);

  useEffect(() => {
    const handleUpdate = (event) => {
      if (!event || typeof event !== 'object') return;
      applyContactInfo(event.detail?.contactInfo || {});
    };

    window.addEventListener('clubContactInfoUpdated', handleUpdate);
    return () => {
      window.removeEventListener('clubContactInfoUpdated', handleUpdate);
    };
  }, [applyContactInfo]);

  const cleanDigits = (value) => (typeof value === 'string' ? value.replace(/\D+/g, '') : '');
  const whatsappNumber = cleanDigits(contactInfo.whatsapp || contactInfo.phone);
  const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(
    navigator.userAgent
  );
  let whatsappLink = '';
  if (whatsappNumber) {
    whatsappLink = isMobile
      ? `https://api.whatsapp.com/send?phone=${whatsappNumber}`
      : `https://web.whatsapp.com/send?phone=${whatsappNumber}`;
  } else if (typeof contactInfo.whatsapp === 'string' && contactInfo.whatsapp.startsWith('http')) {
    whatsappLink = contactInfo.whatsapp;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contacto', {
        mensaje: message
      });
      alert('Mensaje enviado');
      setMessage('');
    } catch (err) {
      console.error(err);
      alert('Error al enviar el mensaje');
    }
  };

  return (
    <footer className="footer-custom text-light mt-auto pt-5">
      <div className="container py-5">
        <div className="row justify-content-center mb-4">
          <div className="col-md-6 col-lg-4">
            <h5 className="text-center">Contacto</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-2">
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Mensaje"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary w-100">
                Enviar
              </button>
            </form>
          </div>
        </div>

        <div className="row">
          <div className="col-md-4 mb-4">
            <ul className="list-unstyled">
              {contactInfo.phone && (
                <li className="mb-2">
                  <i className="bi bi-telephone me-2"></i> {contactInfo.phone}
                </li>
              )}
              {!contactInfo.phone && contactInfo.whatsapp && (
                <li className="mb-2">
                  <i className="bi bi-telephone me-2"></i> {contactInfo.whatsapp}
                </li>
              )}
              {contactInfo.email && (
                <li className="mb-2">
                  <i className="bi bi-envelope me-2"></i>{' '}
                  <a href={`mailto:${contactInfo.email}`} className="text-light text-decoration-none">
                    {contactInfo.email}
                  </a>
                </li>
              )}
              {(contactInfo.address || contactInfo.mapUrl) && (
                <li className="mb-2">
                  <i className="bi bi-geo-alt me-2"></i>
                  {contactInfo.mapUrl ? (
                    <a
                      href={contactInfo.mapUrl}
                      className="text-light text-decoration-none"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {contactInfo.address || 'Ver ubicación'}
                    </a>
                  ) : (
                    contactInfo.address
                  )}
                </li>
              )}
            </ul>
          </div>
          <div className="col-md-4 mb-4 text-center">
            <h5 className="text-center">Enlaces</h5>
            <ul className="list-unstyled">
              <li>
                <Link to="/home" className="text-light text-decoration-none">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/torneos" className="text-light text-decoration-none">
                  Torneos
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-md-4 mb-4">
            <div className="d-flex gap-3">
              {contactInfo.facebook && (
                <a href={contactInfo.facebook} className="text-light" aria-label="Facebook">
                  <i className="bi bi-facebook fs-4"></i>
                </a>
              )}
              {contactInfo.instagram && (
                <a href={contactInfo.instagram} className="text-light" aria-label="Instagram">
                  <i className="bi bi-instagram fs-4"></i>
                </a>
              )}
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  className="text-light"
                  aria-label="WhatsApp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="bi bi-whatsapp fs-4"></i>
                </a>
              )}
              {contactInfo.x && (
                <a href={contactInfo.x} className="text-light" aria-label="X">
                  <i className="bi bi-twitter-x fs-4"></i>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="footer-custom text-center py-2">
        <small>© {new Date().getFullYear()} Todos los derechos reservados</small>
      </div>
    </footer>
  );
}

