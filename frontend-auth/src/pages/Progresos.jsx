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
      setDescripcion('');
      await cargarProgresos(patinadorId);
      alert('Progreso registrado');
    } catch (err) {
      console.error(err);
    }
  };

  const enviarReporte = async (id) => {
    try {
      await api.post(`/progresos/${id}/enviar`);
      window.dispatchEvent(new Event('notificationsUpdated'));
      await cargarProgresos(patinadorId);
      alert('Reporte enviado');
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
              <li
                key={p._id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <span>
                  <strong>{new Date(p.fecha).toLocaleDateString('es-AR')}:</strong> {p.descripcion}
                </span>
                {!p.enviado && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => enviarReporte(p._id)}
                  >
                    Enviar reporte
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
