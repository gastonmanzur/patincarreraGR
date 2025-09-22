import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import { useState } from 'react';

export default function Auth() {
  const [mostrarRegistro, setMostrarRegistro] = useState(false);

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6">
          <h1 className="text-center mb-4">
            {mostrarRegistro ? 'Registrarse' : 'Iniciar sesión'}
          </h1>
          <div className="card p-4">
            {mostrarRegistro ? <RegisterForm /> : <LoginForm />}
          </div>
          <div className="text-center mt-3">
            <button
              className="btn btn-link"
              onClick={() => setMostrarRegistro(!mostrarRegistro)}
            >
              {mostrarRegistro
                ? '¿Ya tenés cuenta? Iniciar sesión'
                : '¿No tenés cuenta? Registrate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
