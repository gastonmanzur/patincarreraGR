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

  const agregarPatinador = () => {
    if (!seleccion || !tipoSeguroPatinador) return;
    const pat = patinadores.find((p) => p._id === seleccion);
    if (!pat) return;
    if (lista.some((i) => i._id === pat._id)) return;
    setLista([
      ...lista,
      {
        _id: pat._id,
        dni: pat.dni,
        cuil: pat.cuil,
        apellido: pat.apellido,
        nombres: `${pat.primerNombre}${pat.segundoNombre ? ' ' + pat.segundoNombre : ''}`,
        fechaNacimiento: new Date(pat.fechaNacimiento).toISOString().split('T')[0],
        sexo: pat.sexo,
        nacionalidad: 'Argentina',
        club: 'General Rodriguez',
        funcion: 'Patinador',
        domicilio: pat.direccion,
        codigoPostal: '1748',
        localidad: 'General Rodriguez',
        provincia: 'BS. AS',
        telefono: pat.telefono,
        tipoSeguro: tipoSeguroPatinador
      }
    ]);
    setSeleccion('');
    setTipoSeguroPatinador('');
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
      sheet.addRow([
        'DNI',
        'CUIL',
        'Apellido',
        'Nombres',
        'Fecha de nacimiento',
        'Sexo',
        'Nacionalidad',
        'Club',
        'Funcion',
        'Domicilio',
        'Codigo postal',
        'Localidad',
        'Provincia',
        'Telefono',
        'Tipo de seguro'
      ]);
      lista.forEach((item) => {
        sheet.addRow([
          item.dni,
          item.cuil,
          item.apellido,
          item.nombres,
          item.fechaNacimiento,
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

