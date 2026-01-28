import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import getImageUrl from '../utils/getImageUrl';

const formatFecha = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default function TitulosClub() {
  const [club, setClub] = useState(null);
  const [individuales, setIndividuales] = useState([]);
  const [resumen, setResumen] = useState({ totalClub: 0, totalIndividuales: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tituloEnEdicion, setTituloEnEdicion] = useState(null);
  const [formEdicion, setFormEdicion] = useState({
    titulo: '',
    anio: '',
    descripcion: '',
    eliminarImagen: false
  });
  const [archivoEdicion, setArchivoEdicion] = useState(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [tituloEliminando, setTituloEliminando] = useState('');

  const rol = sessionStorage.getItem('rol');
  const esDelegado = rol === 'Delegado';
  const currentYear = new Date().getFullYear();

  const loadInfo = useCallback(async () => {
    setLoading(true);
    let success = false;
    try {
      const res = await api.get('/clubs/local/titulos');
      const data = res.data || {};
      const listaTitulos = Array.isArray(data?.club?.titulos) ? data.club.titulos : [];
      const listaIndividuales = Array.isArray(data?.individuales) ? data.individuales : [];

      const titulosNormalizados = listaTitulos.map((item) => ({
        ...item,
        imagen: getImageUrl(item.imagen)
      }));

      setClub(data.club ? { ...data.club, titulos: titulosNormalizados } : null);
      setIndividuales(listaIndividuales);
      setResumen(
        data.resumen || {
          totalClub: listaTitulos.length,
          totalIndividuales: listaIndividuales.reduce(
            (acc, item) => acc + (item.titulos || 0),
            0
          )
        }
      );
      setError('');
      success = true;
    } catch (err) {
      console.error('Error al cargar los títulos del club', err);
      setError(err.response?.data?.mensaje || 'Error al cargar los títulos del club');
      setClub(null);
      setIndividuales([]);
      setResumen({ totalClub: 0, totalIndividuales: 0 });
      setMensaje('');
    } finally {
      setLoading(false);
    }
    return success;
  }, []);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  const titulosOrdenados = useMemo(() => {
    if (!Array.isArray(club?.titulos)) return [];
    return [...club.titulos]
      .sort((a, b) => {
        const yearA = Number.isInteger(a.anio) ? a.anio : 0;
        const yearB = Number.isInteger(b.anio) ? b.anio : 0;
        if (yearA !== yearB) return yearB - yearA;
        const timeA = a.creadoEn ? new Date(a.creadoEn).getTime() : 0;
        const timeB = b.creadoEn ? new Date(b.creadoEn).getTime() : 0;
        return timeB - timeA;
      })
      .map((titulo) => ({
        ...titulo,
        imagen: getImageUrl(titulo.imagen)
      }));
  }, [club]);

  const totales = useMemo(() => {
    const totalClub = typeof resumen?.totalClub === 'number'
      ? resumen.totalClub
      : titulosOrdenados.length;
    const totalIndividuales = typeof resumen?.totalIndividuales === 'number'
      ? resumen.totalIndividuales
      : individuales.reduce((acc, item) => acc + (item.titulos || 0), 0);
    return { totalClub, totalIndividuales };
  }, [individuales, resumen, titulosOrdenados]);

  const nombreClub = useMemo(() => {
    const base = club?.nombreAmigable || club?.nombre;
    if (!base) return 'el club local';
    return base
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }, [club]);

  const iniciarEdicion = (titulo) => {
    if (!esDelegado) return;
    setTituloEnEdicion(titulo);
    setFormEdicion({
      titulo: titulo.titulo || '',
      anio: Number.isInteger(titulo.anio) ? titulo.anio.toString() : '',
      descripcion: titulo.descripcion || '',
      eliminarImagen: false
    });
    setArchivoEdicion(null);
    setMensaje('');
    setError('');
  };

  const cancelarEdicion = () => {
    setTituloEnEdicion(null);
    setFormEdicion({ titulo: '', anio: '', descripcion: '', eliminarImagen: false });
    setArchivoEdicion(null);
    setGuardandoEdicion(false);
  };

  const handleCambioEdicion = (e) => {
    const { name, value } = e.target;
    setFormEdicion((prev) => ({ ...prev, [name]: value }));
  };

  const handleArchivoEdicion = (e) => {
    const file = e.target.files?.[0];
    if (file && file.size > 0) {
      setArchivoEdicion(file);
      setFormEdicion((prev) => ({ ...prev, eliminarImagen: false }));
    } else {
      setArchivoEdicion(null);
    }
  };

  const handleToggleEliminarImagen = (e) => {
    const { checked } = e.target;
    setFormEdicion((prev) => ({ ...prev, eliminarImagen: checked }));
    if (checked) {
      setArchivoEdicion(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!esDelegado) return;

    const formData = new FormData(e.currentTarget);
    const titulo = formData.get('titulo')?.toString().trim() ?? '';
    const anioValor = formData.get('anio')?.toString().trim() ?? '';
    const descripcion = formData.get('descripcion')?.toString().trim() ?? '';

    if (!titulo) {
      setError('Ingresá un título para el club.');
      setMensaje('');
      return;
    }

    const payload = new FormData();
    payload.append('titulo', titulo);

    if (anioValor) {
      const parsed = Number.parseInt(anioValor, 10);
      if (Number.isNaN(parsed) || parsed < 1900 || parsed > currentYear + 1) {
        setError(`Ingresá un año entre 1900 y ${currentYear + 1}.`);
        setMensaje('');
        return;
      }
      payload.append('anio', parsed.toString());
    }

    if (descripcion) {
      payload.append('descripcion', descripcion);
    }

    const imagen = formData.get('imagen');
    const isFile = imagen instanceof File;
    if (isFile && imagen.size > 0) {
      payload.append('imagen', imagen, imagen.name);
    }

    try {
      await api.post('/clubs/local/titulos', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      e.currentTarget.reset();
      const success = await loadInfo();
      if (success) {
        setMensaje('Título agregado correctamente.');
        setError('');
      } else {
        setMensaje('');
      }
    } catch (err) {
      console.error('Error al agregar el título del club', err);
      setError(err.response?.data?.mensaje || 'Error al agregar el título del club');
      setMensaje('');
    }
  };

  const handleSubmitEdicion = async (e) => {
    e.preventDefault();
    if (!esDelegado || !tituloEnEdicion) return;

    const tituloActualizado = formEdicion.titulo.trim();
    const descripcionActualizada = formEdicion.descripcion.trim();
    const anioValor = formEdicion.anio.trim();

    setMensaje('');
    setError('');

    if (!tituloActualizado) {
      setError('Ingresá un título para el club.');
      setMensaje('');
      return;
    }

    let anioFormateado = '';
    if (anioValor) {
      const parsed = Number.parseInt(anioValor, 10);
      if (Number.isNaN(parsed) || parsed < 1900 || parsed > currentYear + 1) {
        setError(`Ingresá un año entre 1900 y ${currentYear + 1}.`);
        setMensaje('');
        return;
      }
      anioFormateado = parsed.toString();
    }

    const payload = new FormData();
    payload.append('titulo', tituloActualizado);
    payload.append('descripcion', descripcionActualizada);
    payload.append('anio', anioFormateado);

    if (archivoEdicion) {
      payload.append('imagen', archivoEdicion, archivoEdicion.name);
    }

    if (formEdicion.eliminarImagen && !archivoEdicion) {
      payload.append('eliminarImagen', 'true');
    }

    try {
      setGuardandoEdicion(true);
      await api.put(`/clubs/local/titulos/${tituloEnEdicion._id}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const success = await loadInfo();
      if (success) {
        setMensaje('Título actualizado correctamente.');
        setError('');
        cancelarEdicion();
      } else {
        setMensaje('');
      }
    } catch (err) {
      console.error('Error al actualizar el título del club', err);
      setError(err.response?.data?.mensaje || 'Error al actualizar el título del club');
      setMensaje('');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleEliminarTitulo = async (titulo) => {
    if (!esDelegado) return;
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar el título "${titulo.titulo}" del historial del club?`
    );
    if (!confirmar) return;

    try {
      setTituloEliminando(titulo._id);
      setMensaje('');
      setError('');
      await api.delete(`/clubs/local/titulos/${titulo._id}`);
      const success = await loadInfo();
      if (success) {
        setMensaje('Título eliminado correctamente.');
        setError('');
        if (tituloEnEdicion?._id === titulo._id) {
          cancelarEdicion();
        }
      } else {
        setMensaje('');
      }
    } catch (err) {
      console.error('Error al eliminar el título del club', err);
      setError(err.response?.data?.mensaje || 'Error al eliminar el título del club');
      setMensaje('');
    } finally {
      setTituloEliminando('');
    }
  };

  if (loading) {
    return (
      <div className="container mt-5 d-flex justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h1 className="mb-4 text-center">Títulos del Club</h1>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {mensaje && <div className="alert alert-success" role="alert">{mensaje}</div>}

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body text-center">
              <p className="text-muted mb-1">Títulos del club</p>
              <h3 className="mb-0">{totales.totalClub}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body text-center">
              <p className="text-muted mb-1">Títulos individuales locales</p>
              <h3 className="mb-0">{totales.totalIndividuales}</h3>
            </div>
          </div>
        </div>
      </div>

      {esDelegado && (
        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <h2 className="h5 mb-3">Agregar título para {nombreClub}</h2>
            <form onSubmit={handleSubmit} className="row g-3" noValidate>
              <div className="col-md-6">
                <label htmlFor="titulo" className="form-label">Título obtenido</label>
                <input
                  type="text"
                  className="form-control"
                  id="titulo"
                  name="titulo"
                  placeholder="Ej: Campeón Provincial"
                  required
                />
              </div>
              <div className="col-md-3">
                <label htmlFor="anio" className="form-label">Año</label>
                <input
                  type="number"
                  className="form-control"
                  id="anio"
                  name="anio"
                  min="1900"
                  max={currentYear + 1}
                  placeholder="2024"
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="imagen" className="form-label">Fotografía del trofeo (opcional)</label>
                <input
                  type="file"
                  className="form-control"
                  id="imagen"
                  name="imagen"
                  accept="image/*"
                />
                <div className="form-text">Podés adjuntar una foto en formato JPG o PNG (máx. 10MB).</div>
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <button type="submit" className="btn btn-primary w-100">Guardar título</button>
              </div>
              <div className="col-12">
                <label htmlFor="descripcion" className="form-label">Detalle (opcional)</label>
                <textarea
                  className="form-control"
                  id="descripcion"
                  name="descripcion"
                  rows="2"
                  placeholder="Agregá la categoría, competencia u otra referencia"
                ></textarea>
              </div>
            </form>
          </div>
        </div>
      )}

      {esDelegado && tituloEnEdicion && (
        <div className="card mb-4 border-primary shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h2 className="h5 m-0">Editar título del club</h2>
              <button type="button" className="btn btn-link p-0" onClick={cancelarEdicion}>
                Cancelar edición
              </button>
            </div>
            <form onSubmit={handleSubmitEdicion} className="row g-3" noValidate>
              <div className="col-md-6">
                <label htmlFor="titulo-edicion" className="form-label">Título obtenido</label>
                <input
                  type="text"
                  className="form-control"
                  id="titulo-edicion"
                  name="titulo"
                  value={formEdicion.titulo}
                  onChange={handleCambioEdicion}
                  required
                />
              </div>
              <div className="col-md-3">
                <label htmlFor="anio-edicion" className="form-label">Año</label>
                <input
                  type="number"
                  className="form-control"
                  id="anio-edicion"
                  name="anio"
                  min="1900"
                  max={currentYear + 1}
                  value={formEdicion.anio}
                  onChange={handleCambioEdicion}
                  placeholder="2024"
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="imagen-edicion" className="form-label">Actualizar fotografía</label>
                <input
                  type="file"
                  className="form-control"
                  id="imagen-edicion"
                  name="imagen"
                  accept="image/*"
                  onChange={handleArchivoEdicion}
                />
                <div className="form-text">
                  {tituloEnEdicion.imagen
                    ? 'Podés reemplazar la imagen actual cargando una nueva.'
                    : 'Podés adjuntar una foto en formato JPG o PNG (máx. 10MB).'}
                </div>
                {tituloEnEdicion.imagen && (
                  <>
                    <div className="form-text">
                      Imagen actual:{' '}
                      <a href={tituloEnEdicion.imagen} target="_blank" rel="noopener noreferrer">
                        Ver fotografía
                      </a>
                    </div>
                    <div className="form-check mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="eliminar-imagen"
                        checked={formEdicion.eliminarImagen}
                        onChange={handleToggleEliminarImagen}
                      />
                      <label className="form-check-label" htmlFor="eliminar-imagen">
                        Eliminar imagen actual
                      </label>
                    </div>
                  </>
                )}
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <button type="submit" className="btn btn-primary w-100" disabled={guardandoEdicion}>
                  {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
              <div className="col-12">
                <label htmlFor="descripcion-edicion" className="form-label">Detalle</label>
                <textarea
                  className="form-control"
                  id="descripcion-edicion"
                  name="descripcion"
                  rows="2"
                  value={formEdicion.descripcion}
                  onChange={handleCambioEdicion}
                  placeholder="Agregá la categoría, competencia u otra referencia"
                ></textarea>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h2 className="h5 m-0">Historial de títulos del club</h2>
            <span className="badge bg-primary-subtle text-primary">
              {titulosOrdenados.length} título{titulosOrdenados.length === 1 ? '' : 's'}
            </span>
          </div>
          {titulosOrdenados.length === 0 ? (
            <p className="mb-0">Aún no se registraron títulos para {nombreClub}.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th scope="col">Imagen</th>
                    <th>Título</th>
                    <th>Año</th>
                    <th>Descripción</th>
                    <th>Registrado por</th>
                    <th>Fecha de carga</th>
                    {esDelegado && <th className="text-end">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {titulosOrdenados.map((titulo) => {
                    const autor = titulo.creadoPor
                      ? `${titulo.creadoPor.nombre || ''} ${titulo.creadoPor.apellido || ''}`.trim()
                      : '';
                    return (
                      <tr key={titulo._id}>
                        <td style={{ width: '120px' }}>
                          <Link
                            to={`/titulos-club/${titulo._id}`}
                            className="d-inline-block rounded overflow-hidden border bg-light"
                            style={{ width: '96px', height: '96px' }}
                          >
                            {titulo.imagen ? (
                              <img
                                src={titulo.imagen}
                                alt={`Trofeo ${titulo.titulo}`}
                                className="w-100 h-100 object-fit-cover"
                              />
                            ) : (
                              <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted small">
                                Sin imagen
                              </div>
                            )}
                          </Link>
                        </td>
                        <td>
                          <Link
                            to={`/titulos-club/${titulo._id}`}
                            className="text-decoration-none fw-semibold"
                          >
                            {titulo.titulo}
                          </Link>
                        </td>
                        <td>{Number.isInteger(titulo.anio) ? titulo.anio : '—'}</td>
                        <td>{titulo.descripcion || '—'}</td>
                        <td>{autor || '—'}</td>
                        <td>{formatFecha(titulo.creadoEn)}</td>
                        {esDelegado && (
                          <td className="text-end">
                            <div className="btn-group btn-group-sm" role="group">
                              <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => iniciarEdicion(titulo)}
                                disabled={
                                  (guardandoEdicion && tituloEnEdicion?._id === titulo._id) ||
                                  tituloEliminando === titulo._id
                                }
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => handleEliminarTitulo(titulo)}
                                disabled={tituloEliminando === titulo._id}
                              >
                                {tituloEliminando === titulo._id ? 'Eliminando…' : 'Eliminar'}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h2 className="h5 m-0">Títulos individuales de patinadores locales</h2>
            <span className="badge bg-success-subtle text-success">
              {totales.totalIndividuales} título{totales.totalIndividuales === 1 ? '' : 's'} individuales
            </span>
          </div>
          {individuales.length === 0 ? (
            <p className="mb-0">
              Todavía no se registraron títulos individuales para los patinadores del club.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Patinador</th>
                    <th scope="col" className="text-center">Títulos</th>
                  </tr>
                </thead>
                <tbody>
                  {individuales.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>{item.nombre}</td>
                      <td className="text-center">
                        <span className="badge bg-success rounded-pill">{item.titulos}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

