import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, roles, allowWithoutClub = false }) {
  const token = sessionStorage.getItem('token');
  const rol = sessionStorage.getItem('rol');
  const clubId = sessionStorage.getItem('clubId');

  if (!token) return <Navigate to="/" />;

  if (roles) {
    const rolNormalizado = typeof rol === 'string' ? rol.toLowerCase() : '';
    const rolesNormalizados = roles.map((item) => item.toLowerCase());

    if (!rolesNormalizados.includes(rolNormalizado)) {
      return <Navigate to="/home" />;
    }
  }

  if (!allowWithoutClub && (!clubId || clubId === 'null')) {
    const rolNormalizado = typeof rol === 'string' ? rol.toLowerCase() : '';
    if (rolNormalizado !== 'admin') {
      return <Navigate to="/seleccionar-club" />;
    }
  }
  return children;
}
