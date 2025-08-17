import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Torneos() {
  const [torneos, setTorneos] = useState([]);
  const [detalles, setDetalles] = useState({});
  const CLUB_LOCAL = 'Gral. Rodríguez';
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
      const peticiones = [
        api.get(`/competitions/${compId}/resultados`),
        api.get(`/competitions/${compId}/puntajes`)
      ];
      if (rol === 'Delegado') {
        peticiones.unshift(api.get(`/competitions/${compId}/lista-buena-fe`));
      }
      const respuestas = await Promise.all(peticiones);
      let idx = 0;
      const lista = rol === 'Delegado' ? respuestas[idx++].data : [];
      const resultados = respuestas[idx++].data;
      const tablaPuntos = respuestas[idx++].data;
      setDetalles((prev) => ({
        ...prev,
        [compId]: {
          abierta: true,
          lista,
          resultados,
          tablaPuntos,
          categoria: '',
          externos: []
        }
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const seleccionarCategoria = async (compId, categoria) => {
    try {
      const res = await api.get(`/skaters-externos/${categoria}`);
      setDetalles((prev) => ({
        ...prev,
        [compId]: { ...prev[compId], categoria, externos: res.data }
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const seleccionarPatinadorClub = (e, compId) => {
    const id = e.target.value;
    const pat = detalles[compId].lista.find((p) => p._id === id);
    const form = document.getElementById(`form-resultado-${compId}`);
    if (pat && form) {
      form.nombre.value = `${pat.primerNombre} ${pat.apellido}`;
      form.club.value = CLUB_LOCAL;
      form.numero.value = pat.numeroCorredor;
    }
  };

  const seleccionarExterno = (e, compId) => {
    const val = e.target.value;
    const form = document.getElementById(`form-resultado-${compId}`);
    if (val === 'manual') {
      if (form) {
        form.nombre.value = '';
        form.club.value = '';
        form.numero.value = '';
      }
      return;
    }
    const pat = detalles[compId].externos[val];
    if (pat && form) {
      form.nombre.value = pat.nombre;
      form.club.value = pat.club;
      form.numero.value = pat.numero ?? '';
    }
  };

  const exportarExcel = async (compId) => {
    try {
      const res = await api.get(`/competitions/${compId}/lista-buena-fe/excel`, {
        params: { organizador: CLUB_LOCAL },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lista_buena_fe.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarPdfPuntajes = async (e, compId) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('archivo', file);
    try {
      await api.post(`/competitions/${compId}/resultados/pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('PDF procesado correctamente');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.mensaje || 'Error al procesar PDF');
    } finally {
      e.target.value = '';
    }
  };

  const cargarPdfPatinadoresExternos = async (e, compId) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('archivo', file);
    try {
      await api.post('/skaters-externos/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (detalles[compId]?.categoria) {
        await seleccionarCategoria(compId, detalles[compId].categoria);
      }
      alert('PDF procesado correctamente');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.mensaje || 'Error al procesar PDF');
    } finally {
      e.target.value = '';
    }
  };

  const agregarResultado = async (e, compId) => {
    e.preventDefault();
    const { nombre, club, numero, puntos, categoria } = e.target;
    try {
      await api.post(`/competitions/${compId}/resultados`, {
        nombre: nombre.value,
        club: club.value,
        numero: numero.value,
        puntos: puntos.value,
        categoria: categoria.value
      });
      e.target.reset();
      const [resultados, tablaPuntos] = await Promise.all([
        api.get(`/competitions/${compId}/resultados`),
        api.get(`/competitions/${compId}/puntajes`)
      ]);
      setDetalles((prev) => ({
        ...prev,
        [compId]: {
          ...prev[compId],
          resultados: resultados.data,
          tablaPuntos: tablaPuntos.data
        }
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
                          <button
                            className="btn btn-outline-success mb-2"
                            onClick={() => exportarExcel(c._id)}
                          >
                            Exportar Excel
                          </button>
                          <input
                            type="file"
                            accept="application/pdf"
                            className="form-control mb-2"
                            onChange={(e) => cargarPdfPuntajes(e, c._id)}
                          />
                          <table className="table text-center">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Seguro</th>
                                <th>Número</th>
                                <th>Apellido y Nombre</th>
                                <th>Categoría</th>
                                <th>Club</th>
                                <th>F. Nacimiento</th>
                                <th>DNI</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(detalles[c._id].lista || []).map((p, idx) => (
                                <tr key={p._id}>
                                  <td>{idx + 1}</td>
                                  <td>SA</td>
                                  <td>{p.numeroCorredor}</td>
                                  <td>
                                    {p.apellido} {p.primerNombre}
                                  </td>
                                  <td>{p.categoria}</td>
                                  <td>{CLUB_LOCAL}</td>
                                  <td>
                                    {new Date(p.fechaNacimiento).toLocaleDateString()}
                                  </td>
                                  <td>{p.dni}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                      <h6>Resultados</h6>
                      <ul>
                          {(detalles[c._id].resultados || []).map((r) => (
                            <li key={r._id}>
                              {r.posicion ? `${r.posicion}. ` : ''}
                              {r.nombre} ({r.club}) #{r.numero} - {r.puntos}
                            </li>
                          ))}
                        </ul>
                        <h6 className="mt-3">Tabla de puntos</h6>
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Apellido y nombre</th>
                              <th>Nº</th>
                              <th>Club</th>
                              <th>Puntos totales</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(detalles[c._id].tablaPuntos || []).map((p) => (
                              <tr key={`${p.numero}-${p.club}-${p.nombre}`}>
                                <td>{p.nombre}</td>
                                <td>{p.numero}</td>
                                <td>{p.club}</td>
                                <td>{p.puntosTotales}</td>
                              </tr>
                          ))}
                        </tbody>
                      </table>
                      {detalles[c._id].externos.length > 0 && (
                        <div className="mt-3">
                          <h6>Patinadores externos</h6>
                          <table className="table text-center">
                            <thead>
                              <tr>
                                <th>Nombre</th>
                                <th>Número</th>
                                <th>Club</th>
                                <th>Puntos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detalles[c._id].externos.map((p, idx) => (
                                <tr key={`${p.nombre}-${idx}`}>
                                  <td>{p.nombre}</td>
                                  <td>{p.numero ?? ''}</td>
                                  <td>{p.club}</td>
                                  <td>{p.puntos ?? ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {rol === 'Delegado' && (
                        <>
                          <input
                            type="file"
                            accept="application/pdf"
                            className="form-control mb-2"
                            onChange={(e) => cargarPdfPatinadoresExternos(e, c._id)}
                          />
                          <form
                            id={`form-resultado-${c._id}`}
                            className="row g-2"
                            onSubmit={(e) => agregarResultado(e, c._id)}
                          >
                              <div className="col-md-2">
                                <select
                                  name="categoria"
                                  className="form-select"
                                  onChange={(e) => seleccionarCategoria(c._id, e.target.value)}
                                  required
                                >
                                  <option value="">Categoría</option>
                                  {Array.from(
                                    new Set((detalles[c._id].lista || []).map((p) => p.categoria))
                                  ).map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-md-3">
                                <select
                                  className="form-select"
                                  onChange={(e) => seleccionarPatinadorClub(e, c._id)}
                                >
                                  <option value="">Patinadores del club</option>
                                  {(detalles[c._id].lista || [])
                                    .filter((p) => p.categoria === detalles[c._id].categoria)
                                    .map((p) => (
                                      <option key={p._id} value={p._id}>
                                        {p.primerNombre} {p.apellido}
                                      </option>
                                    ))}
                                </select>
                              </div>
                              <div className="col-md-3">
                                <select
                                  className="form-select"
                                  onChange={(e) => seleccionarExterno(e, c._id)}
                                >
                                  <option value="">Patinadores de otros clubes</option>
                                  {(detalles[c._id].externos || []).map((p, idx) => (
                                    <option key={`${p.nombre}-${idx}`} value={idx}>
                                      {p.nombre} ({p.club}){p.numero ? ` #${p.numero}` : ''}
                                    </option>
                                  ))}
                                  <option value="manual">Cargar manualmente</option>
                                </select>
                              </div>
                              <div className="col-md-3">
                                <input
                                  type="text"
                                  name="nombre"
                                  className="form-control"
                                  placeholder="Nombre y Apellido"
                                  required
                                />
                              </div>
                              <div className="col-md-2">
                                <input
                                  type="text"
                                  name="club"
                                  className="form-control"
                                  placeholder="Club"
                                  required
                                />
                              </div>
                              <div className="col-md-2">
                                <input
                                  type="number"
                                  name="numero"
                                  className="form-control"
                                  placeholder="Número"
                                  required
                                />
                              </div>
                              <div className="col-md-2">
                                <input
                                  type="number"
                                  step="any"
                                  name="puntos"
                                  className="form-control"
                                  placeholder="Puntos"
                                  required
                                />
                              </div>
                              <div className="col-md-12 mt-2">
                                <button type="submit" className="btn btn-primary w-100">
                                  Agregar
                                </button>
                              </div>
                            </form>
                          </>
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
