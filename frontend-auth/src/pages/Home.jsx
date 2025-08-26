import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Home() {
  const [news, setNews] = useState([]);
  const [patinadores, setPatinadores] = useState([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [currentPatIndex, setCurrentPatIndex] = useState(0);

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

  useEffect(() => {
    if (news.length > 0) {
      const interval = setInterval(() => {
        setCurrentNewsIndex((prev) => (prev + 5) % news.length);
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
  for (let i = 0; i < 5 && i < news.length; i += 1) {
    displayedNews.push(news[(currentNewsIndex + i) % news.length]);
  }

  const currentPatinador = patinadores[currentPatIndex];

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
            <div className="news-item large" key={displayedNews[0]._id}>
              {displayedNews[0].imagen && (
                <img src={displayedNews[0].imagen} alt="imagen noticia" />
              )}
              <div className="overlay">
                <h5>{displayedNews[0].titulo}</h5>
              </div>
            </div>
          )}
          {displayedNews[1] && (
            <div className="news-item top-right" key={displayedNews[1]._id}>
              {displayedNews[1].imagen && (
                <img src={displayedNews[1].imagen} alt="imagen noticia" />
              )}
              <div className="overlay">
                <h6>{displayedNews[1].titulo}</h6>
              </div>
            </div>
          )}
          <div className="patinadores-card middle-right">
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
          {displayedNews[2] && (
            <div className="news-item bottom-left" key={displayedNews[2]._id}>
              {displayedNews[2].imagen && (
                <img src={displayedNews[2].imagen} alt="imagen noticia" />
              )}
              <div className="overlay">
                <h6>{displayedNews[2].titulo}</h6>
              </div>
            </div>
          )}
          {displayedNews[3] && (
            <div className="news-item bottom-middle" key={displayedNews[3]._id}>
              {displayedNews[3].imagen && (
                <img src={displayedNews[3].imagen} alt="imagen noticia" />
              )}
              <div className="overlay">
                <h6>{displayedNews[3].titulo}</h6>
              </div>
            </div>
          )}
          {displayedNews[4] && (
            <div className="news-item bottom-right" key={displayedNews[4]._id}>
              {displayedNews[4].imagen && (
                <img src={displayedNews[4].imagen} alt="imagen noticia" />
              )}
              <div className="overlay">
                <h6>{displayedNews[4].titulo}</h6>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
