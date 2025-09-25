import { useEffect, useState } from 'react';
import LogoutButton from '../components/LogoutButton';
import api from '../api';
import getImageUrl from '../utils/getImageUrl';

export default function Dashboard() {
  const [rol, setRol] = useState('');
  const [foto, setFoto] = useState('');
  const [usuario, setUsuario] = useState({});

  useEffect(() => {
    setRol(localStorage.getItem('rol'));
    const storedFoto = getImageUrl(localStorage.getItem('foto'));
    if (storedFoto) {
      localStorage.setItem('foto', storedFoto);
      setFoto(storedFoto);
    } else {
      localStorage.removeItem('foto');
      setFoto('');
    }

    // Podés cargar más info si querés desde el backend
    const cargarDatos = async () => {
      try {
        const res = await api.get('/protegido/usuario');
        const usuarioData = {
          ...res.data.usuario,
          foto: getImageUrl(res.data.usuario?.foto)
        };
        setUsuario(usuarioData);
        if (usuarioData.foto) {
          localStorage.setItem('foto', usuarioData.foto);
          setFoto(usuarioData.foto);
        }
      } catch (err) {
        console.log(err);
      }
    };

    cargarDatos();
  }, []);

  const [nuevaFoto, setNuevaFoto] = useState(null);

  const subirFoto = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('foto', nuevaFoto);

    try {
      const res = await api.post('/protegido/foto-perfil', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('Foto actualizada');
      const nuevaFoto = getImageUrl(res.data.foto);
      if (nuevaFoto) {
        localStorage.setItem('foto', nuevaFoto);
        setFoto(nuevaFoto);
      }
      setNuevaFoto(null);
    } catch (err) {
      console.error(err);
      alert('Error al subir la foto');
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="m-0">Bienvenido al Dashboard</h1>
        <LogoutButton />
      </div>

      <div className="card p-3 mb-4 d-flex flex-row align-items-center gap-3">
        <img
          src={foto || '/default-user.png'}
          alt="Perfil"
          className="rounded-circle"
          width="80"
          height="80"
          style={{ objectFit: 'cover' }}
        />
        <div>
          <p className="mb-1"><strong>Nombre:</strong> {usuario.nombre || 'Usuario'}</p>
          <p className="mb-0"><strong>Rol:</strong> {rol}</p>
        </div>
      </div>

      {/* Formulario para cambiar foto si NO es de Google */}
      {foto && !foto.includes('googleusercontent') && (
        <form onSubmit={subirFoto} className="mb-4">
          <div className="input-group">
            <input
              type="file"
              accept="image/*"
              className="form-control"
              onChange={(e) => setNuevaFoto(e.target.files[0])}
              required
            />
            <button type="submit" className="btn btn-primary">
              Actualizar foto
            </button>
          </div>
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
