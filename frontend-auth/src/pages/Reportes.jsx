import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

  const patinadorSeleccionado = useMemo(
    () => patinadores.find((p) => p._id === patinadorId),
    [patinadorId, patinadores]
  );

  const obtenerDescripcionBreve = (descripcion) => {
    if (typeof descripcion !== 'string') return '';
    if (descripcion.length <= 180) return descripcion;
    return `${descripcion.slice(0, 177)}...`;
  };

  const obtenerFechaFormateada = (fecha) => {
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const obtenerHoraFormateada = (fecha) => {
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4 text-center">Reportes recibidos</h1>
      <div className="mb-4">
        <label className="form-label fw-semibold" htmlFor="patinador-select">
          Patinador
        </label>
        <select
          id="patinador-select"
          className="form-select"
          value={patinadorId}
          onChange={manejarCambio}
        >
          <option value="">Seleccione un patinador</option>
          {patinadores.map((p) => (
            <option key={p._id} value={p._id}>
              {p.primerNombre} {p.apellido}
            </option>
          ))}
        </select>
      </div>
      {patinadorSeleccionado && (
        <p className="reporte-context text-center mb-4">
          Mostrando reportes enviados por los técnicos para{' '}
          <span className="fw-semibold">{`${patinadorSeleccionado.primerNombre} ${patinadorSeleccionado.apellido}`}</span>.
        </p>
      )}
      {patinadorId ? (
        progresos.length > 0 ? (
          <div className="reportes-grid">
            {progresos.map((progreso) => (
              <article key={progreso._id} className="reporte-card">
                <header className="reporte-header">
                  <span className="reporte-date">{obtenerFechaFormateada(progreso.fecha)}</span>
                  <span
                    className={`reporte-status ${
                      progreso.enviado ? 'reporte-status--enviado' : 'reporte-status--pendiente'
                    }`}
                  >
                    {progreso.enviado ? 'Enviado' : 'Pendiente'}
                  </span>
                </header>
                {patinadorSeleccionado && (
                  <p className="reporte-athlete">{`${patinadorSeleccionado.primerNombre} ${patinadorSeleccionado.apellido}`}</p>
                )}
                <p className="reporte-description">
                  {obtenerDescripcionBreve(progreso.descripcion)}
                </p>
                <footer className="reporte-footer">
                  <Link className="btn btn-primary btn-sm" to={`/reportes/${progreso._id}`}>
                    Ver reporte completo
                  </Link>
                  <span className="reporte-time">{obtenerHoraFormateada(progreso.fecha)}</span>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="reporte-empty">
            <p className="mb-0">Todavía no recibiste reportes para este patinador.</p>
          </div>
        )
      ) : (
        <div className="reporte-empty">
          <p className="mb-0">Seleccioná un patinador para ver los reportes enviados por los técnicos.</p>
        </div>
      )}
    </div>
  );
}
