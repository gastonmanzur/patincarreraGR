import { useState } from 'react';
import api from '../api.js';

export default function AsociarPatinadores() {
  const [dniPadre, setDniPadre] = useState('');
  const [dniMadre, setDniMadre] = useState('');
  const [patinadores, setPatinadores] = useState([]);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/patinadores/asociar', { dniPadre, dniMadre });
      setPatinadores(res.data);
      setError('');
    } catch (err) {
      setPatinadores([]);
      setError(err.response?.data?.mensaje || 'Error al asociar patinadores');
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-3">Asociar Patinadores</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-3">
          <label className="form-label">DNI del Padre</label>
          <input
            type="text"
            className="form-control"
            value={dniPadre}
            onChange={(e) => setDniPadre(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">DNI de la Madre</label>
          <input
            type="text"
            className="form-control"
            value={dniMadre}
            onChange={(e) => setDniMadre(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">Asociar</button>
      </form>
      {error && <div className="alert alert-danger">{error}</div>}
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
                <h5 className="card-title">{p.primerNombre} {p.apellido}</h5>
                <p className="card-text"><strong>Categoría:</strong> {p.categoria}</p>
                <p className="card-text"><strong>Edad:</strong> {p.edad}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
