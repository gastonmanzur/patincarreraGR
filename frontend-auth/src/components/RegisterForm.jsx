import axios from 'axios';
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
      const res = await axios.post('http://localhost:5000/api/auth/registro', {
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
        <input type="text" name="nombre" placeholder="Nombre" required /><br />
        <input type="text" name="apellido" placeholder="Apellido" required /><br />
        <input type="email" name="email" placeholder="Email" required /><br />
        <input type="password" name="password" placeholder="Contraseña" required /><br />
        <input type="password" name="confirmarPassword" placeholder="Confirmar Contraseña" required /><br />
        <select name="rol" value={rol} onChange={(e) => setRol(e.target.value)} required>
          <option value="">Seleccione un rol</option>
          <option value="delegado">Delegado</option>
          <option value="tecnico">Técnico</option>
          <option value="deportista">Deportista</option>
        </select><br />
        {requiereCodigo && (
          <>
            <input
              type="text"
              name="codigo"
              placeholder="Código especial"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            /><br />
          </>
        )}
        <button type="submit">Registrarse</button>
      </form>
      {mensaje && <p>{mensaje}</p>}
    </div>
  );
}
