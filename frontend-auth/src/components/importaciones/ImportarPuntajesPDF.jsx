import { useState } from 'react';
import PasoSubida from './PasoSubida.jsx';
import PasoMapeo from './PasoMapeo.jsx';
import PasoConfirmacion from './PasoConfirmacion.jsx';
import usePDFExtraction from '../../hooks/usePDFExtraction.js';

export default function ImportarPuntajesPDF({ competenciaId: initialCompetenciaId }) {
  const [step, setStep] = useState(1);
  const [competenciaId, setCompetenciaId] = useState(initialCompetenciaId || null);
  const { extraction, loading, error, extract, confirm } = usePDFExtraction();
  const [summary, setSummary] = useState(null);

  const handleUpload = async (compId, file) => {
    setCompetenciaId(compId);
    await extract(compId, file);
    setStep(2);
  };

  const handleConfirm = async (mapping) => {
    const res = await confirm({ extractionId: extraction.extractionId, competenciaId, columnMapping: mapping });
    setSummary(res);
    setStep(3);
  };

  return (
    <div>
      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {step === 1 && <PasoSubida onSubmit={handleUpload} defaultCompetenciaId={competenciaId} />}
      {step === 2 && extraction && (
        <PasoMapeo
          detectedColumns={extraction.detectedColumns}
          rowsSample={extraction.rowsSample}
          onConfirm={handleConfirm}
        />
      )}
      {step === 3 && summary && <PasoConfirmacion resumen={summary} />}
    </div>
  );
}
