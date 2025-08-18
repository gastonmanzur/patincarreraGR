import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function LoginForm() {
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

      try {
        const res = await api.post('/auth/login', { email, password });

      const { token, usuario } = res.data;

      // Guardamos el token y rol en localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('rol', usuario.rol);
      localStorage.setItem('foto', usuario.foto || '');

      alert(`Bienvenido ${usuario.nombre}`);
      // Redirigir a la página de noticias
      navigate('/home');
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al iniciar sesión');
    }
  };

  // Redirect the user to the backend's Google auth endpoint. Using the base
  // URL from our Axios instance avoids hard-coding `localhost` and keeps the
  // frontend portable across environments.
  const handleGoogleLogin = () => {
    window.location.href = `${api.defaults.baseURL}/auth/google`;
  };

  return (
    <form onSubmit={handleLogin}>
      <div className="mb-3">
        <label htmlFor="email" className="form-label">Email</label>
        <input type="email" className="form-control" name="email" id="email" required />
      </div>
      <div className="mb-3">
        <label htmlFor="password" className="form-label">Contraseña</label>
        <input type="password" className="form-control" name="password" id="password" required />
      </div>
      <div className="d-grid gap-2">
        <button type="submit" className="btn btn-primary">Iniciar sesión</button>
        <button type="button" className="btn btn-outline-danger" onClick={handleGoogleLogin}>Ingresar con Google</button>
      </div>
    </form>
  );
}
