import { useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';

const sortEntries = (entries) => {
  return [...entries].sort((a, b) => {
    const clubA = (a.club || '').toString().trim();
    const clubB = (b.club || '').toString().trim();
    const clubCompare = clubA.localeCompare(clubB, 'es', { sensitivity: 'base' });
    if (clubCompare !== 0) return clubCompare;

    const numA = Number.parseInt(a.numeroCorredor, 10);
    const numB = Number.parseInt(b.numeroCorredor, 10);

    const hasNumA = !Number.isNaN(numA);
    const hasNumB = !Number.isNaN(numB);

    if (hasNumA && hasNumB) return numA - numB;
    if (hasNumA) return -1;
    if (hasNumB) return 1;

    return (a.numeroCorredor || '')
      .toString()
      .localeCompare((b.numeroCorredor || '').toString(), 'es', { sensitivity: 'base' });
  });
};

codex/add-crear-padron-section-for-delegates-veonb9
const formatDateValue = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  if (value < 1000) {
    return null;
  }

  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  if (year < 1900 || year > 2100) {
    return null;
  }

  return date.toLocaleDateString('es-AR');
};

const formatPrimitive = (value) => {
  if (value == null) return '';

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? '' : value.toString();
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('es-AR');
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  return null;
};

const getCellText = (cell) => {
  if (cell == null) return '';

  const direct = formatPrimitive(cell);
  if (typeof direct === 'string') {
    return direct;
  }

  if (typeof cell === 'object') {
    if (typeof cell.text === 'string') {
      return cell.text.trim();
    }

    const valueText = formatPrimitive(cell.value);
    if (typeof valueText === 'string') {
      return valueText;
    }

    if (Array.isArray(cell.richText)) {
      return cell.richText.map((item) => item.text).join('').trim();
    }

    if (Array.isArray(cell.value?.richText)) {
      return cell.value.richText.map((item) => item.text).join('').trim();
    }

    if (cell.result != null) {
      const resultText = formatPrimitive(cell.result);
      if (typeof resultText === 'string') {
        return resultText;
      }
      return String(cell.result).trim();
    }

    if (cell.value?.result != null) {
      const resultText = formatPrimitive(cell.value.result);
      if (typeof resultText === 'string') {
        return resultText;
      }
      return String(cell.value.result).trim();
    }
  }

  return '';
};

const normalizeDateOutput = (cellOrValue) => {
  if (cellOrValue == null) {
    return '';
  }

  if (cellOrValue instanceof Date) {
    return cellOrValue.toLocaleDateString('es-AR');
  }

  if (typeof cellOrValue === 'object' && 'value' in cellOrValue) {
    const { value, numFmt } = cellOrValue;

    if (value instanceof Date) {
      return value.toLocaleDateString('es-AR');
    }

    if (typeof value === 'number') {
      if (typeof numFmt === 'string' && /[dmy]/i.test(numFmt)) {
        const maybeDate = formatDateValue(value);
        if (maybeDate) return maybeDate;
      }

      const maybeDate = formatDateValue(value);
      if (maybeDate) return maybeDate;
      return value.toString();
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    return getCellText(value);
  }

  if (typeof cellOrValue === 'number') {
    const maybeDate = formatDateValue(cellOrValue);
    return maybeDate ?? cellOrValue.toString();
  }

  const text = getCellText(cellOrValue);
  if (!text) {
    return '';
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  const genericMatch = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (genericMatch) {
    let [, day, month, year] = genericMatch;
    if (year.length === 2) {
      const numericYear = Number.parseInt(year, 10);
      year = numericYear > 50 ? `19${year}` : `20${year}`;
    }
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  return text;
};


const getCellText = (cell) => {
  if (!cell) return '';
  const { text, value } = cell;
  if (typeof text === 'string' && text.trim() !== '') {
    return text.trim();
  }
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text.trim();
    if (Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join('').trim();
    }
    if (value.result != null) return String(value.result).trim();
  }
  return '';
};

master
const getCellNumber = (cell) => {
  const raw = getCellText(cell);
  if (!raw) return null;
  const numeric = Number.parseInt(raw.replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(numeric) ? null : numeric;
};

 codex/add-crear-padron-section-for-delegates-veonb9
const parseWorksheetRows = (sheet, fileName) => {

const parseExcelFile = async (file) => {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new Error('No se encontró ninguna hoja en el archivo.');
  }

 master
  const entries = [];
  let detectedClub = '';

  sheet.eachRow((row) => {
    const indexValue = getCellNumber(row.getCell(1));
    const nombreCompleto = getCellText(row.getCell(4));

    if (indexValue == null || !nombreCompleto) {
      return;
    }

    const club = getCellText(row.getCell(6));
    if (!detectedClub && club) {
      detectedClub = club;
    }

    entries.push({
      indice: indexValue,
      seguro: getCellText(row.getCell(2)),
      numeroCorredor: getCellText(row.getCell(3)),
      apellidoNombre: nombreCompleto,
      categoria: getCellText(row.getCell(5)),
      club: club || detectedClub,
 codex/add-crear-padron-section-for-delegates-veonb9
      fechaNacimiento: normalizeDateOutput(row.getCell(7)),
      dni: getCellText(row.getCell(8)),
      source: fileName
    });
  });

  return { entries, club: detectedClub };
};

const parseExcelWithExcelJS = async (file) => {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets.find((ws) => ws?.actualRowCount > 0 || ws?.rowCount > 0);

  if (!sheet) {
    const error = new Error('NO_SHEETS_AVAILABLE');
    error.code = 'NO_SHEETS_AVAILABLE';
    throw error;
  }

  return parseWorksheetRows(sheet, file.name);
};

const parseHtmlTableContent = (textContent, fileName) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(textContent, 'text/html');
  const table = doc.querySelector('table');

  if (!table) {
    return null;
  }

  const rows = Array.from(table.querySelectorAll('tr'));
  const entries = [];
  let detectedClub = '';

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td,th')).map((cell) => getCellText(cell.textContent));
    if (cells.length === 0) return;

    const [indice, seguro, numeroCorredor, apellidoNombre, categoria, clubCell, fechaNacimiento, dni] = cells;
    const indexValue = getCellNumber(indice);

    if (indexValue == null || !apellidoNombre) {
      return;
    }

    if (!detectedClub && clubCell) {
      detectedClub = clubCell;
    }

    entries.push({
      indice: indexValue,
      seguro,
      numeroCorredor,
      apellidoNombre,
      categoria,
      club: clubCell || detectedClub,
      fechaNacimiento: normalizeDateOutput(fechaNacimiento),
      dni,
      source: fileName
    });
  });

  if (entries.length === 0) {
    return null;
  }

  return { entries, club: detectedClub };
};

const parsePlainTextContent = (textContent, fileName) => {
  if (!textContent) return null;

  const normalized = textContent.replace(/\r\n/g, '\n');
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return null;
  }

  const delimiterCandidates = ['\t', ';', ','];
  const delimiterScores = delimiterCandidates
    .map((delimiter) => ({
      delimiter,
      score: lines.reduce((acc, line) => (line.includes(delimiter) ? acc + 1 : acc), 0)
    }))
    .sort((a, b) => b.score - a.score);

  const bestDelimiter = delimiterScores[0];
  if (!bestDelimiter || bestDelimiter.score === 0) {
    return null;
  }

  const entries = [];
  let detectedClub = '';

  lines.forEach((line) => {
    const rawCells = line.split(bestDelimiter.delimiter).map((value) => {
      const unquoted = value.replace(/^\s*["']?(.+?)["']?\s*$/, '$1');
      return getCellText(unquoted);
    });

    while (rawCells.length < 8) {
      rawCells.push('');
    }

    const [indice, seguro, numeroCorredor, apellidoNombre, categoria, clubCell, fechaNacimiento, dni] = rawCells;
    const indexValue = getCellNumber(indice);

    if (indexValue == null || !apellidoNombre) {
      return;
    }

    if (!detectedClub && clubCell) {
      detectedClub = clubCell;
    }

    entries.push({
      indice: indexValue,
      seguro,
      numeroCorredor,
      apellidoNombre,
      categoria,
      club: clubCell || detectedClub,
      fechaNacimiento: normalizeDateOutput(fechaNacimiento),
      dni,
      source: fileName
    });
  });

  if (entries.length === 0) {
    return null;
  }

  return { entries, club: detectedClub };
};

const parseExcelFile = async (file) => {
  let excelError = null;

  try {
    return await parseExcelWithExcelJS(file);
  } catch (error) {
    if (error instanceof Error && error.code !== 'NO_SHEETS_AVAILABLE') {
      excelError = new Error('El archivo no tiene un formato de Excel válido o está dañado.');
    } else if (error instanceof Error) {
      excelError = new Error('No se encontraron hojas en el archivo. Verifique que contenga datos.');
    }
  }

  const textContent = await file.text();

  const htmlResult = parseHtmlTableContent(textContent, file.name);
  if (htmlResult) {
    return htmlResult;
  }

  const plainTextResult = parsePlainTextContent(textContent, file.name);
  if (plainTextResult) {
    return plainTextResult;
  }

  if (excelError) {
    throw excelError;
  }

  throw new Error(
    'No se pudieron leer datos de la lista. Verifique que el archivo corresponda a la lista de buena fe exportada desde el sistema.'
  );

      fechaNacimiento: getCellText(row.getCell(7)),
      dni: getCellText(row.getCell(8)),
      source: file.name
    });
  });

  return {
    entries,
    club: detectedClub
  };
 master
};

export default function CrearPadron() {
  const [entries, setEntries] = useState([]);
  const [fileSummaries, setFileSummaries] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const totalPatinadores = useMemo(() => entries.length, [entries]);
  const sortedEntries = useMemo(() => sortEntries(entries), [entries]);

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setProcessing(true);
    setError('');

    const newEntries = [];
    const summaries = [];

    for (const file of files) {
      try {
        const { entries: parsedEntries, club } = await parseExcelFile(file);
        if (parsedEntries.length === 0) {
          summaries.push({
            name: file.name,
            club: club || '',
            count: 0,
            warning: 'No se encontraron patinadores válidos en el archivo.'
          });
        } else {
          summaries.push({
            name: file.name,
            club: club || parsedEntries[0]?.club || '',
            count: parsedEntries.length
          });
          newEntries.push(...parsedEntries);
        }
      } catch (err) {
        console.error(err);
        summaries.push({
          name: file.name,
          club: '',
          count: 0,
          error: err instanceof Error ? err.message : 'Error desconocido al procesar el archivo.'
        });
      }
    }

    setEntries((prev) => [...prev, ...newEntries]);
    setFileSummaries((prev) => [...prev, ...summaries]);
    setProcessing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    setEntries([]);
    setFileSummaries([]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = async () => {
    if (entries.length === 0) {
      setError('Debe importar al menos una lista antes de exportar.');
      return;
    }

    try {
      setError('');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Padrón');

      sheet.columns = [
        { header: '#', key: 'pos', width: 6 },
        { header: 'Club', key: 'club', width: 30 },
        { header: 'Número de Corredor', key: 'numeroCorredor', width: 20 },
        { header: 'Apellido y Nombre', key: 'apellidoNombre', width: 40 },
        { header: 'Categoría', key: 'categoria', width: 20 },
        { header: 'Seguro', key: 'seguro', width: 18 },
        { header: 'Fecha de Nacimiento', key: 'fechaNacimiento', width: 22 },
        { header: 'DNI', key: 'dni', width: 18 },
        { header: 'Archivo de origen', key: 'source', width: 30 }
      ];

      sortedEntries.forEach((entry, index) => {
        sheet.addRow({
          pos: index + 1,
          club: entry.club,
          numeroCorredor: entry.numeroCorredor,
          apellidoNombre: entry.apellidoNombre,
          categoria: entry.categoria,
          seguro: entry.seguro,
          fechaNacimiento: entry.fechaNacimiento,
          dni: entry.dni,
          source: entry.source
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'padron_competencia.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al exportar el padrón.');
    }
  };

  return (
    <div className="container py-4">
      <h1 className="mb-4 text-center">Crear Padrón</h1>
      <p className="text-muted">
        Importe las listas de buena fe de los clubes participantes para generar el padrón de la
        competencia. Los datos se combinarán y ordenarán automáticamente por club y número de corredor.
      </p>

      <div className="card mb-4">
        <div className="card-body">
          <div className="mb-3">
            <label htmlFor="padron-files" className="form-label">
              Seleccione las listas de buena fe en formato Excel
            </label>
            <input
              id="padron-files"
              ref={fileInputRef}
              type="file"
              className="form-control"
              accept=".xlsx,.xls"
              multiple
              onChange={handleFileChange}
              disabled={processing}
            />
            <div className="form-text">
              Puede seleccionar uno o varios archivos a la vez. Se recomienda utilizar las listas
              exportadas desde el sistema.
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-success"
              onClick={handleExport}
              disabled={processing || entries.length === 0}
            >
              Exportar padrón a Excel
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleClear}
              disabled={processing || (entries.length === 0 && fileSummaries.length === 0)}
            >
              Limpiar datos
            </button>
          </div>
          {processing && <div className="alert alert-info mt-3">Procesando archivos...</div>}
          {error && !processing && <div className="alert alert-danger mt-3">{error}</div>}
        </div>
      </div>

      {fileSummaries.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">Archivos procesados</div>
          <div className="card-body">
            <ul className="list-group list-group-flush">
              {fileSummaries.map((summary, index) => (
                <li key={`${summary.name}-${index}`} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                      <strong>{summary.name}</strong>
                      {summary.club && <span className="ms-2 badge bg-primary">{summary.club}</span>}
                    </div>
                    <div>
                      {summary.error ? (
                        <span className="text-danger">{summary.error}</span>
                      ) : summary.warning ? (
                        <span className="text-warning">{summary.warning}</span>
                      ) : (
                        <span className="badge bg-success">{summary.count} patinadores</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">Padrón de competencia</h2>
        <span className="badge bg-secondary">Total: {totalPatinadores}</span>
      </div>

      {entries.length === 0 ? (
        <div className="alert alert-secondary">Todavía no se importaron listas.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Club</th>
                <th scope="col">N° Corredor</th>
                <th scope="col">Apellido y Nombre</th>
                <th scope="col">Categoría</th>
                <th scope="col">Seguro</th>
                <th scope="col">Fecha Nac.</th>
                <th scope="col">DNI</th>
                <th scope="col">Archivo</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, index) => (
                <tr key={`${entry.source}-${index}-${entry.dni}`}> 
                  <th scope="row">{index + 1}</th>
                  <td>{entry.club || '—'}</td>
                  <td>{entry.numeroCorredor || '—'}</td>
                  <td>{entry.apellidoNombre || '—'}</td>
                  <td>{entry.categoria || '—'}</td>
                  <td>{entry.seguro || '—'}</td>
                  <td>{entry.fechaNacimiento || '—'}</td>
                  <td>{entry.dni || '—'}</td>
                  <td>{entry.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
