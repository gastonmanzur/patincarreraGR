import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import getImageUrl from '../utils/getImageUrl';

export default function Home() {
  const [news, setNews] = useState([]);
  const [patinadores, setPatinadores] = useState([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [currentPatIndex, setCurrentPatIndex] = useState(0);
  const [nextCompetition, setNextCompetition] = useState(null);
  const [federaciones, setFederaciones] = useState([]);

  const normaliseFederationUrl = (url) => {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  useEffect(() => {
    const cargarNoticias = async () => {
      try {
        const clubId = sessionStorage.getItem('clubId');
        const config = clubId ? { params: { clubId } } : {};
        const newsRes = await api.get('/news', config);
        const normalized = Array.isArray(newsRes.data)
          ? newsRes.data.map((item) => ({
              ...item,
              imagen: getImageUrl(item.imagen)
            }))
          : [];
        setNews(normalized);
      } catch (err) {
        console.error(err);
      }
    };

    const cargarPatinadores = async () => {
      try {
        const userRes = await api.get('/protegido/usuario');
        const patinadoresData = Array.isArray(userRes.data.usuario?.patinadores)
          ? userRes.data.usuario.patinadores.map((p) => ({
              ...p,
              foto: getImageUrl(p.foto),
              fotoRostro: getImageUrl(p.fotoRostro)
            }))
          : [];
        setPatinadores(patinadoresData);
      } catch (err) {
        console.error(err);
      }
    };

    const cargarCompetencia = async () => {
      try {
        const clubId = sessionStorage.getItem('clubId');
        const config = clubId ? { params: { clubId } } : {};
        const compRes = await api.get('/competencias', config);
        const comps = Array.isArray(compRes.data)
          ? compRes.data.map((comp) => ({
              ...comp,
              imagen: getImageUrl(comp.imagen)
            }))
          : [];
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

    const cargarFederaciones = async () => {
      try {
        const fedRes = await api.get('/federaciones');
        setFederaciones(Array.isArray(fedRes.data) ? fedRes.data : []);
      } catch (err) {
        console.error(err);
      }
    };

    cargarNoticias();
    if (sessionStorage.getItem('token')) {
      cargarPatinadores();
    }
    cargarCompetencia();
    cargarFederaciones();
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
      {sessionStorage.getItem('token') && patinadores.length === 0 && (
        <div className="container mt-4">
    
          <div className="d-flex justify-content-end mb-3">
            <Link to="/asociar-patinadores" className="btn btn-primary">
              Asociar Patinadores
            </Link>
          </div>
        </div>
      )}
      <div className="container mt-4">

        <h1 className="mb-4 text-center">Noticias</h1>

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
                <h5 className="text-center">{displayedNews[0].titulo}</h5>
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
                  <h6 className="text-center">
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
                <h6 className="text-center">{displayedNews[1].titulo}</h6>
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
                <h6 className="text-center">{displayedNews[2].titulo}</h6>
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
                <h6 className="text-center">{displayedNews[3].titulo}</h6>
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
                <h6 className="text-center">{nextCompetition.nombre}</h6>
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
                <h6 className="text-center">
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
                  <h6 className="text-center">{item.titulo}</h6>
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
                  <h6 className="text-center">{item.titulo}</h6>
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
      {federaciones.length > 0 && (
        <div className="container mb-5">
          <h2 className="text-center mb-4">Federaciones asociadas a la CAP</h2>
          <div className="row g-4">
            {federaciones.map((federacion) => (
              <div className="col-12 col-md-6 col-lg-4" key={federacion._id}>
                <div className="card h-100 shadow-sm">
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{federacion.nombre}</h5>
                    {federacion.descripcion && (
                      <p className="card-text flex-grow-1">{federacion.descripcion}</p>
                    )}
                    {(federacion.sitioWeb || federacion.contacto) && (
                      <ul className="list-unstyled small mb-0 mt-3">
                        {federacion.sitioWeb && (
                          <li>
                            <a
                              href={normaliseFederationUrl(federacion.sitioWeb)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {federacion.sitioWeb}
                            </a>
                          </li>
                        )}
                        {federacion.contacto && <li>{federacion.contacto}</li>}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
