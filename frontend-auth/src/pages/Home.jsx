import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';

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
    <div className="container mt-4">
      {localStorage.getItem('token') && !tienePatinadores && (
        <div className="d-flex justify-content-end mb-3">
          <Link to="/asociar-patinadores" className="btn btn-primary">
            Asociar Patinadores
          </Link>
        </div>
      )}
      {localStorage.getItem('token') && tienePatinadores && (
        <>
          <h2 className="mb-4">Patinadores Asociados</h2>
          {patinadores.map((p) => (
            <div className="card mb-3" key={p._id}>
              <div className="row g-0">
                {p.foto && (
                  <div className="col-md-4">
                    <img src={p.foto} className="img-fluid rounded-start" alt="foto patinador" />
                  </div>
                )}
                <div className="col-md-8">
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
              </div>
            </div>
          ))}
        </>
      )}
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
