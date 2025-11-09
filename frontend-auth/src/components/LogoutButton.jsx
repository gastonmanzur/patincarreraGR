import { useNavigate } from 'react-router-dom';
import { clearStoredClubId } from '../utils/clubContext';

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('rol');
    sessionStorage.removeItem('foto');
    clearStoredClubId();
    sessionStorage.removeItem('clubLogo');
    sessionStorage.removeItem('clubNombre');
    navigate('/');
  };

  return (
    <button type="button" className="btn btn-outline-secondary" onClick={handleLogout}>
      Cerrar sesión
    </button>
  );
}
