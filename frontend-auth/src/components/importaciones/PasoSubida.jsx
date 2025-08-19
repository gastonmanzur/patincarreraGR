import { useEffect, useState } from 'react';
import api from '../../api';

export default function PasoSubida({ onSubmit, defaultCompetenciaId }) {
  const [competencias, setCompetencias] = useState([]);
  const [competenciaId, setCompetenciaId] = useState(defaultCompetenciaId || '');
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!defaultCompetenciaId) {
      api.get('/competencias').then((r) => setCompetencias(r.data));
    }
  }, [defaultCompetenciaId]);

  const handle = (e) => {
    e.preventDefault();
    const comp = competenciaId || defaultCompetenciaId;
    if (comp && file) onSubmit(comp, file);
  };

  return (
    <form onSubmit={handle}>
      <h3>Subir PDF de puntajes</h3>
      {!defaultCompetenciaId && (
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
      )}
      {defaultCompetenciaId && <p>Competencia seleccionada</p>}
      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
      <button type="submit">Extraer</button>
    </form>
  );
}
