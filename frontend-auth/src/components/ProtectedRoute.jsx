import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, roles }) {
  const token = sessionStorage.getItem('token');
  const rol = sessionStorage.getItem('rol');

  if (!token) return <Navigate to="/" />;
  if (roles && !roles.includes(rol)) return <Navigate to="/home" />;
  return children;
}
