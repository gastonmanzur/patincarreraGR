import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Home() {
  const [news, setNews] = useState([]);
  const [patinadores, setPatinadores] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [dni, setDni] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const newsRes = await api.get('/news');
        setNews(newsRes.data);
      } catch (err) {
        console.error(err);
      }

      const token = localStorage.getItem('token');
      if (token) {
        try {
          const patRes = await api.get('/patinadores/asociados');
          setPatinadores(patRes.data);
        } catch (err) {
          console.error(err);
        }
      }
    };
    cargarDatos();
  }, []);

  const asociarPatinador = async (e) => {
    e.preventDefault();
    try {
      await api.post('/patinadores/asociar', { dni });
      const res = await api.get('/patinadores/asociados');
      setPatinadores(res.data);
      setDni('');
      setMostrarForm(false);
    } catch (err) {
      console.error(err);
      alert('No se encontraron patinadores para ese DNI');
    }
  };

  return (
    <div className="container mt-4">
      <button
        className="btn btn-primary mb-3"
        onClick={() => setMostrarForm(!mostrarForm)}
      >
        Asociar Patinador
      </button>
      {mostrarForm && (
        <form onSubmit={asociarPatinador} className="mb-4">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="DNI"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
            />
            <button type="submit" className="btn btn-success">
              Asociar
            </button>
          </div>
        </form>
      )}

      {patinadores.map((p) => (
        <div className="card mb-3" key={p._id}>
          <div className="row g-0">
            <div className="col-md-4">
              {p.foto && (
                <img
                  src={p.foto}
                  className="img-fluid rounded-start"
                  alt={`${p.primerNombre} ${p.apellido}`}
                />
              )}
            </div>
            <div className="col-md-8">
              <div className="card-body">
                <h5 className="card-title">
                  {p.primerNombre} {p.apellido}
                </h5>
                <p className="card-text mb-1">Edad: {p.edad}</p>
                <p className="card-text mb-1">Categoría: {p.categoria}</p>
                <p className="card-text">Número de corredor: {p.numeroCorredor}</p>
              </div>
            </div>
          </div>
        </div>
      ))}

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
