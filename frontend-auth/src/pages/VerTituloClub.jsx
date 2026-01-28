import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import getImageUrl from '../utils/getImageUrl';

const formatFecha = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatAnio = (anio) => {
  if (!Number.isInteger(anio)) return '—';
  return anio;
};

export default function VerTituloClub() {
  const { id } = useParams();
  const [titulo, setTitulo] = useState(null);
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTitulo = useCallback(async () => {
    if (!id) {
      setError('Identificador de título no válido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/clubs/local/titulos/${id}`);
      const data = res.data || {};
      const tituloNormalizado = data.titulo
        ? {
            ...data.titulo,
            imagen: getImageUrl(data.titulo.imagen)
          }
        : null;

      setTitulo(tituloNormalizado);
      setClub(data.club || null);
      setError('');
    } catch (err) {
      console.error('Error al cargar el título del club', err);
      const mensaje = err.response?.status === 404
        ? 'El título solicitado no existe o fue eliminado.'
        : err.response?.data?.mensaje || 'Error al obtener el título del club';
      setError(mensaje);
      setTitulo(null);
      setClub(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadTitulo();
  }, [loadTitulo]);

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
      <div className="mb-3">
        <Link to="/titulos-club" className="text-decoration-none">
          &larr; Volver al listado de títulos
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {!error && titulo && (
        <div className="card shadow-sm overflow-hidden">
          <div className="row g-0 flex-column flex-lg-row">
            <div className="col-lg-6">
              {titulo.imagen ? (
                <img
                  src={titulo.imagen}
                  alt={`Trofeo ${titulo.titulo}`}
                  className="w-100 h-100 object-fit-cover"
                  style={{ minHeight: '320px' }}
                />
              ) : (
                <div
                  className="bg-light d-flex align-items-center justify-content-center text-muted w-100 h-100"
                  style={{ minHeight: '320px' }}
                >
                  Sin fotografía disponible
                </div>
              )}
            </div>
            <div className="col-lg-6">
              <div className="card-body d-flex flex-column h-100">
                <div>
                  <h1 className="h3 mb-2">{titulo.titulo}</h1>
                  <p className="text-muted mb-4">
                    {club?.nombreAmigable || club?.nombre || 'Club local'}
                  </p>

                  {titulo.descripcion && (
                    <p className="mb-4">{titulo.descripcion}</p>
                  )}
                </div>

                <div className="mt-auto pt-4 border-top">
                  <div className="row gy-3">
                    <div className="col-sm-6">
                      <h2 className="h6 text-uppercase text-muted mb-1">Año</h2>
                      <p className="mb-0 fw-semibold">{formatAnio(titulo.anio)}</p>
                    </div>
                    <div className="col-sm-6">
                      <h2 className="h6 text-uppercase text-muted mb-1">Registrado por</h2>
                      <p className="mb-0">
                        {titulo.creadoPor
                          ? `${titulo.creadoPor.nombre || ''} ${titulo.creadoPor.apellido || ''}`.trim() || '—'
                          : '—'}
                      </p>
                    </div>
                    <div className="col-sm-6">
                      <h2 className="h6 text-uppercase text-muted mb-1">Fecha de carga</h2>
                      <p className="mb-0">{formatFecha(titulo.creadoEn)}</p>
                    </div>
                    <div className="col-sm-6">
                      <h2 className="h6 text-uppercase text-muted mb-1">ID de registro</h2>
                      <p className="mb-0 small text-body-secondary">{titulo._id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
