import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function ListaPatinadores() {
  const [patinadores, setPatinadores] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const rol = localStorage.getItem('rol');

  useEffect(() => {
    const obtenerPatinadores = async () => {
      try {
        const res = await api.get('/patinadores');
        setPatinadores(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    obtenerPatinadores();
  }, []);

  const eliminarPatinador = async (id) => {
    if (!window.confirm('¿Eliminar patinador?')) return;
    try {
      await api.delete(`/patinadores/${id}`);
      setPatinadores(patinadores.filter((p) => p._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const nextCard = () => {
    if (patinadores.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % patinadores.length);
  };

  const prevCard = () => {
    if (patinadores.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + patinadores.length) % patinadores.length);
  };

  if (rol === 'Deportista') {
    return (
      <div className="container mt-4 deportista-container">
        {patinadores.length > 1 && (
          <button
            type="button"
            className="carousel-btn prev"
            onClick={prevCard}
            aria-label="Anterior"
          >
            ‹
          </button>
        )}
        <div
          className="deportista-wrapper"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {patinadores.map((p) => (
            <div className="deportista-card mb-4" key={p._id}>
              {p.foto && (
                <img src={p.foto} alt={`${p.primerNombre} ${p.apellido}`} />
              )}
              <div className="category-label">{p.categoria}</div>
              <div className="category-label-line" />
              <div className="name-label">
                {p.primerNombre} {p.apellido}
              </div>
              <div className="name-label-line" />
            </div>
          ))}
        </div>
        {patinadores.length > 1 && (
          <button
            type="button"
            className="carousel-btn next"
            onClick={nextCard}
            aria-label="Siguiente"
          >
            ›
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Patinadores</h1>
      <div className="row">
        {patinadores.map((p) => (
          <div className="col-md-4 mb-4" key={p._id}>
            <div className="card h-100">
              {p.fotoRostro && (
                <img
                  src={p.fotoRostro}
                  className="card-img-top"
                  alt={`${p.primerNombre} ${p.apellido}`}
                />
              )}
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">
                  {p.primerNombre} {p.apellido}
                </h5>
                <p className="card-text">Edad: {p.edad}</p>
                <p className="card-text">Categoría: {p.categoria}</p>
                <div className="mt-auto">
                  <Link
                    to={`/patinadores/${p._id}`}
                    className="btn btn-primary me-2"
                  >
                    Ver
                  </Link>
                  {rol === 'Delegado' && (
                    <>
                      <Link
                        to={`/patinadores/${p._id}/editar`}
                        className="btn btn-secondary me-2"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => eliminarPatinador(p._id)}
                        className="btn btn-danger"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
