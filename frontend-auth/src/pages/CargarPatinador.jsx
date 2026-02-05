import { useEffect, useState } from 'react';
import api from '../api';

export default function CargarPatinador() {
  const [mensaje, setMensaje] = useState('');
  const [fotoRostro, setFotoRostro] = useState(null);
  const [foto, setFoto] = useState(null);
  const [categoriasPorEdadEdades, setCategoriasPorEdadEdades] = useState([]);
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState('');
  const [nivel, setNivel] = useState('');
  const [edad, setEdad] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categoriaError, setCategoriaError] = useState('');

  const calcularEdad = (fecha) => {
    if (!fecha) return '';
    const nacimiento = new Date(fecha);
    if (Number.isNaN(nacimiento.getTime())) return '';
    const hoy = new Date();
    let edadCalculada = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edadCalculada -= 1;
    }
    return edadCalculada >= 0 ? edadCalculada : '';
  };

  const nivelToCodigo = (nivelValue) => {
    const mapping = {
      Escuela: 'E',
      Transicion: 'T',
      Intermedia: 'I',
      Federados: 'F'
    };
    return mapping[nivelValue] || '';
  };

  const sexoToCodigo = (sexoValue) => {
    if (sexoValue === 'M') return 'V';
    if (sexoValue === 'F') return 'D';
    return '';
  };

  const matchesCategoriaSexo = (categoriaValue, sexoCodigo) => {
    if (!categoriaValue || !sexoCodigo) return false;
    const esM7 = categoriaValue.startsWith('M7');
    const index = esM7 ? 2 : 1;
    const sexoChar = categoriaValue[index];
    if (!sexoChar || !['V', 'D'].includes(sexoChar)) return false;
    return sexoChar === sexoCodigo;
  };

  const matchesCategoriaNivel = (categoriaValue, nivelCodigo) => {
    if (!categoriaValue || !nivelCodigo) return false;
    const lastChar = categoriaValue[categoriaValue.length - 1];
    if (!['E', 'T', 'I', 'F'].includes(lastChar)) return false;
    return lastChar === nivelCodigo;
  };

  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const res = await api.get('/public/app-config');
        const categoriasEdades = Array.isArray(res.data?.categoriasPorEdadEdades)
          ? res.data.categoriasPorEdadEdades
          : [];
        setCategoriasPorEdadEdades(categoriasEdades);
      } catch (err) {
        console.error('Error al cargar las categorías por edad', err);
      }
    };

    void cargarCategorias();
  }, []);

  useEffect(() => {
    const nuevaEdad = calcularEdad(fechaNacimiento);
    setEdad(nuevaEdad);
  }, [fechaNacimiento]);

  useEffect(() => {
    const fecha = new Date(fechaNacimiento);
    if (Number.isNaN(fecha.getTime()) || !sexo || !nivel) {
      setCategoria('');
      setCategoriaError('');
      return;
    }

    const anioNacimiento = fecha.getFullYear();
    const sexoCodigo = sexoToCodigo(sexo);
    const nivelCodigo = nivelToCodigo(nivel);
    if (!sexoCodigo || !nivelCodigo) {
      setCategoria('');
      setCategoriaError('');
      return;
    }

    if (edad >= 18) {
      const categoriasMayores = ['MDE', 'MVE', 'MDI', 'MVI', 'MDF', 'MVF'];
      const categoriaMayor = `M${sexoCodigo}${nivelCodigo}`;
      const categoriaMayorValida = categoriasMayores.includes(categoriaMayor) ? categoriaMayor : '';
      setCategoria(categoriaMayorValida);
      setCategoriaError(categoriaMayorValida ? '' : 'No se encontró una categoría con el año de nacimiento, sexo y nivel seleccionados.');
      return;
    }

    const candidatas = (categoriasPorEdadEdades || []).filter((item) =>
      Array.isArray(item.aniosNacimiento) && item.aniosNacimiento.includes(anioNacimiento)
    );
    const categoriaFiltrada = candidatas
      .map((item) => item.categoria)
      .find(
        (categoriaItem) =>
          matchesCategoriaSexo(categoriaItem, sexoCodigo)
          && matchesCategoriaNivel(categoriaItem, nivelCodigo)
      ) || '';

    setCategoria(categoriaFiltrada);
    if (!categoriaFiltrada) {
      setCategoriaError('No se encontró una categoría con el año de nacimiento, sexo y nivel seleccionados.');
    } else {
      setCategoriaError('');
    }
  }, [fechaNacimiento, edad, sexo, nivel, categoriasPorEdadEdades]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!edad || !categoria) {
      setMensaje('Complete fecha de nacimiento, sexo y nivel para calcular categoría.');
      return;
    }
    const formData = new FormData();
    formData.append('primerNombre', form.primerNombre.value);
    formData.append('segundoNombre', form.segundoNombre.value);
    formData.append('apellido', form.apellido.value);
    formData.append('edad', edad);
    formData.append('fechaNacimiento', fechaNacimiento);
    formData.append('dni', form.dni.value);
    formData.append('cuil', form.cuil.value);
    formData.append('direccion', form.direccion.value);
    formData.append('dniMadre', form.dniMadre.value);
    formData.append('dniPadre', form.dniPadre.value);
    formData.append('telefono', form.telefono.value);
    formData.append('sexo', sexo);
    formData.append('nivel', nivel);
    formData.append('seguro', form.seguro.value);
    formData.append('numeroCorredor', form.numeroCorredor.value);
    formData.append('categoria', categoria);
    if (fotoRostro) formData.append('fotoRostro', fotoRostro);
    if (foto) formData.append('foto', foto);

    try {
      await api.post('/patinadores', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setMensaje('Patinador creado correctamente');
      form.reset();
      setFotoRostro(null);
      setFoto(null);
      setFechaNacimiento('');
      setSexo('');
      setNivel('');
      setEdad('');
      setCategoria('');
      setCategoriaError('');
    } catch (err) {
      console.error(err);
      setMensaje(err.response?.data?.mensaje || 'Error al crear el patinador');
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4 text-center">Cargar Patinador</h1>
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Primer Nombre</label>
            <input type="text" className="form-control" name="primerNombre" required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Segundo Nombre</label>
            <input type="text" className="form-control" name="segundoNombre" />
          </div>
          <div className="col-md-6">
            <label className="form-label">Apellido</label>
            <input type="text" className="form-control" name="apellido" required />
          </div>
          <div className="col-md-3">
            <label className="form-label">Edad</label>
            <input type="number" className="form-control" name="edad" value={edad} readOnly required />
          </div>
          <div className="col-md-3">
            <label className="form-label">Fecha de Nacimiento</label>
            <input
              type="date"
              className="form-control"
              name="fechaNacimiento"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">DNI</label>
            <input type="text" className="form-control" name="dni" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">CUIL</label>
            <input type="text" className="form-control" name="cuil" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Dirección</label>
            <input type="text" className="form-control" name="direccion" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">DNI Madre</label>
            <input type="text" className="form-control" name="dniMadre" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">DNI Padre</label>
            <input type="text" className="form-control" name="dniPadre" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Teléfono</label>
            <input type="text" className="form-control" name="telefono" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Sexo</label>
            <select
              className="form-select"
              name="sexo"
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
              required
            >
              <option value="">Seleccione</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Nivel</label>
            <select
              className="form-select"
              name="nivel"
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              required
            >
              <option value="">Seleccione</option>
              <option value="Escuela">Escuela</option>
              <option value="Transicion">Transición</option>
              <option value="Intermedia">Intermedia</option>
              <option value="Federados">Federados</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Seguro</label>
            <select className="form-select" name="seguro" defaultValue="S/S">
              <option value="S/S">S/S</option>
              <option value="SA">SA</option>
              <option value="SD">SD</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Número de Corredor</label>
            <input type="number" className="form-control" name="numeroCorredor" required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Categoría</label>
            <input
              type="text"
              className={`form-control${categoriaError ? ' is-invalid' : ''}`}
              name="categoria"
              value={categoria}
              readOnly
              required
            />
            {categoriaError && <div className="invalid-feedback">{categoriaError}</div>}
          </div>
          <div className="col-md-6">
            <label className="form-label">Foto Rostro</label>
            <input
              type="file"
              className="form-control"
              accept="image/*"
              onChange={(e) => setFotoRostro(e.target.files[0])}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Foto Completa</label>
            <input
              type="file"
              className="form-control"
              accept="image/*"
              onChange={(e) => setFoto(e.target.files[0])}
            />
          </div>
        </div>
        <div className="mt-4">
          <button type="submit" className="btn btn-primary">Guardar</button>
        </div>
      </form>
      {mensaje && <div className="alert alert-info mt-3">{mensaje}</div>}
    </div>
  );
}
