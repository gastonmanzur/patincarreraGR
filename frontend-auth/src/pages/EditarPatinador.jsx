import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function EditarPatinador() {
  const { id } = useParams();
  const [mensaje, setMensaje] = useState('');
  const [patinador, setPatinador] = useState(null);
  const [fotoRostro, setFotoRostro] = useState(null);
  const [foto, setFoto] = useState(null);

  useEffect(() => {
    const obtenerPatinador = async () => {
      try {
        const res = await api.get(`/patinadores/${id}`);
        setPatinador(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    obtenerPatinador();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData();
    formData.append('primerNombre', form.primerNombre.value);
    formData.append('segundoNombre', form.segundoNombre.value);
    formData.append('apellido', form.apellido.value);
    formData.append('edad', form.edad.value);
    formData.append('fechaNacimiento', form.fechaNacimiento.value);
    formData.append('dni', form.dni.value);
    formData.append('cuil', form.cuil.value);
    formData.append('direccion', form.direccion.value);
    formData.append('dniMadre', form.dniMadre.value);
    formData.append('dniPadre', form.dniPadre.value);
    formData.append('telefono', form.telefono.value);
    formData.append('sexo', form.sexo.value);
    formData.append('nivel', form.nivel.value);
    formData.append('seguro', form.seguro.value);
    formData.append('numeroCorredor', form.numeroCorredor.value);
    formData.append('categoria', form.categoria.value);
    if (fotoRostro) formData.append('fotoRostro', fotoRostro);
    if (foto) formData.append('foto', foto);

    try {
      await api.put(`/patinadores/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setMensaje('Patinador actualizado correctamente');
    } catch (err) {
      console.error(err);
      setMensaje(
        err.response?.data?.mensaje || 'Error al actualizar el patinador'
      );
    }
  };

  if (!patinador) {
    return <div className="container mt-4">Cargando...</div>;
  }

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Editar Patinador</h1>
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Primer Nombre</label>
            <input
              type="text"
              className="form-control"
              name="primerNombre"
              defaultValue={patinador.primerNombre}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Segundo Nombre</label>
            <input
              type="text"
              className="form-control"
              name="segundoNombre"
              defaultValue={patinador.segundoNombre || ''}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Apellido</label>
            <input
              type="text"
              className="form-control"
              name="apellido"
              defaultValue={patinador.apellido}
              required
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Edad</label>
            <input
              type="number"
              className="form-control"
              name="edad"
              defaultValue={patinador.edad}
              required
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Fecha de Nacimiento</label>
            <input
              type="date"
              className="form-control"
              name="fechaNacimiento"
              defaultValue={patinador.fechaNacimiento?.substring(0, 10)}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">DNI</label>
            <input
              type="text"
              className="form-control"
              name="dni"
              defaultValue={patinador.dni}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">CUIL</label>
            <input
              type="text"
              className="form-control"
              name="cuil"
              defaultValue={patinador.cuil}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Dirección</label>
            <input
              type="text"
              className="form-control"
              name="direccion"
              defaultValue={patinador.direccion}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">DNI Madre</label>
            <input
              type="text"
              className="form-control"
              name="dniMadre"
              defaultValue={patinador.dniMadre}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">DNI Padre</label>
            <input
              type="text"
              className="form-control"
              name="dniPadre"
              defaultValue={patinador.dniPadre}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Teléfono</label>
            <input
              type="text"
              className="form-control"
              name="telefono"
              defaultValue={patinador.telefono}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Sexo</label>
            <select
              className="form-select"
              name="sexo"
              defaultValue={patinador.sexo}
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
              defaultValue={patinador.nivel}
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
            <select
              className="form-select"
              name="seguro"
              defaultValue={patinador.seguro || 'S/S'}
            >
              <option value="S/S">S/S</option>
              <option value="SA">SA</option>
              <option value="SD">SD</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Número de Corredor</label>
            <input
              type="number"
              className="form-control"
              name="numeroCorredor"
              defaultValue={patinador.numeroCorredor}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Categoría</label>
            <input
              type="text"
              className="form-control"
              name="categoria"
              defaultValue={patinador.categoria}
              required
            />
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
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </div>
      </form>
      {mensaje && <div className="alert alert-info mt-3">{mensaje}</div>}
    </div>
  );
}
