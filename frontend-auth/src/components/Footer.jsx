import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Footer() {
  const [historyVisible, setHistoryVisible] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
        nombre: name,
        email,
        mensaje: message
      });
      alert('Mensaje enviado');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      console.error(err);
      alert('Error al enviar el mensaje');
    }
  };

  return (
    <footer className="bg-dark text-light mt-5">
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
              <img src="/vite.svg" alt="Logo" width="80" height="80" className="mb-3" />
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
                <i className="bi bi-telephone me-2"></i> 647-754-0472
              </li>
              <li className="mb-2">
                <i className="bi bi-envelope me-2"></i> GaelMakioblight@aol.com
              </li>
              <li className="mb-2">
                <i className="bi bi-geo-alt me-2"></i> 1719 Park Boulevard Marshalltown, IA 50158
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
            <h5>Redes Sociales</h5>
            <div className="d-flex gap-3">
              <a href="#" className="text-light" aria-label="Facebook">
                <i className="bi bi-facebook fs-4"></i>
              </a>
              <a href="#" className="text-light" aria-label="Instagram">
                <i className="bi bi-instagram fs-4"></i>
              </a>
              <a href="#" className="text-light" aria-label="WhatsApp">
                <i className="bi bi-whatsapp fs-4"></i>
              </a>
              <a href="#" className="text-light" aria-label="X">
                <i className="bi bi-twitter-x fs-4"></i>
              </a>
            </div>
          </div>
          <div className="col-md-3 mb-4">
            <h5>Contacto</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-2">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
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
      <div className="bg-secondary text-center py-2">
        <small>© {new Date().getFullYear()} Todos los derechos reservados</small>
      </div>
    </footer>
  );
}

