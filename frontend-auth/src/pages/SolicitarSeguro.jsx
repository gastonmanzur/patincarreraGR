import { useEffect, useState } from 'react';
import ExcelJS from 'exceljs';
import api from '../api';

export default function SolicitarSeguro() {
  const [patinadores, setPatinadores] = useState([]);
  const [seleccion, setSeleccion] = useState('');
  const [lista, setLista] = useState([]);
  const [delegado, setDelegado] = useState({ nombre: '', apellido: '', dni: '' });

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

  const agregarPatinador = () => {
    if (!seleccion) return;
    const pat = patinadores.find((p) => p._id === seleccion);
    if (!pat) return;
    if (lista.some((i) => i._id === pat._id)) return;
    setLista([
      ...lista,
      {
        _id: pat._id,
        tipo: 'Deportista',
        nombre: pat.primerNombre,
        apellido: pat.apellido,
        dni: pat.dni
      }
    ]);
    setSeleccion('');
  };

  const agregarDelegado = (e) => {
    e.preventDefault();
    if (!delegado.nombre || !delegado.apellido || !delegado.dni) return;
    setLista([
      ...lista,
      {
        _id: Date.now().toString(),
        tipo: 'Delegado',
        nombre: delegado.nombre,
        apellido: delegado.apellido,
        dni: delegado.dni
      }
    ]);
    setDelegado({ nombre: '', apellido: '', dni: '' });
  };

  const exportar = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Seguros');
      sheet.addRow(['Tipo', 'Nombre', 'Apellido', 'DNI']);
      lista.forEach((item) => {
        sheet.addRow([item.tipo, item.nombre, item.apellido, item.dni]);
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
              placeholder="Nombre"
              value={delegado.nombre}
              onChange={(e) =>
                setDelegado({ ...delegado, nombre: e.target.value })
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
                <th>Tipo</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>DNI</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((item) => (
                <tr key={item._id}>
                  <td>{item.tipo}</td>
                  <td>{item.nombre}</td>
                  <td>{item.apellido}</td>
                  <td>{item.dni}</td>
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

