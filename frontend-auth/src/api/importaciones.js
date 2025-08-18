import api from './index.js';

export function extractPDF(competenciaId, file) {
  const form = new FormData();
  form.append('file', file);
  return api
    .post(`/importaciones/puntajes/pdf/extract?competenciaId=${competenciaId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then((r) => r.data);
}

export function confirmImport(data) {
  return api.post('/importaciones/puntajes/pdf/confirm', data).then((r) => r.data);
}

export function fetchIncidencias(competenciaId) {
  return api
    .get(`/importaciones/puntajes/pdf/incidencias?competenciaId=${competenciaId}`)
    .then((r) => r.data);
}
