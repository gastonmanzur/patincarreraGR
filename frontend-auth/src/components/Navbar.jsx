import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import LogoutButton from './LogoutButton';

export default function Navbar() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const rol = localStorage.getItem('rol');
  const foto = localStorage.getItem('foto');
  const isLoggedIn = localStorage.getItem('token');
  const [unread, setUnread] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    let interval;
    const cargar = async () => {
      try {
        const res = await api.get('/notifications');
        const count = res.data.filter((n) => !n.leido).length;
        setUnread(count);
      } catch (err) {
        console.error(err);
      }
    };
    if (isLoggedIn) {
      cargar();
      interval = setInterval(cargar, 5000);
      window.addEventListener('notificationsUpdated', cargar);
    }
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('notificationsUpdated', cargar);
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
      localStorage.setItem('foto', res.data.foto);
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
                    src={foto || '/default-user.png'}
                    alt="Foto perfil"
                    width="40"
                    height="40"
                    className="rounded-circle"
                    style={{ objectFit: 'cover', cursor: foto?.includes('googleusercontent') ? 'default' : 'pointer' }}
                    referrerPolicy="no-referrer"
                    onClick={!foto?.includes('googleusercontent') ? triggerFileSelect : undefined}
                  />
                  {!foto?.includes('googleusercontent') && (
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
