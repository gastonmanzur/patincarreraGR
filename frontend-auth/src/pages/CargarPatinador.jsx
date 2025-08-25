import { useState } from 'react';
import api from '../api';

export default function CargarPatinador() {
  const [mensaje, setMensaje] = useState('');
  const [fotoRostro, setFotoRostro] = useState(null);
  const [foto, setFoto] = useState(null);

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
      await api.post('/patinadores', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setMensaje('Patinador creado correctamente');
      form.reset();
      setFotoRostro(null);
      setFoto(null);
    } catch (err) {
      console.error(err);
      setMensaje(err.response?.data?.mensaje || 'Error al crear el patinador');
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Cargar Patinador</h1>
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
            <input type="number" className="form-control" name="edad" required />
          </div>
          <div className="col-md-3">
            <label className="form-label">Fecha de Nacimiento</label>
            <input type="date" className="form-control" name="fechaNacimiento" required />
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
            <select className="form-select" name="sexo" required>
              <option value="">Seleccione</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Nivel</label>
            <select className="form-select" name="nivel" required>
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
            <input type="text" className="form-control" name="categoria" required />
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
