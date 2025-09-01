export default function parseResultadosJson(json) {
  const { lines } = json;
  const results = [];
  let currentCategoria = null;

  for (const line of lines) {
    // Detect header rows that include the category name, e.g.
    // "Orden Nro Atleta APELLIDO Y NOMBRES CATEGORIA PDE CLUB ...".
    const headerMatch = line.match(
      /orden.*categor[ií]a\s+([^\s]+)\s+club/i
    );
    if (headerMatch) {
      currentCategoria = headerMatch[1];
      continue;
    }

    if (!currentCategoria) continue; // Skip lines until a category header is found

    // Each data row begins with an order number followed by at least two spaces.
    if (!/^\d+\s{2,}/.test(line)) continue;

    // Split by two or more spaces to preserve names and club names containing spaces.
    const columns = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
    if (columns.length < 4) continue;

    const [orden, dorsal, nombre, maybeCategoriaOrClub, ...rest] = columns;
    if (!orden || !dorsal || rest.length === 0) continue;

    // Determine if the row includes an explicit category column. Some PDFs place
    // the category only in the header, while others repeat it for each row.
    let club = maybeCategoriaOrClub;
    if (
      currentCategoria &&
      maybeCategoriaOrClub.toUpperCase() === currentCategoria.toUpperCase()
    ) {
      club = rest.shift();
    }

    if (!club || rest.length === 0) continue;

    // The last element of `rest` is the total points. Intermediate values
    // correspond to per-prueba details which we ignore for this import.
    const total = parseFloat(rest[rest.length - 1]);

    results.push({
      posicion: parseInt(orden, 10),
      dorsal,
      nombre,
      categoria: currentCategoria,
      club,
      puntos: total
    });
  }

  return results;
}
