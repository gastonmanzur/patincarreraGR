import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Footer() {
  const [historyVisible, setHistoryVisible] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [message, setMessage] = useState('');
  const [contactInfo, setContactInfo] = useState({
    phone: '+54 9 117372-6166',
    email: 'patincarreragr25@gmail.com',
    address: 'Leandro N. Alem, B1748 Gran Buenos Aires, Provincia de Buenos Aires',
    mapUrl: 'https://maps.app.goo.gl/t7Wb4ci6P9zZrtGB8',
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/stories/patincarrerag.r/',
    whatsapp: '5491173726166',
    x: 'https://x.com/?lang=es'
  });

  const applyContactInfo = useCallback((data = {}) => {
    setContactInfo((prev) => ({
      phone: data.phone || prev.phone || '',
      email: data.email || prev.email || '',
      address: data.address || prev.address || '',
      mapUrl: data.mapUrl || prev.mapUrl || '',
      facebook: data.facebook || prev.facebook || '',
      instagram: data.instagram || prev.instagram || '',
      whatsapp: data.whatsapp || prev.whatsapp || '',
      x: data.x || prev.x || ''
    }));
  }, []);

  useEffect(() => {
    let active = true;

    const fetchContactInfo = async () => {
      try {
        const res = await api.get('/public/club-contact');
        if (!active) return;

        applyContactInfo(res.data?.contactInfo || {});
      } catch (err) {
        if (!active) return;
        console.error('Error al obtener la información de contacto del club', err);
      }
    };

    void fetchContactInfo();

    return () => {
      active = false;
    };
  }, [applyContactInfo]);

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

  const togglePinned = () => {
    const newPinned = !pinned;
    setPinned(newPinned);
    setHistoryVisible(newPinned);
  };

  const handleMouseEnter = () => {
    if (!pinned) setHistoryVisible(true);
  };

  const handleMouseLeave = () => {
    if (!pinned) setHistoryVisible(false);
  };

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
        <div className="row align-items-center mb-4">
          <div className="col-md-9 d-flex justify-content-center mb-4 mb-md-0">
            <div
              className={`robot-container ${historyVisible ? 'shift-left' : ''}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={togglePinned}
              style={{ cursor: 'pointer' }}
            >
              <img
                src="/robot.svg"
                alt="Logo"
                width="400"
                height="400"
                className={`robot-image mb-3 ${historyVisible ? 'shift-left' : ''}`}
              />
              {historyVisible && (
                <div className="history-bubble">
                  <p className="mb-0 small">
                    En 2021, el Municipio de General Rodríguez creó la Escuela de Patín Carrera como respuesta solidaria al fallecimiento del entrenador que formaba chicos en el Polideportivo Municipal y los llevaba a competir representando al club Social de Paso del Rey. Muchos de esos jóvenes quedaron sin club, y así nació un espacio propio para continuar su desarrollo. Desde entonces, la escuela no dejó de crecer: se afilió a la Asociación de Patinadores Metropolitanos (APM) y participó en torneos nacionales, logrando destacados resultados como el 2.º puesto en el Encuentro Nacional de Escuela y Transición (Moreno, octubre de 2024) y el 3.º puesto en el primer Encuentro Nacional de Escuela y Transición estilo INDOOR (CABA, abril de 2025). Hoy, la Escuela de Patín Carrera de General Rodríguez sigue formando deportistas y consolidando una comunidad en torno al esfuerzo y la velocidad.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="col-md-3">
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

