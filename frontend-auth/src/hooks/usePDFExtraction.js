import { useState } from 'react';
import { extractPDF, confirmImport } from '../api/importaciones.js';

export default function usePDFExtraction() {
  const [extraction, setExtraction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const extract = async (competenciaId, file) => {
    setLoading(true);
    setError(null);
    try {
      const data = await extractPDF(competenciaId, file);
      setExtraction(data);
    } catch (e) {
      setError(e.response?.data?.mensaje || e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await confirmImport(payload);
      return data;
    } catch (e) {
      setError(e.response?.data?.mensaje || e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { extraction, loading, error, extract, confirm };
}
