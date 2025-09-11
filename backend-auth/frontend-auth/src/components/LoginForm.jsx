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
      <input type="email" name="email" placeholder="Email" required /><br />
      <input type="password" name="password" placeholder="Contraseña" required /><br />
      <button type="submit">Iniciar sesión</button>
      <hr />
      <button type="button" onClick={handleGoogleLogin}>Ingresar con Google</button>
    </form>
  );
}
