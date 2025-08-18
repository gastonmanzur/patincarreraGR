// Utilidades para extraer tablas de un PDF en formato texto

// Tabla de sinónimos para las columnas
export const SINONIMOS = {
  posicion: ['puesto', 'posicion', 'rank'],
  dorsal: ['nº', 'numero', 'n°', 'bib'],
  nombre: ['apellido y nombre', 'nombre'],
  categoria: ['categoria', 'cat', 'division', 'div'],
  club: ['club', 'equipo', 'institucion'],
  tiempo: ['tiempo', 'tiempo oficial'],
  puntos: ['puntos', 'pts', 'score']
};

const normalizar = (str = '') =>
  str
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

// Detecta las columnas a partir de la fila de encabezados
export function mapHeaders(headerRow = []) {
  const mapping = {};
  headerRow.forEach((col, idx) => {
    const limpio = normalizar(col);
    for (const [campo, sinonimos] of Object.entries(SINONIMOS)) {
      if (limpio === campo || sinonimos.includes(limpio)) {
        mapping[campo] = idx;
      }
    }
  });
  return mapping;
}

// Extrae una tabla simple de texto usando separadores de | o espacios múltiples
export function extractTableFromText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const delimiter = lines[0].includes('|') ? '|' : ' ';
  const splitLine = (line) => line.split(delimiter).map((c) => c.trim());
  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(splitLine).filter((r) => r.some(Boolean));
  return { headers, rows };
}
