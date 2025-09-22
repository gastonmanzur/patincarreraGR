import { useEffect, useState } from 'react';
import api from '../api';

export default function Reportes() {
  const [patinadores, setPatinadores] = useState([]);
  const [patinadorId, setPatinadorId] = useState('');
  const [progresos, setProgresos] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get('/protegido/usuario');
        setPatinadores(res.data.usuario.patinadores || []);
      } catch (err) {
        console.error(err);
      }
    };
    cargar();
  }, []);

  const cargarProgresos = async (id) => {
    if (!id) return;
    try {
      const res = await api.get(`/progresos/${id}`);
      setProgresos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const manejarCambio = (e) => {
    const id = e.target.value;
    setPatinadorId(id);
    cargarProgresos(id);
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Reportes</h1>
      <div className="mb-3">
        <label className="form-label">Patinador</label>
        <select className="form-select" value={patinadorId} onChange={manejarCambio}>
          <option value="">Seleccione</option>
          {patinadores.map((p) => (
            <option key={p._id} value={p._id}>
              {p.primerNombre} {p.apellido}
            </option>
          ))}
        </select>
      </div>
      {patinadorId && (
        progresos.length > 0 ? (
          <ul className="list-group">
            {progresos.map((p) => (
              <li key={p._id} className="list-group-item">
                <strong>{new Date(p.fecha).toLocaleDateString('es-AR')}:</strong> {p.descripcion}
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay reportes para este patinador.</p>
        )
      )}
    </div>
  );
}
