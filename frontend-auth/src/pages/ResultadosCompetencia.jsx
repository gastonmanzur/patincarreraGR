import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function ResultadosCompetencia() {
  const { id } = useParams();
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get(`/competitions/${id}/resultados`);
        setResultados(res.data);
      } catch (err) {
        console.error(err);
        setError('Error al cargar resultados');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  if (loading) return <div className="container mt-3">Cargando resultados...</div>;
  if (error) return <div className="container mt-3 text-danger">{error}</div>;
  if (resultados.length === 0) return <div className="container mt-3">No hay resultados cargados.</div>;

  return (
    <div className="container mt-3">
      <h2>Resultados</h2>
      <div className="table-responsive">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Posición</th>
              <th>Nombre</th>
              <th>Tiempo (ms)</th>
              <th>Puntos</th>
              <th>Dorsal</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((r) => (
              <tr key={r._id}>
                <td>{r.categoria}</td>
                <td>{r.posicion}</td>
                <td>{`${r.deportistaId?.primerNombre || ''} ${r.deportistaId?.segundoNombre || ''} ${r.deportistaId?.apellido || ''}`.trim()}</td>
                <td>{r.tiempoMs}</td>
                <td>{r.puntos}</td>
                <td>{r.dorsal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

