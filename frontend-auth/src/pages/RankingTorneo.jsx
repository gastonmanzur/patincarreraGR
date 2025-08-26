import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function RankingTorneo() {
  const { id } = useParams();
  const [individual, setIndividual] = useState([]);
  const [clubes, setClubes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resInd, resClub] = await Promise.all([
          api.get(`/tournaments/${id}/ranking/individual`),
          api.get(`/tournaments/${id}/ranking/club`)
        ]);
        setIndividual(resInd.data);
        setClubes(resClub.data);
      } catch (err) {
        console.error(err);
        setError('Error al cargar ranking');
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
      <h2>Ranking</h2>
      <h4>Individual por Categoría</h4>
      {individual.length === 0 ? (
        <p>No hay datos.</p>
      ) : (
        individual.map((cat) => (
          <div key={cat.categoria} className="mb-3">
            <h5>{cat.categoria}</h5>
            <ul className="list-group">
              {cat.patinadores.map((p, idx) => (
                <li
                  key={p.id}
                  className="list-group-item d-flex justify-content-between"
                >
                  <span>
                    {idx + 1}. {p.nombre}
                  </span>
                  <span>{p.puntos}</span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      <h4>Ranking por Club</h4>
      {clubes.length === 0 ? (
        <p>No hay datos.</p>
      ) : (
        <ul className="list-group">
          {clubes.map((c, idx) => (
            <li
              key={c.club._id}
              className="list-group-item d-flex justify-content-between"
            >
              <span>
                {idx + 1}. {c.club.nombre}
              </span>
              <span>{c.puntos}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
