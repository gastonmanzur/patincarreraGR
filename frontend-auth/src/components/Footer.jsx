import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Footer() {
  const [historyVisible, setHistoryVisible] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [message, setMessage] = useState('');

  const phoneNumber = '5491173726166';
  const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(
    navigator.userAgent
  );
  const whatsappLink = isMobile
    ? `https://api.whatsapp.com/send?phone=${phoneNumber}`
    : `https://web.whatsapp.com/send?phone=${phoneNumber}`;

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

        <div className="row">
          <div className="col-md-4 mb-4">
            <ul className="list-unstyled">
              <li className="mb-2">
                <i className="bi bi-telephone me-2"></i> +54 9 117372-6166
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
          <div className="col-md-4 mb-4 text-center">
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
          <div className="col-md-4 mb-4">
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
                href={whatsappLink}
                className="text-light"
                aria-label="WhatsApp"
                target="_blank"
                rel="noopener noreferrer"
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
        </div>
      </div>
      <div className="footer-custom text-center py-2">
        <small>© {new Date().getFullYear()} Todos los derechos reservados</small>
      </div>
    </footer>
  );
}

