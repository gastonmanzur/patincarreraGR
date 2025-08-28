import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Home() {
  const [news, setNews] = useState([]);
  const [patinadores, setPatinadores] = useState([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [currentPatIndex, setCurrentPatIndex] = useState(0);
  const [nextCompetition, setNextCompetition] = useState(null);

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

    const cargarCompetencia = async () => {
      try {
        const compRes = await api.get('/competencias');
        const comps = compRes.data;
        if (comps.length > 0) {
          const sorted = comps.sort(
            (a, b) => new Date(a.fecha) - new Date(b.fecha)
          );
          setNextCompetition(sorted[sorted.length - 1]);
        }
      } catch (err) {
        console.error(err);
      }
    };

    cargarNoticias();
    if (localStorage.getItem('token')) {
      cargarPatinadores();
    }
    cargarCompetencia();
    const interval = setInterval(cargarCompetencia, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (news.length > 0) {
      const interval = setInterval(() => {
        setCurrentNewsIndex((prev) => (prev + 4) % news.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [news]);

  useEffect(() => {
    if (patinadores.length > 0) {
      const interval = setInterval(() => {
        setCurrentPatIndex((prev) => (prev + 1) % patinadores.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [patinadores]);

  const displayedNews = [];
  for (let i = 0; i < 4 && i < news.length; i += 1) {
    displayedNews.push(news[(currentNewsIndex + i) % news.length]);
  }

  const currentPatinador = patinadores[currentPatIndex];
  const latestNews = news.slice(0, 4);
  const wideNews = news.slice(4, 7);
  const additionalNews = news.slice(7, 11);

  return (
    <>
      {localStorage.getItem('token') && patinadores.length === 0 && (
        <div className="container mt-4">
          <div className="d-flex justify-content-end mb-3">
            <Link to="/asociar-patinadores" className="btn btn-primary">
              Asociar Patinadores
            </Link>
          </div>
        </div>
      )}
      <div className="container mt-4">
        <h1 className="mb-4">Noticias</h1>
        <div className="news-grid">
          {displayedNews[0] && (
            <Link
              to={`/noticias/${displayedNews[0]._id}`}
              className="news-item large"
              key={displayedNews[0]._id}
            >
              <div className="top-news-text">
                <div className="news-label-top">NOTICIA</div>
                <div className="news-label-top-line" />
                <h5>{displayedNews[0].titulo}</h5>
                <p>{displayedNews[0].contenido?.slice(0, 100)}...</p>
              </div>
              {displayedNews[0].imagen && (
                <div className="top-news-image">
                  <img src={displayedNews[0].imagen} alt="imagen noticia" />
                </div>
              )}
            </Link>
          )}
          <div className="patinadores-card top-right">
            {currentPatinador ? (
              <>
                {currentPatinador.foto && (
                  <img src={currentPatinador.foto} alt="foto patinador" />
                )}
                <div className="overlay">
                  <h6>
                    {currentPatinador.primerNombre} {currentPatinador.apellido}
                  </h6>
                </div>
              </>
            ) : (
              <div className="overlay">
                <p>No hay patinadores asociados</p>
              </div>
            )}
          </div>
          {displayedNews[1] && (
            <Link
              to={`/noticias/${displayedNews[1]._id}`}
              className="news-item bottom-left"
              key={displayedNews[1]._id}
            >
              {displayedNews[1].imagen && (
                <div className="image-container">
                  <img src={displayedNews[1].imagen} alt="imagen noticia" />
                  <div className="news-label">NOTICIA</div>
                  <div className="news-label-line" />
                </div>
              )}
              <div className="news-info">
                <h6>{displayedNews[1].titulo}</h6>
                <p>{displayedNews[1].contenido?.slice(0, 80)}...</p>
                <div className="news-divider" />
                <div className="news-footer">
                  <img
                    src="/vite.svg"
                    alt="logo patín carrera"
                    className="news-footer-logo"
                  />
                  <span>Patín carrera General Rodríguez</span>
                </div>
              </div>
            </Link>
          )}
          {displayedNews[2] && (
            <Link
              to={`/noticias/${displayedNews[2]._id}`}
              className="news-item bottom-middle-left"
              key={displayedNews[2]._id}
            >
              {displayedNews[2].imagen && (
                <div className="image-container">
                  <img src={displayedNews[2].imagen} alt="imagen noticia" />
                  <div className="news-label">NOTICIA</div>
                  <div className="news-label-line" />
                </div>
              )}
              <div className="news-info">
                <h6>{displayedNews[2].titulo}</h6>
                <p>{displayedNews[2].contenido?.slice(0, 80)}...</p>
                <div className="news-divider" />
                <div className="news-footer">
                  <img
                    src="/vite.svg"
                    alt="logo patín carrera"
                    className="news-footer-logo"
                  />
                  <span>Patín carrera General Rodríguez</span>
                </div>
              </div>
            </Link>
          )}
          {displayedNews[3] && (
            <Link
              to={`/noticias/${displayedNews[3]._id}`}
              className="news-item bottom-middle-right"
              key={displayedNews[3]._id}
            >
              {displayedNews[3].imagen && (
                <div className="image-container">
                  <img src={displayedNews[3].imagen} alt="imagen noticia" />
                  <div className="news-label">NOTICIA</div>
                  <div className="news-label-line" />
                </div>
              )}
              <div className="news-info">
                <h6>{displayedNews[3].titulo}</h6>
                <p>{displayedNews[3].contenido?.slice(0, 80)}...</p>
                <div className="news-divider" />
                <div className="news-footer">
                  <img
                    src="/vite.svg"
                    alt="logo patín carrera"
                    className="news-footer-logo"
                  />
                  <span>Patín carrera General Rodríguez</span>
                </div>
              </div>
            </Link>
          )}
          {nextCompetition && (
            <div className="news-item bottom-right">
              <div className="image-container">
                {nextCompetition.imagen && (
                  <img src={nextCompetition.imagen} alt="imagen competencia" />
                )}
                <div className="news-label competition-label">COMPETENCIA</div>
                <div className="news-label-line" />
              </div>
              <div className="news-info">
                <h6>{nextCompetition.nombre}</h6>
                <p>{new Date(nextCompetition.fecha).toLocaleDateString()}</p>
                <div className="news-divider" />
                <div className="news-footer">
                  <img
                    src="/vite.svg"
                    alt="logo patín carrera"
                    className="news-footer-logo"
                  />
                  <span>Patín carrera General Rodríguez</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="container mt-5 mb-5">
        <div className="mini-news-container">
          {latestNews.map((item) => (
            <Link
              key={item._id}
              to={`/noticias/${item._id}`}
              className="mini-news-card"
            >
              {item.imagen && (
                <img src={item.imagen} alt="imagen noticia" />
              )}
              <div className="mini-news-info">
                <div className="mini-news-header">
                  <img
                    src="/vite.svg"
                    alt="logo patín carrera"
                    className="mini-news-logo"
                  />
                  <span>Patín carrera General Rodríguez</span>
                </div>
                <h6>
                  {item.titulo.length > 60
                    ? `${item.titulo.slice(0, 60)}...`
                    : item.titulo}
                </h6>
              </div>
            </Link>
          ))}
        </div>
      </div>
      {wideNews.length > 0 && (
        <div className="container mb-5">
          <div className="wide-news-container">
            {wideNews.map((item) => (
              <Link
                key={item._id}
                to={`/noticias/${item._id}`}
                className="news-item"
              >
                {item.imagen && (
                  <div className="image-container">
                    <img src={item.imagen} alt="imagen noticia" />
                    <div className="news-label">NOTICIA</div>
                    <div className="news-label-line" />
                  </div>
                )}
                <div className="news-info">
                  <h6>{item.titulo}</h6>
                  <p>{item.contenido?.slice(0, 80)}...</p>
                  <div className="news-divider" />
                  <div className="news-footer">
                    <img
                      src="/vite.svg"
                      alt="logo patín carrera"
                      className="news-footer-logo"
                    />
                    <span>Patín carrera General Rodríguez</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      {additionalNews.length > 0 && (
        <div className="container mb-5">
          <div className="additional-news-grid">
            {additionalNews.map((item) => (
              <Link
                key={item._id}
                to={`/noticias/${item._id}`}
                className="news-item"
              >
                {item.imagen && (
                  <div className="image-container">
                    <img src={item.imagen} alt="imagen noticia" />
                    <div className="news-label">NOTICIA</div>
                    <div className="news-label-line" />
                  </div>
                )}
                <div className="news-info">
                  <h6>{item.titulo}</h6>
                  <p>{item.contenido?.slice(0, 80)}...</p>
                  <div className="news-divider" />
                  <div className="news-footer">
                    <img
                      src="/vite.svg"
                      alt="logo patín carrera"
                      className="news-footer-logo"
                    />
                    <span>Patín carrera General Rodríguez</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
