// Use default pdf-parse export to ensure built-in configuration
// that avoids "TT: undefined function" font warnings during parsing.
import pdf from 'pdf-parse';

export default async function parseResultadosPdf(buffer) {
  // Parse the entire PDF. Using the packaged parser helps prevent
  // issues with TrueType fonts that previously triggered warnings.
  const data = await pdf(buffer, { max: 0 });
  const lines = data.text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const headerIdx = lines.findIndex(
    (l) => /dorsal/i.test(l) && /puntos/i.test(l)
  );
  if (headerIdx === -1) return [];
  const rows = lines.slice(headerIdx + 1).filter((l) => /^\d+/.test(l));
  return rows
    .map((line) => {
      const parts = line.split(/\s+/);
      if (parts.length < 5) return null;
      const pos = parseInt(parts[0], 10);
      const dorsal = parts[1];
      const puntos = parseFloat(parts[parts.length - 1]);
      const trailing = parts.length > 5 ? 3 : 2;
      const categoria = parts[parts.length - trailing];
      const nombre = parts.slice(2, parts.length - trailing).join(' ');
      return {
        posicion: pos,
        dorsal,
        nombre,
        categoria,
        puntos
      };
    })
    .filter(Boolean);
}
