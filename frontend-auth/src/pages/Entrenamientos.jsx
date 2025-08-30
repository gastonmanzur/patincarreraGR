import { useEffect, useState } from 'react';
import api from '../api';

export default function Entrenamientos() {
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [editandoId, setEditandoId] = useState(null);

  const cargarEntrenamientos = async () => {
    try {
      const res = await api.get('/entrenamientos');
      setEntrenamientos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarEntrenamientos();
  }, []);

  const iniciarNuevo = async () => {
    try {
      const res = await api.get('/patinadores');
      const listado = res.data.map((p) => ({
        patinador: p._id,
        nombre: `${p.primerNombre} ${p.apellido}`,
        estado: 'Ausente'
      }));
      setAsistencias(listado);
      setEditandoId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const iniciarEdicion = async (id) => {
    try {
      const res = await api.get(`/entrenamientos/${id}`);
      const listado = res.data.asistencias.map((a) => ({
        patinador: a.patinador._id,
        nombre: `${a.patinador.primerNombre} ${a.patinador.apellido}`,
        estado: a.estado
      }));
      setAsistencias(listado);
      setEditandoId(id);
    } catch (err) {
      console.error(err);
    }
  };

  const manejarCambio = (index, estado) => {
    setAsistencias((prev) =>
      prev.map((a, i) => (i === index ? { ...a, estado } : a))
    );
  };

  const guardar = async () => {
    try {
      const payload = {
        asistencias: asistencias.map((a) => ({
          patinador: a.patinador,
          estado: a.estado
        }))
      };
      if (editandoId) {
        await api.put(`/entrenamientos/${editandoId}`, payload);
      } else {
        await api.post('/entrenamientos', payload);
      }
      setAsistencias([]);
      setEditandoId(null);
      cargarEntrenamientos();
    } catch (err) {
      console.error(err);
    }
  };

  const cancelar = () => {
    setAsistencias([]);
    setEditandoId(null);
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar entrenamiento?')) return;
    try {
      await api.delete(`/entrenamientos/${id}`);
      setEntrenamientos(entrenamientos.filter((e) => e._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Entrenamientos</h1>
      {asistencias.length === 0 ? (
        <>
          <button className="btn btn-primary mb-3" onClick={iniciarNuevo}>
            Nuevo Entrenamiento
          </button>
          <ul className="list-group">
            {entrenamientos.map((e) => (
              <li
                key={e._id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                {new Date(e.fecha).toLocaleDateString('es-AR')}
                <div>
                  <button
                    className="btn btn-sm btn-secondary me-2"
                    onClick={() => iniciarEdicion(e._id)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => eliminar(e._id)}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>Patinador</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {asistencias.map((a, idx) => (
                <tr key={a.patinador}>
                  <td>{a.nombre}</td>
                  <td>
                    {['Presente', 'Ausente', 'No entrena'].map((opt) => (
                      <label key={opt} className="me-2">
                        <input
                          type="radio"
                          name={`estado-${idx}`}
                          value={opt}
                          checked={a.estado === opt}
                          onChange={() => manejarCambio(idx, opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn btn-primary me-2" onClick={guardar}>
            Guardar
          </button>
          <button className="btn btn-secondary" onClick={cancelar}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

