import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function CrearNoticia() {
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('titulo', e.target.titulo.value);
    formData.append('contenido', e.target.contenido.value);
    if (e.target.imagen.files[0]) {
      formData.append('imagen', e.target.imagen.files[0]);
    }
    try {
      await api.post('/news', formData);
      navigate('/home');
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al crear la noticia');
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Crear Noticia</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Título</label>
          <input type="text" name="titulo" className="form-control" required />
        </div>
        <div className="mb-3">
          <label className="form-label">Contenido</label>
          <textarea name="contenido" className="form-control" rows="4" required></textarea>
        </div>
        <div className="mb-3">
          <label className="form-label">Imagen (opcional)</label>
          <input type="file" name="imagen" className="form-control" accept="image/*" />
        </div>
        <button type="submit" className="btn btn-primary">Guardar</button>
      </form>
    </div>
  );
}
