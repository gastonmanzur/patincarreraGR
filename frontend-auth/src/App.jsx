import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import GoogleSuccess from './pages/GoogleSuccess';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import PanelAdmin from './pages/PanelAdmin';
import Navbar from './components/Navbar';

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');

  return token && rol === 'admin' ? children : <Navigate to="/" />;
}

function AppRoutes() {
  const location = useLocation();
  const hideNavbarPaths = ['/', '/login', '/register'];

  return (
    <>
      {!hideNavbarPaths.includes(location.pathname) && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/google-success" element={<GoogleSuccess />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><PanelAdmin /></AdminRoute>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}


