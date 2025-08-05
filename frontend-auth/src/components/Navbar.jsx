import { useNavigate } from 'react-router-dom';
import LogoutButton from './LogoutButton';
import FotoUploader from './FotoUploader'; // Ajustá la ruta si lo tenés en otro lugar
import './Navbar.css'; // creamos estilo aparte opcional

export default function Navbar() {
  const navigate = useNavigate();
  const rol = localStorage.getItem('rol');
  const foto = localStorage.getItem('foto'); // si existe
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

  return (
    isLoggedIn && (
      <nav className="navbar">
        <ul className="navbar-list">
          {(rol === 'admin' ? itemsAdmin : itemsUsuario).map((item) => (
            <li key={item.label} onClick={() => handleNavigate(item.path)}>
              {item.label}
            </li>
          ))}
        </ul>
        <div className="navbar-right">
          <LogoutButton />
          <div className="profile-pic">
          <img src={foto || '/default-user.png'} alt="Foto perfil" />
          {!foto?.includes('googleusercontent') && <FotoUploader />}
          </div>
        </div>
      </nav>
    )
  );
}
