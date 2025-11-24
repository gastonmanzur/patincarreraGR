const normaliseComparable = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^0-9a-zA-Z]+/g, ' ')
    .trim()
    .toLowerCase();
};

const areLooselyEqual = (a, b) => {
  if (!a && !b) return true;
  return normaliseComparable(a) === normaliseComparable(b);
};

const isNumeric = (value) => {
  if (value === null || value === undefined) return false;
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  return /^-?\d+(?:[.,]\d+)?$/.test(trimmed);
};

const parseNumeric = (value) => {
  if (!isNumeric(value)) return Number.NaN;
  return Number.parseFloat(String(value).replace(',', '.'));
};

const buildRow = ({
  posicion,
  dorsal,
  nombre,
  categoria,
  club,
  puntos,
  linea,
  raw,
  parser,
  categoriaDetectada = null,
  categoriaInferida = null
}) => ({
  posicion,
  dorsal,
  nombre,
  categoria,
  club,
  puntos,
  linea,
  raw,
  parser,
  categoriaDetectada,
  categoriaInferida
});

const parseColumnsRow = (columns, contexto) => {
  if (columns.length < 4) return null;

  const [ordenRaw, dorsalRaw, nombreRaw, ...rest] = columns;
  const posicion = Number.parseInt(ordenRaw, 10);
  if (Number.isNaN(posicion)) return null;


  const valores = [...rest];
  const dorsal = (() => {
    if (valores.length >= 3) {
      const bloques = [];
      for (let i = 0; i <= valores.length - 3; i += 1) {
        const posibleDorsal = valores[i];
        const posiblePos = valores[i + 1];
        const posiblePuntos = valores[i + 2];
        if (!posibleDorsal) continue;
        if (!isNumeric(posiblePos) || !isNumeric(posiblePuntos)) continue;
        bloques.push({ dorsal: posibleDorsal, index: i });
      }
      if (bloques.length > 0) {
        const preferido = bloques[bloques.length - 1];
        if (preferido) {
          const normalizado = String(preferido.dorsal || '').trim();
          if (normalizado) {
            valores.splice(preferido.index, 3);
            return normalizado;
          }
        }
      }
    }

    return dorsalRaw;
  })();
  const puntosIndex = (() => {
    for (let i = valores.length - 1; i >= 0; i -= 1) {
      if (isNumeric(valores[i])) return i;
    }
    return -1;
  })();

  if (puntosIndex === -1) return null;

  const puntosRaw = valores.splice(puntosIndex, 1)[0];
  const puntos = parseNumeric(puntosRaw);
  if (Number.isNaN(puntos)) return null;

  const categoriaAnterior = contexto.currentCategoria || null;
  let categoria = categoriaAnterior;
  let categoriaDetectada = null;
  let club = '';

  if (!categoria && valores.length > 0) {
    categoria = valores.shift();
    categoriaDetectada = categoria;
  } else if (categoria && valores.length > 0 && areLooselyEqual(valores[0], categoria)) {
    valores.shift();
  } else if (valores.length > 1 && !areLooselyEqual(valores[0], categoria)) {
    categoria = valores.shift();
    categoriaDetectada = categoria;
  }

  if (valores.length > 0) {
    club = valores.shift();
  }

  const categoriaFinal = categoria || null;
  const categoriaInferida = categoriaDetectada ? null : categoriaAnterior;

  if (categoriaFinal) {
    contexto.currentCategoria = categoriaFinal;
    contexto.detectedCategorias.add(categoriaFinal);
  }

  const nombre = nombreRaw;
  if (!nombre) return null;

  return buildRow({
    posicion,
    dorsal,
    nombre,
    categoria: categoriaFinal,
    club,
    puntos,
    linea: contexto.lineaActual,
    raw: contexto.lineaCruda,
    parser: 'columnar',
    categoriaDetectada,
    categoriaInferida
  });
};

const parseCompactRow = (line, contexto) => {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length < 4) return null;

  const posicion = Number.parseInt(tokens.shift(), 10);
  if (Number.isNaN(posicion)) return null;

  const dorsal = tokens.shift();
  const puntosToken = tokens[tokens.length - 1];
  if (!isNumeric(puntosToken)) return null;
  const puntos = parseNumeric(puntosToken);
  if (Number.isNaN(puntos)) return null;
  tokens.pop();

  const categoriaAnterior = contexto.currentCategoria || null;
  let categoria = categoriaAnterior;
  let categoriaDetectada = null;
  let club = '';

  if (!categoria && tokens.length > 1) {
    categoria = tokens.pop();
    categoriaDetectada = categoria;
  }

  if (tokens.length > 1 && !categoria) {
    categoria = tokens.pop();
    categoriaDetectada = categoria;
  }

  const categoriaFinal = categoria || null;
  const categoriaInferida = categoriaDetectada ? null : categoriaAnterior;

  if (tokens.length > 1) {
    club = tokens.pop();
  }

  const nombre = tokens.join(' ');
  if (!nombre) return null;

  if (categoriaFinal) {
    contexto.currentCategoria = categoriaFinal;
    contexto.detectedCategorias.add(categoriaFinal);
  }
  contexto.fallbackRows += 1;

  return buildRow({
    posicion,
    dorsal,
    nombre,
    categoria: categoriaFinal,
    club,
    puntos,
    linea: contexto.lineaActual,
    raw: contexto.lineaCruda,
    parser: 'compact',
    categoriaDetectada,
    categoriaInferida
  });
};

const isHeaderLine = (line) => /\b(orden|puesto|posicion)\b/i.test(line);

export default function parseResultadosJson(json) {
  const sourceLines = Array.isArray(json?.rawLines) && json.rawLines.length > 0 ? json.rawLines : json?.lines || [];
  const filas = [];
  const errores = [];
  const contexto = {
    currentCategoria: null,
    detectedCategorias: new Set(),
    fallbackRows: 0,
    lineaActual: 0,
    lineaCruda: ''
  };

  sourceLines.forEach((rawLine, index) => {
    contexto.lineaActual = index + 1;
    contexto.lineaCruda = typeof rawLine === 'string' ? rawLine.trim() : '';
    const line = (rawLine || '').replace(/\u00a0/g, ' ').trim();
    if (!line) return;

    const categoriaLine = line.match(/^categor[ií]a\s*[:\-]?\s*(.+)$/i);
    if (categoriaLine) {
      const posible = categoriaLine[1]?.trim();
      if (posible && !/orden\b/i.test(posible)) {
        contexto.currentCategoria = posible.replace(/\s{2,}.*/, '').trim();
        if (contexto.currentCategoria) contexto.detectedCategorias.add(contexto.currentCategoria);
      }
      return;
    }

    const headerMatch = line.match(/orden.*categor[ií]a\s+([^\s].*?)\s+club/i);
    if (headerMatch) {
      const posible = headerMatch[1]?.trim();
      if (posible && !/orden\b/i.test(posible)) {
        contexto.currentCategoria = posible;
        contexto.detectedCategorias.add(posible);
      }
      return;
    }

    if (!/^\d+/.test(line) || isHeaderLine(line)) return;

    const columns = (rawLine || '')
      .split(/\s{2,}|\t+/)
      .map((c) => c.trim())
      .filter(Boolean);

    let fila = parseColumnsRow(columns, contexto);
    if (!fila) {
      fila = parseCompactRow(line, contexto);
    }

    if (!fila) {
      errores.push({
        linea: contexto.lineaActual,
        razon: 'Formato de fila no reconocido',
        raw: contexto.lineaCruda
      });
      return;
    }

    if (!fila.categoria) {
      errores.push({
        linea: contexto.lineaActual,
        razon: 'Categoría no detectada',
        raw: contexto.lineaCruda
      });
    }

    if (Number.isNaN(fila.puntos)) {
      errores.push({
        linea: contexto.lineaActual,
        razon: 'Puntaje inválido',
        raw: contexto.lineaCruda
      });
      return;
    }

    filas.push(fila);
  });

  return {
    filas,
    errores,
    metadata: {
      categoriasDetectadas: Array.from(contexto.detectedCategorias),
      lineasProcesadas: sourceLines.length,
      filasValidas: filas.length,
      filasDescartadas: errores.length,
      filasConFallback: contexto.fallbackRows,
      filasSinCategoria: filas.filter((fila) => !fila.categoria).length
    }
  };
}
