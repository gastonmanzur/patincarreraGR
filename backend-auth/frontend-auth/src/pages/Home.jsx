import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import { useState } from 'react';

export default function Home() {
  const [mostrarRegistro, setMostrarRegistro] = useState(false);

  return (
    <div style={{ padding: 20 }}>
      <h1>{mostrarRegistro ? 'Registrarse' : 'Iniciar sesión'}</h1>
      {mostrarRegistro ? <RegisterForm /> : <LoginForm />}
      <button onClick={() => setMostrarRegistro(!mostrarRegistro)}>
        {mostrarRegistro ? '¿Ya tenés cuenta? Iniciar sesión' : '¿No tenés cuenta? Registrate'}
      </button>
    </div>
  );
}
