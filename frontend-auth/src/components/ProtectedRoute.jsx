import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');

  if (!token) return <Navigate to="/" />;
  if (roles && !roles.includes(rol)) return <Navigate to="/home" />;
  return children;
}
