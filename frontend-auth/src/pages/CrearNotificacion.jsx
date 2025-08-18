import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function CrearNotificacion() {
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/notifications', { mensaje: e.target.mensaje.value });
      navigate('/home');
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al crear la notificación');
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Crear Notificación</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Mensaje</label>
          <textarea name="mensaje" className="form-control" rows="3" required></textarea>
        </div>
        <button type="submit" className="btn btn-primary">Enviar</button>
      </form>
    </div>
  );
}
