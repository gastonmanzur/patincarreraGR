import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function VerNoticia() {
  const { id } = useParams();
  const [noticia, setNoticia] = useState(null);

  useEffect(() => {
    const fetchNoticia = async () => {
      try {
        const res = await api.get(`/news/${id}`);
        setNoticia(res.data);
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
        <img
          src={noticia.imagen}
          alt="imagen noticia"
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

