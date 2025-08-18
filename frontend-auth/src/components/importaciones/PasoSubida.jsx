import { useEffect, useState } from 'react';
import api from '../../api';

export default function PasoSubida({ onSubmit }) {
  const [competencias, setCompetencias] = useState([]);
  const [competenciaId, setCompetenciaId] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    api.get('/competencias').then((r) => setCompetencias(r.data));
  }, []);

  const handle = (e) => {
    e.preventDefault();
    if (competenciaId && file) onSubmit(competenciaId, file);
  };

  return (
    <form onSubmit={handle}>
      <h3>Subir PDF de puntajes</h3>
      <label>
        Competencia:
        <select value={competenciaId} onChange={(e) => setCompetenciaId(e.target.value)} required>
          <option value="">Seleccione...</option>
          {competencias.map((c) => (
            <option key={c._id} value={c._id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
      <button type="submit">Extraer</button>
    </form>
  );
}
