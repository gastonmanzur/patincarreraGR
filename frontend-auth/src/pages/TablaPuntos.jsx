import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api.js';

export default function TablaPuntos() {
  const { id } = useParams();
  const [puntos, setPuntos] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get(`/competitions/${id}/puntajes`);
        setPuntos(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    cargar();
  }, [id]);

  return (
    <div className="container mt-4">
      <h2>Tabla de puntos</h2>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>Número</th>
            <th>Club</th>
            <th>Puntos</th>
          </tr>
        </thead>
        <tbody>
          {puntos.map((p, idx) => (
            <tr key={`${p.nombre}-${p.numero}-${idx}`}>
              <td>{idx + 1}</td>
              <td>{p.nombre}</td>
              <td>{p.numero}</td>
              <td>{p.club}</td>
              <td>{p.puntosTotales}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
