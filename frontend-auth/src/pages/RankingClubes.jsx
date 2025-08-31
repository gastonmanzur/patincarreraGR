import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function RankingClubes() {
  const { id } = useParams();
  const [clubes, setClubes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get(`/tournaments/${id}/ranking/club`);
        setClubes(res.data);
      } catch (err) {
        console.error(err);
        setError('Error al cargar ranking de clubes');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  if (loading) return <div className="container mt-3">Cargando ranking...</div>;
  if (error) return <div className="container mt-3 text-danger">{error}</div>;

  return (
    <div className="container mt-3">
      <h2>Ranking de Clubes</h2>
      {clubes.length === 0 ? (
        <p>No hay datos.</p>
      ) : (
        <ul className="list-group">
          {clubes.map((c, idx) => (
            <li key={c.club._id} className="list-group-item d-flex justify-content-between">
              <span>{idx + 1}. {c.club.nombre}</span>
              <span>{c.puntos}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
