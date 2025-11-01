import api, { login } from '../api';
import { useNavigate } from 'react-router-dom';
import getImageUrl from '../utils/getImageUrl';

export default function LoginForm() {
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const res = await login(email, password);

      const { token, usuario, needsClubSelection } = res.data;

      const rawRole = typeof usuario.rol === 'string' ? usuario.rol.trim() : '';
      const normalisedRole = rawRole.toLowerCase();

      sessionStorage.setItem('token', token);

      if (rawRole) {
        sessionStorage.setItem('rol', rawRole);
      } else {
        sessionStorage.removeItem('rol');
      }

      if (usuario.club) {
        sessionStorage.setItem('clubId', usuario.club);
      } else {
        sessionStorage.removeItem('clubId');
        sessionStorage.removeItem('clubLogo');
        sessionStorage.removeItem('clubNombre');
      }

      const foto = getImageUrl(usuario.foto);
      if (foto) {
        sessionStorage.setItem('foto', foto);
      } else {
        sessionStorage.removeItem('foto');
      }

      if (normalisedRole === 'admin') {
        sessionStorage.removeItem('clubLogo');
        sessionStorage.removeItem('clubNombre');
      }

      alert(`Bienvenido ${usuario.nombre}`);
      if (needsClubSelection && normalisedRole !== 'admin') {
        navigate('/seleccionar-club');
      } else {
        navigate('/home');
      }
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al iniciar sesión');
    }
  };

  // Redirect the user to the backend's Google auth endpoint. Using the base
  // URL from our Axios instance avoids hard-coding `localhost` and keeps the
  // frontend portable across environments.
  const handleGoogleLogin = () => {
    const baseUrl = (api.defaults.baseURL || '').replace(/\/+$/, '');
    window.location.href = `${baseUrl}/auth/google`;
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
