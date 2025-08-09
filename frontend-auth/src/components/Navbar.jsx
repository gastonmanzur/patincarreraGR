import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import LogoutButton from './LogoutButton';

export default function Navbar() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const rol = localStorage.getItem('rol');
  const foto = localStorage.getItem('foto');
  const isLoggedIn = localStorage.getItem('token');

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
        { label: 'Cargar Patinador', path: '/cargar-patinador' },
        ...(rol === 'Delegado' || rol === 'Tecnico'
          ? [{ label: 'Crear Noticia', path: '/crear-noticia' }]
          : [])
      ]
    : [];

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
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
              <li className="nav-item" key={item.label}>
                <a
                  className="nav-link"
                  onClick={() => handleNavigate(item.path)}
                  style={{ cursor: 'pointer' }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          {isLoggedIn && (
            <div className="d-flex align-items-center gap-2 ms-auto">
              <div className="position-relative">
                <img
                  src={foto || '/default-user.png'}
                  alt="Foto perfil"
                  width="40"
                  height="40"
                  className="rounded-circle"
                  style={{ objectFit: 'cover', cursor: foto?.includes('googleusercontent') ? 'default' : 'pointer' }}
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
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
