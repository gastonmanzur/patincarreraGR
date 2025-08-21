import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nombre, setNombre] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const rol = localStorage.getItem('rol');
  const navigate = useNavigate();

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get('/tournaments');
        setTorneos(res.data);
      } catch (err) {
        console.error(err);
        setError('Error al cargar torneos');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const crearTorneo = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tournaments', { nombre, fechaInicio, fechaFin });
      setNombre('');
      setFechaInicio('');
      setFechaFin('');
      const res = await api.get('/tournaments');
      setTorneos(res.data);
    } catch (err) {
      console.error(err);
      alert('Error al crear torneo');
    }
  };

  if (loading) return <div className="container mt-3">Cargando torneos...</div>;
  if (error) return <div className="container mt-3 text-danger">{error}</div>;

  return (
    <div className="container mt-3">
      <h2>Torneos</h2>
      {rol === 'Delegado' && (
        <form onSubmit={crearTorneo} className="row g-2 mb-3">
          <div className="col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="col-md-3">
            <input
              type="date"
              className="form-control"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
            />
          </div>
          <div className="col-md-3">
            <input
              type="date"
              className="form-control"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              required
            />
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn btn-primary w-100">
              Crear
            </button>
          </div>
        </form>
      )}
      {torneos.length === 0 ? (
        <p>No hay torneos disponibles.</p>
      ) : (
        <ul className="list-group">
          {torneos.map((t) => (
            <li key={t._id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>{t.nombre}</strong>
                <div>
                  {new Date(t.fechaInicio).toLocaleDateString()} - {new Date(t.fechaFin).toLocaleDateString()}
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate(`/torneos/${t._id}`)}
              >
                Ver Competencias
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
