// Servicio simple de OCR usando tesseract.js
// Se realiza una importación dinámica para evitar que la ausencia del
// paquete detenga la ejecución del servidor. Si el paquete no está
// instalado se lanza un error descriptivo.
export async function ocrBuffer(buffer) {
  // Carga perezosa de tesseract.js
  let Tesseract;
  try {
    ({ default: Tesseract } = await import('tesseract.js'));
  } catch {
    throw new Error(
      "tesseract.js no está instalado. Ejecute 'npm install tesseract.js'"
    );
  }

  const { data } = await Tesseract.recognize(buffer, 'spa', {
    logger: () => {}
  });
  return data.text;
}
