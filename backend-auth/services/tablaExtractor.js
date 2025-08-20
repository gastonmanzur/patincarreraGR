// Utilidades para extraer tablas de un PDF en formato texto

// Tabla de sinónimos para las columnas
export const SINONIMOS = {
  // Posición dentro de la competencia (a veces abreviado como "pos")
  posicion: ['puesto', 'posicion', 'rank', 'pos', 'orden'],
  // Número de atleta o dorsal
  dorsal: ['nº', 'numero', 'n°', 'bib', 'nro', 'nro atleta'],
  // Nombre completo del deportista
  nombre: [
    'apellido y nombre',
    'apellido y nombres',
    'apellidos y nombres',
    'apellido y nobres',
    'apellidos y nobres',
    'nombre'
  ],
  categoria: ['categoria', 'cat', 'division', 'div'],
  club: ['club', 'equipo', 'institucion'],
  tiempo: ['tiempo', 'tiempo oficial'],
  // Puntos obtenidos (ptos, pts, score)
  puntos: ['puntos', 'pts', 'score', 'ptos', 'ptos total', 'puntos total', 'pts total']
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
        if (campo === 'puntos' || !(campo in mapping)) {
          mapping[campo] = idx;
        }
      }
    }
  });
  return mapping;
}

// Extrae una tabla simple de texto usando separadores de `|` o, si no existen,
// columnas separadas por dos o más espacios. Esto preserva los valores que
// contienen espacios internos como "Apellido y nombres".
export function extractTableFromText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const usesPipe = lines[0].includes('|');
  const splitLine = (line) =>
    usesPipe
      ? line.split('|').map((c) => c.trim())
      : line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(splitLine).filter((r) => r.some(Boolean));
  return { headers, rows };
}
