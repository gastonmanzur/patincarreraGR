import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import getImageUrl from '../utils/getImageUrl';

export default function EditarNoticia() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [imagenActual, setImagenActual] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNoticia = async () => {
      try {
        const res = await api.get(`/news/${id}`);
        setTitulo(res.data?.titulo || '');
        setContenido(res.data?.contenido || '');
        setImagenActual(getImageUrl(res.data?.imagen));
      } catch (err) {
        setError(err.response?.data?.mensaje || 'Error al cargar la noticia');
      } finally {
        setCargando(false);
      }
    };

    fetchNoticia();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('contenido', contenido);
    if (e.target.imagen.files[0]) {
      formData.append('imagen', e.target.imagen.files[0]);
    }

    try {
      await api.put(`/news/${id}`, formData);
      navigate(`/noticias/${id}`);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al actualizar la noticia');
    }
  };

  if (cargando) {
    return <div className="container mt-4">Cargando...</div>;
  }

  return (
    <div className="container mt-4">
      <h1 className="mb-4 text-center">Editar Noticia</h1>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Título</label>
          <input
            type="text"
            name="titulo"
            className="form-control"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Contenido</label>
          <textarea
            name="contenido"
            className="form-control"
            rows="4"
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            required
          ></textarea>
        </div>
        <div className="mb-3">
          <label className="form-label">Imagen actual</label>
          {imagenActual ? (
            <img src={imagenActual} alt="imagen noticia" className="img-fluid d-block mb-2" />
          ) : (
            <p className="text-muted mb-2">Sin imagen</p>
          )}
          <label className="form-label">Reemplazar imagen (opcional)</label>
          <input type="file" name="imagen" className="form-control" accept="image/*" />
        </div>
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary">
            Guardar cambios
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
