import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const rol = localStorage.getItem('rol');

  const cargar = async () => {
    try {
      const res = await api.get('/tournaments');
      const data = await Promise.all(
        res.data.map(async (t) => {
          const comps = await api.get(`/tournaments/${t._id}/competitions`);
          return { ...t, competencias: comps.data };
        })
      );
      setTorneos(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const crearTorneo = async (e) => {
    e.preventDefault();
    const { nombre, fechaInicio, fechaFin } = e.target;
    try {
      await api.post('/tournaments', {
        nombre: nombre.value,
        fechaInicio: fechaInicio.value,
        fechaFin: fechaFin.value
      });
      e.target.reset();
      cargar();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al crear torneo');
    }
  };

  const crearCompetencia = async (e, torneoId) => {
    e.preventDefault();
    const { nombre, fecha } = e.target;
    try {
      await api.post(`/tournaments/${torneoId}/competitions`, {
        nombre: nombre.value,
        fecha: fecha.value
      });
      e.target.reset();
      cargar();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al crear competencia');
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Torneos</h1>
      {rol === 'Delegado' && (
        <form className="mb-4" onSubmit={crearTorneo}>
          <div className="row g-2">
            <div className="col-md-4">
              <input type="text" name="nombre" className="form-control" placeholder="Nombre" required />
            </div>
            <div className="col-md-3">
              <input type="date" name="fechaInicio" className="form-control" required />
            </div>
            <div className="col-md-3">
              <input type="date" name="fechaFin" className="form-control" required />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-primary w-100">
                Crear Torneo
              </button>
            </div>
          </div>
        </form>
      )}
      {torneos.map((t) => (
        <div key={t._id} className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">{t.nombre}</h5>
            <p className="card-text">
              {new Date(t.fechaInicio).toLocaleDateString()} - {new Date(t.fechaFin).toLocaleDateString()}
            </p>
            <ul>
              {t.competencias.map((c) => (
                <li key={c._id}>
                  {c.nombre} - {new Date(c.fecha).toLocaleDateString()}
                  {rol === 'Delegado' && ` (Lista Buena Fe: ${c.listaBuenaFe?.length || 0})`}
                </li>
              ))}
            </ul>
            {rol === 'Delegado' && (
              <form className="row g-2" onSubmit={(e) => crearCompetencia(e, t._id)}>
                <div className="col-md-5">
                  <input
                    type="text"
                    name="nombre"
                    className="form-control"
                    placeholder="Nombre competencia"
                    required
                  />
                </div>
                <div className="col-md-4">
                  <input type="date" name="fecha" className="form-control" required />
                </div>
                <div className="col-md-3">
                  <button type="submit" className="btn btn-success w-100">
                    Agregar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
