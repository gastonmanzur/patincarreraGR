import pdf from 'pdf-parse/lib/pdf-parse.js';
import fs from 'fs';
import path from 'path';

const sanitizeLineBreaks = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

const normaliseLine = (line) => {
  if (typeof line !== 'string') return '';
  return line.replace(/\u00a0/g, ' ');
};

const buildJsonPayload = (rawText) => {
  const normalisedText = sanitizeLineBreaks(rawText || '');
  const rawLines = normalisedText.split('\n').map((line) => normaliseLine(line));
  const trimmedLines = rawLines.map((line) => line.trim()).filter(Boolean);

  return {
    lines: trimmedLines,
    rawLines,
    metadata: {
      totalLines: rawLines.length,
      nonEmptyLines: trimmedLines.length,
      textLength: normalisedText.length,
      usedOCR: false
    }
  };
};

// Convierte el contenido de un PDF a un objeto JSON y opcionalmente lo guarda en disco.
//
// buffer: contenido del archivo PDF en memoria.
// outputPath: ruta donde se guardará el archivo JSON generado. Si se omite, solo devuelve el objeto.
export default async function pdfToJson(buffer, outputPath) {
  if (!buffer || buffer.length === 0) {
    throw new Error('El PDF está vacío o no se recibió correctamente.');
  }

  const data = await pdf(buffer, { max: 0 });
  const json = buildJsonPayload(data?.text || '');

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));
  }

  return json;
}
