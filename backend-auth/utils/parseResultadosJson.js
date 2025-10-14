export default function parseResultadosJson(json) {
  const { lines } = json;
  const results = [];
  let currentCategoria = null;

  for (const line of lines) {
    // Detect explicit category lines such as "CATEGORIA CHUPETE" or
    // "CATEGORIA: PRE-INFANTIL".
    const categoriaLine = line.match(/^categor[ií]a\s*[:\-]?\s*(.+)$/i);
    if (categoriaLine) {
      const posibleCategoria = categoriaLine[1].trim();
      if (posibleCategoria && !/orden\b/i.test(posibleCategoria)) {
        currentCategoria = posibleCategoria.replace(/\s{2,}.*/, '').trim();
      }
      continue;
    }

    // Detect header rows that include the category name, e.g.
    // "Orden Nro Atleta APELLIDO Y NOMBRES CATEGORIA CHUPETE CLUB ...".
    const headerMatch = line.match(/orden.*categor[ií]a\s+([^\s].*?)\s+club/i);
    if (headerMatch) {
      const posibleCategoria = headerMatch[1].trim();
      if (posibleCategoria && !/orden\b/i.test(posibleCategoria)) {
        currentCategoria = posibleCategoria;
      }
      continue;
    }

    // Each data row begins with an order number followed by at least two spaces.
    if (!/^\d+\s{2,}/.test(line)) continue;

    // Split by two or more spaces to preserve names and club names containing spaces.
    const columns = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
    if (columns.length < 4) continue;

    const [orden, dorsal, nombre, maybeCategoriaOrClub, ...rest] = columns;
    if (!orden || !dorsal || rest.length === 0) continue;

    let categoria = currentCategoria;
    let club = maybeCategoriaOrClub;

    if (!categoria) {
      // If no category has been detected yet, assume the fourth column contains it.
      categoria = maybeCategoriaOrClub;
      club = rest.shift();
    } else if (maybeCategoriaOrClub.toUpperCase() === categoria.toUpperCase()) {
      // Many PDFs repeat the category in each row.
      club = rest.shift();
    } else if (rest.length > 0 && !rest[0].match(/^\d/)) {
      // If the category changed and there was no explicit header, detect it when the
      // category name appears in the row and is followed by a club name (non numeric).
      categoria = maybeCategoriaOrClub;
      club = rest.shift();
      currentCategoria = categoria;
    }

    if (!categoria || !club || rest.length === 0) continue;

    // The last element of `rest` is the total points. Intermediate values
    // correspond to per-prueba details which we ignore for this import.
    const totalRaw = rest[rest.length - 1];
    const total = parseFloat(totalRaw.replace(',', '.'));
    if (Number.isNaN(total)) continue;

    results.push({
      posicion: parseInt(orden, 10),
      dorsal,
      nombre,
      categoria,
      club,
      puntos: total
    });

    currentCategoria = categoria;
  }

  return results;
}
