import Tesseract from 'tesseract.js';
import { readFile } from 'fs/promises';

// Servicio simple de OCR usando tesseract.js
export async function ocrBuffer(buffer) {
  const { data } = await Tesseract.recognize(buffer, 'spa', {
    logger: () => {}
  });
  return data.text;
}
