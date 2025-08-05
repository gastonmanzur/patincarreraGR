import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LogoutButton from './LogoutButton';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const rol = localStorage.getItem('rol');
  const foto = localStorage.getItem('foto');
  const isLoggedIn = localStorage.getItem('token');

  const itemsAdmin = [
    { label: 'Servicios', path: '/servicios' },
    { label: 'Gestionar Servicios', path: '/admin/servicios' },
    { label: 'Turnos', path: '/turnos' },
    { label: 'Gestionar Turnos', path: '/admin/turnos' }
  ];

  const itemsUsuario = [
    { label: 'Servicios', path: '/servicios' },
    { label: 'Mis Turnos', path: '/mis-turnos' },
    { label: 'Contacto', path: '/contacto' }
  ];

  const handleNavigate = (path) => navigate(path);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('foto', file);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        'http://localhost:5000/api/protegido/foto-perfil',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
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

  return (
    <nav className="navbar">
      <div className="navbar-left" onClick={() => handleNavigate('/dashboard')}>
        <img src="/vite.svg" alt="Logo" className="logo" />
      </div>
      <ul className="navbar-list">
        {(isLoggedIn ? (rol === 'admin' ? itemsAdmin : itemsUsuario) : []).map((item) => (
          <li key={item.label} onClick={() => handleNavigate(item.path)}>
            {item.label}
          </li>
        ))}
      </ul>
      <div className="navbar-right">
        {isLoggedIn && (
          <>
            <div className="profile-pic">
              <img
                src={foto || '/default-user.png'}
                alt="Foto perfil"
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
    </nav>
  );
}
