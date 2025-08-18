import fs from 'fs/promises';
import crypto from 'crypto';
import { extractTableFromText, mapHeaders } from './tablaExtractor.js';
import { normalizarFila } from './normalizadorResultados.js';
import Resultado from '../models/Resultado.js';
import IncidenciaImportacion from '../models/IncidenciaImportacion.js';
import Patinador from '../models/Patinador.js';
import { ocrBuffer } from './ocrService.js';

const extracciones = new Map();

export async function extract(filePath, competenciaId) {
  const buffer = await fs.readFile(filePath);
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  let text = '';
  try {
    const { default: pdfParse } = await import('pdf-parse');
    const data = await pdfParse(buffer);
    text = data.text;
  } catch (e) {
    // Ignorar, intentar OCR si no se pudo leer texto
  }

  let requiresOCR = false;
  if (!text || !text.trim()) {
    requiresOCR = true;
    try {
      text = await ocrBuffer(buffer);
      requiresOCR = false;
    } catch (e) {
      // Mantener requiresOCR en true
    }
  }

  const { headers, rows } = extractTableFromText(text);
  const detectedColumns = mapHeaders(headers);
  const rowsSample = rows.slice(0, 20);

  const extractionId = crypto.randomUUID();
  extracciones.set(extractionId, { rows, detectedColumns, hash, fileName: filePath, competenciaId });

  return {
    extractionId,
    detectedColumns,
    rowsSample,
    rowsTotal: rows.length,
    requiresOCR
  };
}

export async function confirm({ extractionId, competenciaId, columnMapping }) {
  const data = extracciones.get(extractionId);
  if (!data) throw new Error('Extracción no encontrada');

  let inserted = 0;
  let updated = 0;
  const incidents = [];

  for (const row of data.rows) {
    const norm = normalizarFila(row, columnMapping);
    if (!norm.nombre) {
      incidents.push({ filaRaw: row, motivo: 'nombreFaltante' });
      continue;
    }

    const deportistas = await Patinador.find({ nombreCompleto: norm.nombre });
    if (deportistas.length !== 1) {
      incidents.push({ filaRaw: row, motivo: 'deportistaAmbiguo', sugerencias: deportistas.map((d) => d._id) });
      continue;
    }
    const deportistaId = deportistas[0]._id;

    const update = {
      competenciaId,
      deportistaId,
      categoria: norm.categoria,
      clubId: deportistas[0].club,
      posicion: norm.posicion,
      tiempoMs: norm.tiempoMs,
      puntos: norm.puntos,
      dorsal: norm.dorsal,
      fuenteImportacion: { archivo: data.fileName, hash: data.hash }
    };

    const res = await Resultado.findOneAndUpdate(
      { competenciaId, deportistaId, categoria: norm.categoria },
      update,
      { upsert: true, new: false }
    );
    if (res) updated++; else inserted++;
  }

  if (incidents.length) {
    await IncidenciaImportacion.insertMany(
      incidents.map((i) => ({ ...i, competenciaId }))
    );
  }

  return { inserted, updated, skipped: 0, incidents: incidents.length };
}

export function getIncidencias(competenciaId) {
  return IncidenciaImportacion.find({ competenciaId }).lean();
}

// Utilidad para pruebas de idempotencia: upsert en un Map en memoria
