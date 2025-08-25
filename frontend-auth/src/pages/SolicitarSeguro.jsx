import { useEffect, useState } from 'react';
import ExcelJS from 'exceljs';
import api from '../api';

export default function SolicitarSeguro() {
  const [patinadores, setPatinadores] = useState([]);
  const [seleccion, setSeleccion] = useState('');
  const [tipoSeguroPatinador, setTipoSeguroPatinador] = useState('');
  const [lista, setLista] = useState([]);
  const [delegado, setDelegado] = useState({
    nombres: '',
    apellido: '',
    dni: '',
    cuil: '',
    fechaNacimiento: '',
    sexo: '',
    domicilio: '',
    telefono: '',
    tipoSeguro: ''
  });

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get('/patinadores');
        setPatinadores(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    cargar();
  }, []);

  const agregarPatinador = async () => {
    if (!seleccion || !tipoSeguroPatinador) return;
    const pat = patinadores.find((p) => p._id === seleccion);
    if (!pat) return;
    if (lista.some((i) => i._id === pat._id)) return;
    try {
      const { data } = await api.post(`/patinadores/${pat._id}/seguro`, {
        tipo: tipoSeguroPatinador
      });
      setPatinadores((prev) =>
        prev.map((p) => (p._id === data._id ? data : p))
      );
      setLista([
        ...lista,
        {
          _id: data._id,
          dni: data.dni,
          cuil: data.cuil,
          apellido: data.apellido,
          nombres: `${data.primerNombre}${data.segundoNombre ? ' ' + data.segundoNombre : ''}`,
          fechaNacimiento: new Date(data.fechaNacimiento)
            .toISOString()
            .split('T')[0],
          sexo: data.sexo,
          nacionalidad: 'Argentina',
          club: 'General Rodriguez',
          funcion: 'Patinador',
          domicilio: data.direccion,
          codigoPostal: '1748',
          localidad: 'General Rodriguez',
          provincia: 'BS. AS',
          telefono: data.telefono,
          tipoSeguro: tipoSeguroPatinador
        }
      ]);
      setSeleccion('');
      setTipoSeguroPatinador('');
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al solicitar seguro');
    }
  };

  const agregarDelegado = (e) => {
    e.preventDefault();
    const {
      nombres,
      apellido,
      dni,
      cuil,
      fechaNacimiento,
      sexo,
      domicilio,
      telefono,
      tipoSeguro
    } = delegado;
    if (
      !nombres ||
      !apellido ||
      !dni ||
      !cuil ||
      !fechaNacimiento ||
      !sexo ||
      !domicilio ||
      !telefono ||
      !tipoSeguro
    )
      return;
    setLista([
      ...lista,
      {
        _id: Date.now().toString(),
        dni,
        cuil,
        apellido,
        nombres,
        fechaNacimiento,
        sexo,
        nacionalidad: 'Argentina',
        club: 'General Rodriguez',
        funcion: 'Delegado',
        domicilio,
        codigoPostal: '1748',
        localidad: 'General Rodriguez',
        provincia: 'BS. AS',
        telefono,
        tipoSeguro
      }
    ]);
    setDelegado({
      nombres: '',
      apellido: '',
      dni: '',
      cuil: '',
      fechaNacimiento: '',
      sexo: '',
      domicilio: '',
      telefono: '',
      tipoSeguro: ''
    });
  };

  const exportar = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Seguros');
      sheet.addRow([]);

      sheet.mergeCells('A2:F2');
      const a2 = sheet.getCell('A2');
      a2.value = 'NO COMPLETAR ESTAS COLUMNAS';
      a2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
      a2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      a2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };

      sheet.mergeCells('G2:K2');
      const g2 = sheet.getCell('G2');
      g2.value =
        'COMPLETAR CON TODOS LOS APELLIDOS Y NOMBRES COMO FIGURAN EN EL DNI';
      g2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
      g2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      g2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } };

      sheet.mergeCells('L2:O2');
      const l2 = sheet.getCell('L2');
      l2.value =
        'SEXO IDENTIFICAR SOLO CON NUMEROS               (1 MASCULINO) - (2 FEMENINO)';
      l2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
      l2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      l2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };

      sheet.mergeCells('P2:T2');
      const p2 = sheet.getCell('P2');
      p2.value =
        'COMPLETAR CON TODOS LOS APELLIDOS Y NOMBRES COMO FIGURAN EN EL DNI';
      p2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
      p2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      p2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

      const u2 = sheet.getCell('U2');
      u2.value = 'SEG. ANUAL O               LIC.  PROMOCIONAL O LIC. NACIONAL';
      u2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
      u2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      u2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };

      sheet.getRow(2).height = 43.2;

      const headerRow = sheet.getRow(3);
      headerRow.values = [
        'seguro',
        'CAP',
        'FA',
        'DNI',
        'FM',
        'Legajo',
        'DNI',
        'CUIL',
        'APELLIDO/S',
        'NOMBRES',
        'F. Nac',
        'Sexo',
        'Nacionalidad',
        'Club',
        'Función',
        'Domicilio',
        'CP',
        'Localidad',
        'Provincia',
        'Teléfono',
        'Tipo Lic. O Seg.'
      ];
      headerRow.eachCell((cell, col) => {
        cell.font = { name: 'Arial', size: 11, bold: true };
        if (col === 6) {
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFF0000' } };
        }
        if (col >= 7) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' }
          };
        }
      });
      const widths = [
        2.89,
        2.89,
        2.89,
        2.89,
        2.89,
        2.89,
        11.22,
        13.89,
        23.67,
        34.89,
        11.78,
        6.22,
        12.67,
        18.22,
        10.33,
        23,
        7.56,
        15.89,
        14.67,
        13.11,
        18.67
      ];
      widths.forEach((w, i) => {
        sheet.getColumn(i + 1).width = w;
      });

      sheet.getColumn(11).numFmt = 'dd/mm/yyyy';

      lista.forEach((item) => {
        sheet.addRow([
          '',
          '',
          '',
          '',
          '',
          '',
          item.dni,
          item.cuil,
          item.apellido,
          item.nombres,
          new Date(item.fechaNacimiento),
          item.sexo === 'M' ? 1 : 2,
          item.nacionalidad,
          item.club,
          item.funcion,
          item.domicilio,
          item.codigoPostal,
          item.localidad,
          item.provincia,
          item.telefono,
          item.tipoSeguro
        ]);
      });

      sheet.eachRow({ includeEmpty: true }, (row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'seguros.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error al exportar');
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Solicitar Seguro</h1>
        <div className="mb-4">
          <h5>Deportista</h5>
          <div className="d-flex gap-2">
            <select
              className="form-select"
              value={seleccion}
              onChange={(e) => setSeleccion(e.target.value)}
            >
              <option value="">Seleccione un patinador</option>
              {patinadores.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.apellido} {p.primerNombre}
                </option>
              ))}
            </select>
            <select
              className="form-select w-auto"
              value={tipoSeguroPatinador}
              onChange={(e) => setTipoSeguroPatinador(e.target.value)}
            >
              <option value="">Tipo de seguro</option>
              <option value="SA">SA</option>
              <option value="SD">SD</option>
            </select>
            <button className="btn btn-primary" onClick={agregarPatinador}>
              Agregar
            </button>
          </div>
        </div>
        <div className="mb-4">
          <h5>Delegado</h5>
          <form className="row g-2" onSubmit={agregarDelegado}>
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Nombre y segundo nombre"
                value={delegado.nombres}
                onChange={(e) =>
                  setDelegado({ ...delegado, nombres: e.target.value })
                }
              />
            </div>
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Apellido"
                value={delegado.apellido}
                onChange={(e) =>
                  setDelegado({ ...delegado, apellido: e.target.value })
                }
              />
            </div>
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="DNI"
                value={delegado.dni}
                onChange={(e) => setDelegado({ ...delegado, dni: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="CUIL"
                value={delegado.cuil}
                onChange={(e) => setDelegado({ ...delegado, cuil: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <input
                type="date"
                className="form-control"
                value={delegado.fechaNacimiento}
                onChange={(e) =>
                  setDelegado({ ...delegado, fechaNacimiento: e.target.value })
                }
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={delegado.sexo}
                onChange={(e) => setDelegado({ ...delegado, sexo: e.target.value })}
              >
                <option value="">Sexo</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Domicilio"
                value={delegado.domicilio}
                onChange={(e) =>
                  setDelegado({ ...delegado, domicilio: e.target.value })
                }
              />
            </div>
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Teléfono"
                value={delegado.telefono}
                onChange={(e) =>
                  setDelegado({ ...delegado, telefono: e.target.value })
                }
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={delegado.tipoSeguro}
                onChange={(e) =>
                  setDelegado({ ...delegado, tipoSeguro: e.target.value })
                }
              >
                <option value="">Tipo de seguro</option>
                <option value="SA">SA</option>
                <option value="SD">SD</option>
              </select>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary mt-2">
                Agregar
              </button>
            </div>
          </form>
        </div>
        {lista.length > 0 && (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>DNI</th>
                  <th>Apellido</th>
                  <th>Nombres</th>
                  <th>Función</th>
                  <th>Tipo de seguro</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((item) => (
                  <tr key={item._id}>
                    <td>{item.dni}</td>
                    <td>{item.apellido}</td>
                    <td>{item.nombres}</td>
                    <td>{item.funcion}</td>
                    <td>{item.tipoSeguro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn btn-success" onClick={exportar}>
              Exportar a Excel
            </button>
          </>
        )}
    </div>
  );
}

