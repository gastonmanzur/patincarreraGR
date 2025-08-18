// Convierte tiempos como mm:ss.ms o hh:mm:ss en milisegundos
export function normalizarTiempo(str) {
  if (!str) return null;
  const partes = str.trim().replace(',', '.').split(':');
  let ms = 0;
  if (partes.length === 3) {
    ms += parseFloat(partes[0]) * 3600 * 1000; // horas
    ms += parseFloat(partes[1]) * 60 * 1000; // minutos
    ms += parseFloat(partes[2]) * 1000; // segundos
  } else if (partes.length === 2) {
    ms += parseFloat(partes[0]) * 60 * 1000;
    ms += parseFloat(partes[1]) * 1000;
  } else {
    ms += parseFloat(partes[0]) * 1000;
  }
  return Math.round(ms);
}

export function normalizarNumero(str) {
  if (str === undefined || str === null) return null;
  return parseFloat(str.toString().replace(',', '.'));
}

export function normalizarNombre(nombre) {
  if (!nombre) return '';
  const partes = nombre.split(',').map((p) => p.trim());
  if (partes.length === 2) {
    return `${startCase(partes[1])} ${startCase(partes[0])}`.trim();
  }
  return startCase(nombre.trim());
}

function startCase(str) {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export function normalizarFila(row, mapping) {
  return {
    posicion: normalizarNumero(row[mapping.posicion]),
    dorsal: row[mapping.dorsal],
    nombre: normalizarNombre(row[mapping.nombre]),
    categoria: row[mapping.categoria],
    club: row[mapping.club],
    tiempoMs: normalizarTiempo(row[mapping.tiempo]),
    puntos: normalizarNumero(row[mapping.puntos])
  };
}
