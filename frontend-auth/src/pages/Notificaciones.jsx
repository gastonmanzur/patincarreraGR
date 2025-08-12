import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);

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

  if (notificaciones.length === 0) {
    return (
      <div className="container mt-4">
        <h1 className="mb-4">Notificaciones</h1>
        <p>No hay notificaciones.</p>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Notificaciones</h1>
      <ul className="list-group">
        {notificaciones.map((n) => (
          <li
            key={n._id}
            className={`list-group-item d-flex justify-content-between align-items-center ${n.leido ? '' : 'list-group-item-warning'}`}
            onClick={() => !n.leido && marcarLeida(n._id)}
            style={{ cursor: n.leido ? 'default' : 'pointer' }}
          >
            <span style={{ fontWeight: n.leido ? 'normal' : 'bold' }}>{n.mensaje}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
