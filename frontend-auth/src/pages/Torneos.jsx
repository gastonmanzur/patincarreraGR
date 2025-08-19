import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  if (loading) return <div className="container mt-3">Cargando torneos...</div>;
  if (error) return <div className="container mt-3 text-danger">{error}</div>;

  return (
    <div className="container mt-3">
      <h2>Torneos</h2>
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
