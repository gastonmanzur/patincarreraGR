import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RegisterForm() {
  const [mensaje, setMensaje] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    const nombre = e.target.nombre.value;
    const apellido = e.target.apellido.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmarPassword = e.target.confirmarPassword.value;

    try {
      const res = await axios.post('http://localhost:5000/api/auth/registro', {
        nombre,
        apellido,
        email,
        password,
        confirmarPassword
      });

      setMensaje(res.data.mensaje);

      setTimeout(() => {
        navigate('/');
      }, 3000); // redirige al login en 3 segundos
    } catch (err) {
      setMensaje(err.response?.data?.mensaje || 'Error en el registro');
    }
  };

  return (
    <div>
      <form onSubmit={handleRegister}>
        <input type="text" name="nombre" placeholder="Nombre" required /><br />
        <input type="text" name="apellido" placeholder="Apellido" required /><br />
        <input type="email" name="email" placeholder="Email" required /><br />
        <input type="password" name="password" placeholder="Contraseña" required /><br />
        <input type="password" name="confirmarPassword" placeholder="Confirmar Contraseña" required /><br />
        <button type="submit">Registrarse</button>
      </form>
      {mensaje && <p>{mensaje}</p>}
    </div>
  );
}
