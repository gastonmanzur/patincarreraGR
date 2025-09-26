import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import LogoutButton from './LogoutButton';
import getImageUrl from '../utils/getImageUrl';
import placeholderAvatar from '../assets/image-placeholder.svg';

export default function Navbar() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const rol = localStorage.getItem('rol');
  const storedFoto = localStorage.getItem('foto');
  const normalisedFoto = getImageUrl(storedFoto);
  if (storedFoto && normalisedFoto !== storedFoto) {
    if (normalisedFoto) {
      localStorage.setItem('foto', normalisedFoto);
    } else {
      localStorage.removeItem('foto');
    }
  }
  const foto = normalisedFoto;
  const displayPhoto = foto || placeholderAvatar;
  const isGooglePhoto = Boolean(foto?.includes('googleusercontent'));
  const isLoggedIn = localStorage.getItem('token');
  const [unread, setUnread] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    if (!isLoggedIn) {
      setUnread(0);
      return undefined;
    }

    const MIN_DELAY = 15000;
    const MAX_DELAY = 120000;

    let delay = MIN_DELAY;
    let timeoutId;
    let active = true;

    const scheduleNext = () => {
      if (!active) return;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        void tick();
      }, delay);
    };

    const tick = async ({ resetDelay = false } = {}) => {
      if (!active) return;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      if (resetDelay) {
        delay = MIN_DELAY;
      }

      try {
        const res = await api.get('/notifications');
        if (!active) return;
        const data = Array.isArray(res.data) ? res.data : [];
        const count = data.filter((n) => !n.leido).length;
        setUnread(count);
        delay = MIN_DELAY;
      } catch (err) {
        if (!active) return;
        console.error('Error al cargar notificaciones', err);
        delay = Math.min(delay * 2, MAX_DELAY);
      } finally {
        scheduleNext();
      }
    };

    const handleUpdate = () => {
      void tick({ resetDelay: true });
    };

    void tick({ resetDelay: true });
    window.addEventListener('notificationsUpdated', handleUpdate);

    return () => {
      active = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('notificationsUpdated', handleUpdate);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const handleNavigate = (path) => navigate(path);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('foto', file);
      try {
        const res = await api.post(
          '/protegido/foto-perfil',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      const nuevaFoto = getImageUrl(res.data.foto);
      if (nuevaFoto) {
        localStorage.setItem('foto', nuevaFoto);
      } else {
        localStorage.removeItem('foto');
      }
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Error al subir la foto');
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const navItems = isLoggedIn
    ? [
        { label: 'Inicio', path: '/home' },
        { label: 'Torneos', path: '/torneos' },
        ...(rol === 'Tecnico'
          ? [
              { label: 'Entrenamientos', path: '/entrenamientos' },
              { label: 'Progresos', path: '/progresos' }
            ]
          : []),
        ...(rol === 'Delegado' || rol === 'Deportista'
          ? [{ label: 'Reportes', path: '/reportes' }]
          : []),
        ...(rol === 'Delegado'
          ? [{ label: 'Seguros', path: '/seguros' }]
          : []),
        ...(rol === 'Delegado' || rol === 'Tecnico'
          ? [
              {
                label: 'Patinadores',
                children: [
                  { label: 'Patinadores', path: '/patinadores' },
                  ...(rol === 'Delegado'
                    ? [{ label: 'Cargar Patinador', path: '/cargar-patinador' }]
                    : [])
                ]
              }
            ]
          : rol === 'Deportista'
            ? [{ label: 'Patinadores', path: '/patinadores' }]
            : []),
        ...(rol === 'Delegado' || rol === 'Tecnico'
          ? [
              {
                label: 'Crear',
                children: [
                  { label: 'Crear Noticia', path: '/crear-noticia' },
                  { label: 'Crear Notificacion', path: '/crear-notificacion' }
                ]
              }
            ]
          : [])
      ]
    : [];

  return (
    <nav className="navbar navbar-expand-lg navbar-dark">
      <div className="container">
        <a
          className="navbar-brand d-flex align-items-center"
          onClick={() => handleNavigate('/home')}
          style={{ cursor: 'pointer' }}
        >
          <img
            src="/vite.svg"
            alt="Logo"
            width="80"
            height="80"
            className="rounded-circle"
          />
        </a>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
            {navItems.map((item) => (
              item.children ? (
                <li className="nav-item dropdown" key={item.label}>
                  <a
                    className="nav-link dropdown-toggle"
                    role="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    style={{ cursor: 'pointer' }}
                  >
                    {item.label}
                  </a>
                  <ul className="dropdown-menu">
                    {item.children.map((child) => (
                      <li key={child.label}>
                        <a
                          className="dropdown-item"
                          onClick={() => handleNavigate(child.path)}
                          style={{ cursor: 'pointer' }}
                        >
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li className="nav-item" key={item.label}>
                  <a
                    className="nav-link"
                    onClick={() => handleNavigate(item.path)}
                    style={{ cursor: 'pointer' }}
                  >
                    {item.label}
                  </a>
                </li>
              )
            ))}
          </ul>
          <div className="d-flex align-items-center gap-2 ms-auto">
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => setDarkMode(!darkMode)}
            >
              <i className={`bi ${darkMode ? 'bi-sun' : 'bi-moon'}`}></i>
            </button>
            {isLoggedIn && (
              <>
                <div className="position-relative me-2">
                  <i
                    className="bi bi-bell"
                    style={{ fontSize: '1.5rem', color: unread > 0 ? 'red' : 'gray', cursor: 'pointer' }}
                    onClick={() => handleNavigate('/notificaciones')}
                  ></i>
                  {unread > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {unread}
                    </span>
                  )}
                </div>
                <div className="position-relative">
                  <img
                    src={displayPhoto}
                    alt="Foto perfil"
                    width="40"
                    height="40"
                    className="rounded-circle"
                    style={{ objectFit: 'cover', cursor: isGooglePhoto ? 'default' : 'pointer' }}
                    referrerPolicy="no-referrer"
                    onClick={!isGooglePhoto ? triggerFileSelect : undefined}
                  />
                  {!isGooglePhoto && (
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  )}
                </div>
                <LogoutButton />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
