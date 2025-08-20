import pdf from 'pdf-parse/lib/pdf-parse.js';

function tiempoTextoAMs(t) {
  const match = t.match(/(?:(\d+):)?(\d{1,2})(?:\.(\d{1,3}))?/);
  if (!match) return null;
  const min = parseInt(match[1] || '0', 10);
  const sec = parseInt(match[2] || '0', 10);
  const ms = parseInt((match[3] || '').padEnd(3, '0'), 10);
  return (min * 60 + sec) * 1000 + ms;
}

export default async function parseResultadosPdf(buffer) {
  const data = await pdf(buffer);
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
      const tiempoStr = parts[parts.length - 2];
      const categoria = parts[parts.length - 3];
      const nombre = parts.slice(2, parts.length - 3).join(' ');
      return {
        posicion: pos,
        dorsal,
        nombre,
        categoria,
        tiempoMs: tiempoTextoAMs(tiempoStr),
        puntos
      };
    })
    .filter(Boolean);
}
