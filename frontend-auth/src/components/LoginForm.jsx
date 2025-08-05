import axios from 'axios';

export default function LoginForm() {
  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });

      const { token, usuario } = res.data;

      // Guardamos el token y rol en localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('rol', usuario.rol);
      localStorage.setItem('foto', usuario.foto || '');

      alert(`Bienvenido ${usuario.nombre}`);
      // Podés redirigir según el rol si querés
      window.location.href = '/dashboard';
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al iniciar sesión');
    }
  };

  const handleGoogleLogin = () => {

    window.location.href = 'http://localhost:5000/api/auth/google';
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
