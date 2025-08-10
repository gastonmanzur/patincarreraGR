import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';

export default function Home() {
  const [news, setNews] = useState([]);
  useEffect(() => {
    const cargarNoticias = async () => {
      try {
        const newsRes = await api.get('/news');
        setNews(newsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    cargarNoticias();
  }, []);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-end mb-3">
        <Link to="/asociar-patinadores" className="btn btn-primary">
          Asociar Patinadores
        </Link>
      </div>
      <h1 className="mb-4">Noticias</h1>
      {news.map((n) => (
        <div className="card mb-3" key={n._id}>
          {n.imagen && <img src={n.imagen} className="card-img-top" alt="imagen noticia" />}
          <div className="card-body">
            <h5 className="card-title">{n.titulo}</h5>
            <p className="card-text">{n.contenido}</p>
            <p className="card-text">
              <small className="text-muted">
                {n.autor} - {new Date(n.fecha).toLocaleDateString()}
              </small>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
