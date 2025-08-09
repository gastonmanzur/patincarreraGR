import { useEffect, useState } from 'react';
import api from '../api.js';

export default function ListaPatinadores() {
  const [patinadores, setPatinadores] = useState([]);

  useEffect(() => {
    const obtenerPatinadores = async () => {
      try {
        const res = await api.get('/patinadores');
        setPatinadores(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    obtenerPatinadores();
  }, []);

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Patinadores</h1>
      <ul className="list-group">
        {patinadores.map((p) => (
          <li
            key={p._id}
            className="list-group-item d-flex justify-content-between"
          >
            <span>
              {p.primerNombre} {p.segundoNombre ? `${p.segundoNombre} ` : ''}
              {p.apellido}
            </span>
            <span>{p.edad} años</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
