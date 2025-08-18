import api from '../api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RegisterForm() {
  const [mensaje, setMensaje] = useState('');
  const [rol, setRol] = useState('');
  const [codigo, setCodigo] = useState('');
  const navigate = useNavigate();

  const esPasswordSegura = (pwd) => {
    // Debe tener al menos 8 caracteres, con mayúsculas, minúsculas, números y caracteres especiales
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    return regex.test(pwd);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const nombre = e.target.nombre.value;
    const apellido = e.target.apellido.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmarPassword = e.target.confirmarPassword.value;

    if (!esPasswordSegura(password)) {
      setMensaje('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.');
      return;
    }

      try {
        const res = await api.post('/auth/registro', {
        nombre,
        apellido,
        email,
        password,
        confirmarPassword,
        rol,
        codigo
      });

      setMensaje(res.data.mensaje);

      setTimeout(() => {
        navigate('/');
      }, 3000); // redirige al login en 3 segundos
    } catch (err) {
      setMensaje(err.response?.data?.mensaje || 'Error en el registro');
    }
  };

  const requiereCodigo = rol === 'delegado' || rol === 'tecnico';

  return (
    <div>
      <form onSubmit={handleRegister}>
        <div className="mb-3">
          <label htmlFor="nombre" className="form-label">Nombre</label>
          <input type="text" className="form-control" name="nombre" id="nombre" required />
        </div>
        <div className="mb-3">
          <label htmlFor="apellido" className="form-label">Apellido</label>
          <input type="text" className="form-control" name="apellido" id="apellido" required />
        </div>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">Email</label>
          <input type="email" className="form-control" name="email" id="email" required />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">Contraseña</label>
          <input type="password" className="form-control" name="password" id="password" required />
        </div>
        <div className="mb-3">
          <label htmlFor="confirmarPassword" className="form-label">Confirmar Contraseña</label>
          <input type="password" className="form-control" name="confirmarPassword" id="confirmarPassword" required />
        </div>
        <div className="mb-3">
          <label htmlFor="rol" className="form-label">Rol</label>
          <select
            name="rol"
            id="rol"
            className="form-select"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            required
          >
            <option value="">Seleccione un rol</option>
            <option value="delegado">Delegado</option>
            <option value="tecnico">Técnico</option>
            <option value="deportista">Deportista</option>
          </select>
        </div>
        {requiereCodigo && (
          <div className="mb-3">
            <label htmlFor="codigo" className="form-label">Código especial</label>
            <input
              type="text"
              className="form-control"
              name="codigo"
              id="codigo"
              placeholder="Código especial"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            />
          </div>
        )}
        <div className="d-grid">
          <button type="submit" className="btn btn-primary">Registrarse</button>
        </div>
      </form>
      {mensaje && <div className="alert alert-info mt-3">{mensaje}</div>}
    </div>
  );
}
