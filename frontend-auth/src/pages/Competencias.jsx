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
      const formData = new FormData();
      formData.append('nombre', nombre);
      formData.append('fecha', fecha);
      if (e.target.imagen.files[0]) {
        formData.append('imagen', e.target.imagen.files[0]);
      }
      await api.post(`/tournaments/${id}/competitions`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setNombre('');
      setFecha('');
      e.target.imagen.value = '';
      const res = await api.get(`/tournaments/${id}/competitions`);
      setCompetencias(res.data);
    } catch (err) {
      console.error(err);
      alert('Error al crear competencia');
    }
  };

  const editarCompetencia = async (comp) => {
    const nuevoNombre = prompt('Nuevo nombre', comp.nombre);
    if (!nuevoNombre) return;
    const nuevaFecha = prompt('Nueva fecha', comp.fecha.slice(0, 10));
    if (!nuevaFecha) return;
    try {
      await api.put(`/competitions/${comp._id}`, {
        nombre: nuevoNombre,
        fecha: nuevaFecha
      });
      const res = await api.get(`/tournaments/${id}/competitions`);
      setCompetencias(res.data);
    } catch (err) {
      console.error(err);
      alert('Error al actualizar competencia');
    }
  };

  const eliminarCompetencia = async (compId) => {
    if (!confirm('¿Eliminar competencia?')) return;
    try {
      await api.delete(`/competitions/${compId}`);
      setCompetencias(competencias.filter((c) => c._id !== compId));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar competencia');
    }
  };

  if (loading) return <div className="container mt-3">Cargando competencias...</div>;
  if (error) return <div className="container mt-3 text-danger">{error}</div>;

  return (
    <div className="container mt-3">
      <h2>Competencias</h2>
      {rol === 'Delegado' && (
        <form onSubmit={crearCompetencia} className="row g-2 mb-3" encType="multipart/form-data">
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
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
          <div className="col-md-3">
            <input type="file" name="imagen" className="form-control" accept="image/*" />
          </div>
          <div className="col-md-2">
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
              <div className="d-flex align-items-center gap-3">
                {c.imagen && (
                  <img src={c.imagen} alt="imagen competencia" className="competencia-img" />
                )}
                <div>
                  <strong>{c.nombre}</strong> - {new Date(c.fecha).toLocaleDateString()}
                </div>
              </div>
              <div className="d-flex gap-2">
                {rol === 'Delegado' && (
                  <>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/competencias/${c._id}/lista`)}
                    >
                      LBF
                    </button>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => editarCompetencia(c)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => eliminarCompetencia(c._id)}
                    >
                      Eliminar
                    </button>
                  </>
                )}
                <button
                  className="btn btn-info btn-sm"
                  onClick={() => navigate(`/competencias/${c._id}/resultados`)}
                >
                  VER
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
