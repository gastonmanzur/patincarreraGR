import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);
  const navigate = useNavigate();

  const cargar = async () => {
    try {
      const res = await api.get('/notifications');
      setNotificaciones(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const marcarLeida = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotificaciones((prev) =>
        prev.map((n) => (n._id === id ? { ...n, leido: true } : n))
      );
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (err) {
      console.error(err);
    }
  };

  const responder = async (competenciaId, notifId, participa) => {
    try {
      await api.post(`/competitions/${competenciaId}/responder`, { participa });
      setNotificaciones((prev) =>
        prev.map((n) =>
          n._id === notifId
            ? { ...n, estadoRespuesta: participa ? 'Participo' : 'No Participo', leido: true }
            : n
        )
      );
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (err) {
      console.error(err);
    }
  };

  const verReporte = async (notif) => {
    try {
      await api.put(`/notifications/${notif._id}/read`);
      setNotificaciones((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, leido: true } : n))
      );
      window.dispatchEvent(new Event('notificationsUpdated'));
      navigate(`/reportes/${notif.progreso}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (notificaciones.length === 0) {
    return (
      <div className="container mt-4 text-black fw-normal">
        <h1 className="mb-4 fw-normal">Notificaciones</h1>
        <p>No hay notificaciones.</p>
      </div>
    );
  }

  return (
    <div className="container mt-4 text-black fw-normal">
      <h1 className="mb-4 fw-normal">Notificaciones</h1>
      <ul className="list-group">
        {notificaciones.map((n) => (
          <li key={n._id} className={`list-group-item ${n.leido ? '' : 'list-group-item-warning'}`}>
            <div className="d-flex justify-content-between align-items-center">
              {n.progreso ? (
                <span
                  className="text-black fw-normal"
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => verReporte(n)}
                >
                  {n.mensaje}
                </span>
              ) : (
                <span className="text-black fw-normal">{n.mensaje}</span>
              )}
              {n.competencia && n.estadoRespuesta !== 'Pendiente' && (
                <span className="badge bg-secondary">{n.estadoRespuesta}</span>
              )}
            </div>
            {n.competencia && n.estadoRespuesta === 'Pendiente' && (
              <div className="mt-2">
                <button
                  className="btn btn-sm btn-success me-2"
                  onClick={() => responder(n.competencia, n._id, true)}
                >
                  Participo
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => responder(n.competencia, n._id, false)}
                >
                  No Participo
                </button>
              </div>
            )}
            {!n.competencia && !n.progreso && !n.leido && (
              <div className="mt-2">
                <button className="btn btn-sm btn-primary" onClick={() => marcarLeida(n._id)}>
                  Marcar como leída
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
