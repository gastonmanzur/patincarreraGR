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

const getCellNumber = (cell) => {
  const raw = getCellText(cell);
  if (!raw) return null;
  const numeric = Number.parseInt(raw.replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(numeric) ? null : numeric;
};

const parseExcelFile = async (file) => {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new Error('No se encontró ninguna hoja en el archivo.');
  }

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
      fechaNacimiento: getCellText(row.getCell(7)),
      dni: getCellText(row.getCell(8)),
      source: file.name
    });
  });

  return {
    entries,
    club: detectedClub
  };
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
