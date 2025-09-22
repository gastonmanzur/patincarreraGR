import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import getImageUrl from '../utils/getImageUrl';
import ImageWithFallback from '../components/ImageWithFallback';

export default function VerNoticia() {
  const { id } = useParams();
  const [noticia, setNoticia] = useState(null);

  useEffect(() => {
    const fetchNoticia = async () => {
      try {
        const res = await api.get(`/news/${id}`);
        setNoticia(res.data || null);
      } catch (err) {
        console.error(err);
      }
    };

    fetchNoticia();
  }, [id]);

  if (!noticia) {
    return <div className="container mt-4">Cargando...</div>;
  }

  return (
    <div className="container mt-4">
      <h1 className="mb-3">{noticia.titulo}</h1>
      {noticia.imagen && (
        <ImageWithFallback
          src={getImageUrl(noticia.imagen)}
          alt={`Imagen de la noticia ${noticia.titulo}`}
          className="img-fluid mb-3"
        />
      )}
      <p>{noticia.contenido}</p>
      <div className="mt-3 d-flex align-items-center gap-2">
        <img src="/vite.svg" alt="logo patín carrera" width="30" height="30" />
        <span>Patín carrera General Rodríguez</span>
      </div>
    </div>
  );
}

