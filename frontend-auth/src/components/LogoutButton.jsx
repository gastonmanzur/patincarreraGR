import { useNavigate } from 'react-router-dom';

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('rol');
    sessionStorage.removeItem('foto');
    sessionStorage.removeItem('clubId');
    navigate('/');
  };

  return (
    <button type="button" className="btn btn-outline-secondary" onClick={handleLogout}>
      Cerrar sesión
    </button>
  );
}
