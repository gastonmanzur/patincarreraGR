import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const [detalles, setDetalles] = useState({});
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

  const toggleCompetencia = async (compId) => {
    const detalle = detalles[compId];
    if (detalle) {
      setDetalles((prev) => ({
        ...prev,
        [compId]: { ...detalle, abierta: !detalle.abierta }
      }));
      return;
    }
    try {
      const peticiones = [api.get(`/competitions/${compId}/resultados`)];
      if (rol === 'Delegado') {
        peticiones.unshift(api.get(`/competitions/${compId}/lista-buena-fe`));
      }
      const respuestas = await Promise.all(peticiones);
      const resultados = respuestas[rol === 'Delegado' ? 1 : 0].data;
      const lista = rol === 'Delegado' ? respuestas[0].data : [];
      setDetalles((prev) => ({
        ...prev,
        [compId]: {
          abierta: true,
          lista,
          resultados
        }
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const agregarResultado = async (e, compId) => {
    e.preventDefault();
    const { nombre, club, tiempo, posicion } = e.target;
    try {
      await api.post(`/competitions/${compId}/resultados`, {
        nombre: nombre.value,
        club: club.value,
        tiempo: tiempo.value,
        posicion: posicion.value
      });
      e.target.reset();
      const resultados = await api.get(`/competitions/${compId}/resultados`);
      setDetalles((prev) => ({
        ...prev,
        [compId]: { ...prev[compId], resultados: resultados.data }
      }));
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al cargar resultado');
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
                <li key={c._id} className="mb-2">
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={() => toggleCompetencia(c._id)}
                  >
                    {c.nombre} - {new Date(c.fecha).toLocaleDateString()}
                  </button>
                  {rol === 'Delegado' && ` (Lista Buena Fe: ${c.listaBuenaFe?.length || 0})`}
                  {detalles[c._id]?.abierta && (
                    <div className="mt-2">
                      {rol === 'Delegado' && (
                        <>
                          <h6>Lista Buena Fe</h6>
                          <ul>
                            {(detalles[c._id].lista || []).map((p) => (
                              <li key={p._id}>
                                {p.primerNombre} {p.apellido}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      <h6>Resultados</h6>
                      <ul>
                        {(detalles[c._id].resultados || []).map((r) => (
                          <li key={r._id}>
                            {r.posicion ? `${r.posicion}. ` : ''}
                            {r.nombre} ({r.club}) {r.tiempo}
                          </li>
                        ))}
                      </ul>
                      {rol === 'Delegado' && (
                        <form className="row g-2" onSubmit={(e) => agregarResultado(e, c._id)}>
                          <div className="col-md-3">
                            <input
                              type="text"
                              name="nombre"
                              className="form-control"
                              placeholder="Nombre"
                              required
                            />
                          </div>
                          <div className="col-md-3">
                            <input
                              type="text"
                              name="club"
                              className="form-control"
                              placeholder="Club"
                              required
                            />
                          </div>
                          <div className="col-md-3">
                            <input
                              type="text"
                              name="tiempo"
                              className="form-control"
                              placeholder="Tiempo"
                            />
                          </div>
                          <div className="col-md-2">
                            <input
                              type="number"
                              name="posicion"
                              className="form-control"
                              placeholder="Posición"
                            />
                          </div>
                          <div className="col-md-1">
                            <button type="submit" className="btn btn-primary w-100">
                              +
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
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
