import { useNavigate } from 'react-router-dom';

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    navigate('/');
  };

  return (
    <button type="button" className="btn btn-outline-secondary" onClick={handleLogout}>
      Cerrar sesión
    </button>
  );
}
