import pdf from 'pdf-parse/lib/pdf-parse.js';
import pdfjs from 'pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js';
import fs from 'fs';
import path from 'path';

// Reducimos la verbosidad de pdf.js para evitar advertencias como
// "TT: undefined function" que se muestran en consola al procesar algunos PDF.
pdfjs.setVerbosityLevel(pdfjs.VerbosityLevel.ERRORS);

// Convierte el contenido de un PDF a un objeto JSON y opcionalmente lo guarda en disco.
//
// buffer: contenido del archivo PDF en memoria.
// outputPath: ruta donde se guardará el archivo JSON generado. Si se omite, solo devuelve el objeto.
export default async function pdfToJson(buffer, outputPath) {
  const data = await pdf(buffer, { max: 0 });
  const lines = data.text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const json = { lines };

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));
  }

  return json;
}
