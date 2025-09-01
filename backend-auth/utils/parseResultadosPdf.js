// Use default pdf-parse export to ensure built-in configuration
// that avoids "TT: undefined function" font warnings during parsing.
import pdf from 'pdf-parse';

export default async function parseResultadosPdf(buffer) {
  // Parse the full PDF using the bundled parser to avoid font warnings.
  const data = await pdf(buffer, { max: 0 });
  const lines = data.text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Find the header row that contains the expected table columns.
  const headerIdx = lines.findIndex(
    (l) => /orden/i.test(l) && /atleta/i.test(l) && /categor[ií]a/i.test(l)
  );
  if (headerIdx === -1) return [];

  const results = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    // Each data row begins with an order number followed by at least two spaces.
    if (!/^\d+\s{2,}/.test(line)) continue;
    // Split by two or more spaces to preserve names and club names containing spaces.
    const columns = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
    if (columns.length < 6) continue;

    const [orden, dorsal, nombre, categoria, club, ...rest] = columns;
    if (!orden || !dorsal || !categoria || rest.length === 0) continue;

    // The last element of `rest` is the total points. The preceding pairs are
    // the position and points for each prueba.
    const total = parseFloat(rest[rest.length - 1]);
    const pruebas = [];
    for (let j = 0; j < rest.length - 1; j += 2) {
      const pos = parseInt(rest[j], 10);
      const pts = parseFloat(rest[j + 1]);
      if (!isNaN(pos) && !isNaN(pts)) {
        pruebas.push({ pos, pts });
      }
    }

    results.push({
      posicion: parseInt(orden, 10),
      dorsal,
      nombre,
      categoria,
      club,
      pruebas,
      puntos: total
    });
  }

  return results;
}
