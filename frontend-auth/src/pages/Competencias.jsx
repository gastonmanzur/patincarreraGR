import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Competencias() {
  const { id } = useParams();
  const navigate = useNavigate();
  const rol = localStorage.getItem('rol');
  const [competencias, setCompetencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get(`/tournaments/${id}/competitions`);
        setCompetencias(res.data);
      } catch (err) {
        console.error(err);
        setError('Error al cargar competencias');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  const crearCompetencia = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/tournaments/${id}/competitions`, { nombre, fecha });
      setNombre('');
      setFecha('');
      const res = await api.get(`/tournaments/${id}/competitions`);
      setCompetencias(res.data);
    } catch (err) {
      console.error(err);
      alert('Error al crear competencia');
    }
  };

  if (loading) return <div className="container mt-3">Cargando competencias...</div>;
  if (error) return <div className="container mt-3 text-danger">{error}</div>;

  return (
    <div className="container mt-3">
      <h2>Competencias</h2>
      {rol === 'Delegado' && (
        <form onSubmit={crearCompetencia} className="row g-2 mb-3">
          <div className="col-md-5">
            <input
              type="text"
              className="form-control"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="col-md-4">
            <input
              type="date"
              className="form-control"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
          <div className="col-md-3">
            <button type="submit" className="btn btn-primary w-100">
              Crear
            </button>
          </div>
        </form>
      )}
      {competencias.length === 0 ? (
        <p>No hay competencias registradas.</p>
      ) : (
        <ul className="list-group">
          {competencias.map((c) => (
            <li key={c._id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>{c.nombre}</strong> - {new Date(c.fecha).toLocaleDateString()}
              </div>
              <div className="d-flex gap-2">
                {rol === 'Delegado' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/competencias/${c._id}/lista`)}
                  >
                    Lista Buena Fe
                  </button>
                )}
                <button
                  className="btn btn-info btn-sm"
                  onClick={() => navigate(`/competencias/${c._id}/resultados`)}
                >
                  Ver Resultados
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
