import { useState } from 'react';
import TablaPreview from './TablaPreview.jsx';

const CAMPOS = ['posicion', 'dorsal', 'nombre', 'categoria', 'club', 'tiempo', 'puntos'];

export default function PasoMapeo({ detectedColumns = {}, rowsSample = [], onConfirm }) {
  const cols = rowsSample[0] ? rowsSample[0].length : 0;
  const [mapping, setMapping] = useState(() => {
    const initial = {};
    for (const campo of CAMPOS) {
      if (detectedColumns[campo] !== undefined) initial[campo] = detectedColumns[campo];
    }
    return initial;
  });

  const handleChange = (campo, idx) => {
    setMapping({ ...mapping, [campo]: Number(idx) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(mapping);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Mapeo de columnas</h3>
      <TablaPreview rows={rowsSample} />
      {CAMPOS.map((c) => (
        <div key={c}>
          <label>
            {c}:
            <select value={mapping[c] ?? ''} onChange={(e) => handleChange(c, e.target.value)}>
              <option value="">--</option>
              {Array.from({ length: cols }).map((_, i) => (
                <option key={i} value={i}>
                  Col {i + 1}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
      <button type="submit">Confirmar importación</button>
    </form>
  );
}
