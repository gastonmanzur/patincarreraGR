import { useEffect, useState } from 'react';
import LogoutButton from '../components/LogoutButton';
import axios from 'axios';

export default function Dashboard() {
  const [rol, setRol] = useState('');
  const [foto, setFoto] = useState('');
  const [usuario, setUsuario] = useState({});

  const token = localStorage.getItem('token');

  useEffect(() => {
    setRol(localStorage.getItem('rol'));
    setFoto(localStorage.getItem('foto'));

    // Podés cargar más info si querés desde el backend
    const cargarDatos = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/protegido/usuario', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsuario(res.data.usuario);
      } catch (err) {
        console.log(err);
      }
    };

    cargarDatos();
  }, [token]);

  const [nuevaFoto, setNuevaFoto] = useState(null);

  const subirFoto = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('foto', nuevaFoto);

    try {
      const res = await axios.post('http://localhost:5000/api/protegido/foto-perfil', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('Foto actualizada');
      localStorage.setItem('foto', res.data.foto);
      setFoto(res.data.foto);
      setNuevaFoto(null);
    } catch (err) {
      alert('Error al subir la foto');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Bienvenido al Dashboard</h1>
      <LogoutButton />

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '20px 0' }}>
        <img src={foto || '/default-user.png'} alt="Perfil" style={{ width: 80, borderRadius: '50%' }} />
        <div>
          <p><strong>Nombre:</strong> {usuario.nombre || 'Usuario'}</p>
          <p><strong>Rol:</strong> {rol}</p>
        </div>
      </div>

      {/* Formulario para cambiar foto si NO es de Google */}
      {foto && !foto.includes('googleusercontent') && (
        <form onSubmit={subirFoto}>
          <input type="file" accept="image/*" onChange={(e) => setNuevaFoto(e.target.files[0])} required />
          <button type="submit">Actualizar foto</button>
        </form>
      )}

      {rol === 'admin' ? (
        <p>Contenido exclusivo para administradores.</p>
      ) : (
        <p>Contenido exclusivo para usuarios comunes.</p>
      )}
    </div>
  );
}
