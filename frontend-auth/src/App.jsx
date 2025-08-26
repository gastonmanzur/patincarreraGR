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
import ListaPatinadores from './pages/ListaPatinadores';
import VerPatinador from './pages/VerPatinador';
import EditarPatinador from './pages/EditarPatinador';
import AsociarPatinadores from './pages/AsociarPatinadores';
import Notificaciones from './pages/Notificaciones';
import CrearNotificacion from './pages/CrearNotificacion';
import Torneos from './pages/Torneos';
import Competencias from './pages/Competencias';
import ListaBuenaFe from './pages/ListaBuenaFe';
import ResultadosCompetencia from './pages/ResultadosCompetencia';
import SolicitarSeguro from './pages/SolicitarSeguro';
import RankingTorneo from './pages/RankingTorneo';

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
        <Route path="/torneos" element={<ProtectedRoute><Torneos /></ProtectedRoute>} />
        <Route path="/torneos/:id" element={<ProtectedRoute><Competencias /></ProtectedRoute>} />
        <Route
          path="/torneos/:id/ranking"
          element={<ProtectedRoute><RankingTorneo /></ProtectedRoute>}
        />
        <Route
          path="/competencias/:id/lista"
          element={<ProtectedRoute roles={['Delegado']}><ListaBuenaFe /></ProtectedRoute>}
        />
        <Route
          path="/competencias/:id/resultados"
          element={<ProtectedRoute><ResultadosCompetencia /></ProtectedRoute>}
        />
        <Route path="/google-success" element={<GoogleSuccess />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route
          path="/cargar-patinador"
          element={<ProtectedRoute roles={['Delegado']}><CargarPatinador /></ProtectedRoute>}
        />
        <Route
          path="/patinadores"
          element={<ProtectedRoute roles={['Delegado', 'Tecnico']}><ListaPatinadores /></ProtectedRoute>}
        />
        <Route
          path="/patinadores/:id"
          element={<ProtectedRoute roles={['Delegado', 'Tecnico']}><VerPatinador /></ProtectedRoute>}
        />
        <Route
          path="/patinadores/:id/editar"
          element={<ProtectedRoute roles={['Delegado', 'Tecnico']}><EditarPatinador /></ProtectedRoute>}
        />
        <Route
          path="/crear-noticia"
          element={<ProtectedRoute roles={['Delegado', 'Tecnico']}><CrearNoticia /></ProtectedRoute>}
        />
        <Route
          path="/crear-notificacion"
          element={<ProtectedRoute roles={['Delegado', 'Tecnico']}><CrearNotificacion /></ProtectedRoute>}
        />
        <Route path="/asociar-patinadores" element={<ProtectedRoute><AsociarPatinadores /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><PanelAdmin /></AdminRoute>} />
        <Route path="/notificaciones" element={<ProtectedRoute><Notificaciones /></ProtectedRoute>} />
        <Route
          path="/seguros"
          element={<ProtectedRoute roles={['Delegado']}><SolicitarSeguro /></ProtectedRoute>}
        />
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
