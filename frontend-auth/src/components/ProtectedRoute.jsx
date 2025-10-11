import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, roles }) {
  const token = sessionStorage.getItem('token');
  const rol = sessionStorage.getItem('rol');

  if (!token) return <Navigate to="/" />;

  if (roles) {
    const rolNormalizado = typeof rol === 'string' ? rol.toLowerCase() : '';
    const rolesNormalizados = roles.map((item) => item.toLowerCase());

    if (!rolesNormalizados.includes(rolNormalizado)) {
      return <Navigate to="/home" />;
    }
  }
  return children;
}
