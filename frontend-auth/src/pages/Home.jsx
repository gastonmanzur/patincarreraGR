import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Home() {
  const [news, setNews] = useState([]);
  const [patinadores, setPatinadores] = useState([]);

  useEffect(() => {
    const cargarNoticias = async () => {
      try {
        const newsRes = await api.get('/news');
        setNews(newsRes.data);
      } catch (err) {
        console.error(err);
      }
    };

    const cargarPatinadores = async () => {
      try {
        const userRes = await api.get('/protegido/usuario');
        setPatinadores(userRes.data.usuario.patinadores || []);
      } catch (err) {
        console.error(err);
      }
    };

    cargarNoticias();
    if (localStorage.getItem('token')) {
      cargarPatinadores();
    }
  }, []);

  const tienePatinadores = patinadores.length > 0;

  return (
    <>
      {localStorage.getItem('token') && !tienePatinadores && (
        <div className="container mt-4">
          <div className="d-flex justify-content-end mb-3">
            <Link to="/asociar-patinadores" className="btn btn-primary">
              Asociar Patinadores
            </Link>
          </div>
        </div>
      )}
      {localStorage.getItem('token') && tienePatinadores && (
        <div className="mt-4">
          {patinadores.map((p) => (
            <div className="card patinador-card" key={p._id}>
              {p.foto && (
                <img src={p.foto} className="card-img-top" alt="foto patinador" />
              )}
              <div className="card-body">
                <h5 className="card-title">
                  {p.primerNombre} {p.apellido}
                </h5>
                <p className="card-text">
                  <strong>Categoría:</strong> {p.categoria}
                </p>
                <p className="card-text">
                  <strong>Edad:</strong> {p.edad}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="container mt-4">
        <h1 className="mb-4">Noticias</h1>
        {news.map((n) => (
          <div className="card mb-3 news-card" key={n._id}>
            <div className="news-title">
              <h5>{n.titulo}</h5>
            </div>
            <div className="news-content">
              {n.imagen && (
                <div className="news-image">
                  <img src={n.imagen} alt="imagen noticia" />
                </div>
              )}
              <div className="news-text">
                <p>{n.contenido}</p>
              </div>
            </div>
            <div className="news-footer">
              <small className="text-muted">
                {n.autor} - {new Date(n.fecha).toLocaleDateString()}
              </small>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
