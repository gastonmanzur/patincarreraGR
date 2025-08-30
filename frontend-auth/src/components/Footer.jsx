import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Footer() {
  const [historyVisible, setHistoryVisible] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [message, setMessage] = useState('');

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
    <footer className="footer-custom text-light mt-5">
      <div className="container py-5">
        <div className="row">
          <div className="col-md-3 mb-4">
            <div
              className="position-relative d-inline-block"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={togglePinned}
              style={{ cursor: 'pointer' }}
            >
              <img src="/robot.svg" alt="Logo" width="400" height="400" className="mb-3" />
              {historyVisible && (
                <div className="history-bubble">
                  <p className="mb-0 small">
                    El club fue fundado en 1980 con el objetivo de promover el patín carrera en la región.
                  </p>
                </div>
              )}
            </div>
            <ul className="list-unstyled mt-3">
              <li className="mb-2">
                <i className="bi bi-telephone me-2"></i> +54 9 11 9999-9999
              </li>
              <li className="mb-2">
                <i className="bi bi-envelope me-2"></i> patincarreragr25@gmail.com
              </li>
              <li className="mb-2">
                <i className="bi bi-geo-alt me-2"></i>
                <a
                  href="https://maps.app.goo.gl/t7Wb4ci6P9zZrtGB8"
                  className="text-light text-decoration-none"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Leandro N. Alem, B1748 Gran Buenos Aires, Provincia de Buenos Aires
                </a>
              </li>
            </ul>
          </div>
          <div className="col-md-3 mb-4">
            <h5>Enlaces</h5>
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
          <div className="col-md-3 mb-4">
            <div className="d-flex gap-3">
              <a
                href="https://www.facebook.com/"
                className="text-light"
                aria-label="Facebook"
              >
                <i className="bi bi-facebook fs-4"></i>
              </a>
              <a
                href="https://www.instagram.com/stories/patincarrerag.r/"
                className="text-light"
                aria-label="Instagram"
              >
                <i className="bi bi-instagram fs-4"></i>
              </a>
              <a
                href="https://wa.me/5491199999999"
                className="text-light"
                aria-label="WhatsApp"
              >
                <i className="bi bi-whatsapp fs-4"></i>
              </a>
              <a
                href="https://x.com/?lang=es"
                className="text-light"
                aria-label="X"
              >
                <i className="bi bi-twitter-x fs-4"></i>
              </a>
            </div>
          </div>
          <div className="col-md-3 mb-4">
            <h5>Contacto</h5>
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
      </div>
      <div className="footer-custom text-center py-2">
        <small>© {new Date().getFullYear()} Todos los derechos reservados</small>
      </div>
    </footer>
  );
}

