import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Home from './pages/Home';
import GoogleSuccess from './pages/GoogleSuccess';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import PanelAdmin from './pages/PanelAdmin';
import Navbar from './components/Navbar';
import CargarPatinador from './pages/CargarPatinador';
import CrearNoticia from './pages/CrearNoticia';

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');
  return token && rol === 'admin' ? children : <Navigate to="/" />;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/home" element={<Home />} />
        <Route path="/google-success" element={<GoogleSuccess />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/cargar-patinador" element={<ProtectedRoute><CargarPatinador /></ProtectedRoute>} />
        <Route
          path="/crear-noticia"
          element={<ProtectedRoute roles={['Delegado', 'Tecnico']}><CrearNoticia /></ProtectedRoute>}
        />
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
