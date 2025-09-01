import pdf from 'pdf-parse/lib/pdf-parse.js';

export default async function pdfToJson(buffer) {
  const data = await pdf(buffer, { max: 0 });
  const lines = data.text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return { lines };
}
