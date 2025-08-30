import { useEffect, useState } from 'react';
import api from '../api';

export default function Progresos() {
  const [patinadores, setPatinadores] = useState([]);
  const [patinadorId, setPatinadorId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [progresos, setProgresos] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get('/patinadores');
        setPatinadores(res.data);
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

  const manejarCambioPatinador = (e) => {
    const id = e.target.value;
    setPatinadorId(id);
    setDescripcion('');
    cargarProgresos(id);
  };

  const enviar = async () => {
    if (!patinadorId || !descripcion) return;
    try {
      await api.post('/progresos', { patinador: patinadorId, descripcion });
      window.dispatchEvent(new Event('notificationsUpdated'));
      setDescripcion('');
      await cargarProgresos(patinadorId);
      alert('Progreso registrado');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Progresos</h1>
      <div className="mb-3">
        <label className="form-label">Patinador</label>
        <select className="form-select" value={patinadorId} onChange={manejarCambioPatinador}>
          <option value="">Seleccione</option>
          {patinadores.map((p) => (
            <option key={p._id} value={p._id}>
              {p.primerNombre} {p.apellido}
            </option>
          ))}
        </select>
      </div>
      {patinadorId && (
        <>
          <div className="mb-3">
            <label className="form-label">Descripción</label>
            <textarea
              className="form-control"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
          <button className="btn btn-primary mb-3" onClick={enviar}>
            Guardar
          </button>
          <ul className="list-group">
            {progresos.map((p) => (
              <li key={p._id} className="list-group-item">
                <strong>{new Date(p.fecha).toLocaleDateString('es-AR')}:</strong> {p.descripcion}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
