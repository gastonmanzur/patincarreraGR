import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import getImageUrl from '../utils/getImageUrl';

export default function SelectClub() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [clubId, setClubId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const cargarClubs = async () => {
      try {
        const res = await api.get('/public/clubs');
        const data = Array.isArray(res.data)
          ? res.data.map((club) => ({
              ...club,
              logo: getImageUrl(club.logo)
            }))
          : [];
        setClubs(data);
      } catch (err) {
        console.error('Error al obtener clubes', err);
        setMensaje('No se pudieron cargar los clubes disponibles.');
      }
    };

    cargarClubs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clubId) {
      setMensaje('Seleccioná un club para continuar.');
      return;
    }

    setCargando(true);
    try {
      const res = await api.post('/users/club', { clubId });
      const { token, usuario } = res.data;

      sessionStorage.setItem('token', token);
      sessionStorage.setItem('rol', usuario.rol);
      sessionStorage.setItem('clubId', usuario.club);

      const foto = getImageUrl(usuario.foto);
      if (foto) {
        sessionStorage.setItem('foto', foto);
      } else {
        sessionStorage.removeItem('foto');
      }

      setMensaje('Club asignado correctamente.');
      setTimeout(() => {
        navigate('/home');
      }, 1200);
    } catch (err) {
      setMensaje(err.response?.data?.mensaje || 'No se pudo asignar el club');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="container py-5">
      <h1 className="mb-4 text-center">Seleccioná tu club</h1>
      <p className="text-muted text-center">
        Necesitamos conocer el club al que pertenecés para mostrarte la información correcta.
      </p>
      <form className="col-12 col-md-6 mx-auto" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="club" className="form-label">Club</label>
          <select
            id="club"
            className="form-select"
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            required
          >
            <option value="">Seleccioná un club</option>
            {clubs.map((club) => (
              <option key={club._id} value={club._id}>
                {club.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="d-grid">
          <button type="submit" className="btn btn-primary" disabled={cargando}>
            {cargando ? 'Guardando...' : 'Guardar club'}
          </button>
        </div>
      </form>
      {mensaje && <div className="alert alert-info text-center mt-4">{mensaje}</div>}
      <div className="row row-cols-1 row-cols-md-3 g-3 mt-4">
        {clubs.map((club) => (
          <div className="col" key={`card-${club._id}`}>
            <div className={`card h-100 ${club._id === clubId ? 'border-primary' : ''}`}>
              {club.logo && (
                <img src={club.logo} className="card-img-top" alt={`Logo ${club.nombre}`} />
              )}
              <div className="card-body">
                <h5 className="card-title">{club.nombre}</h5>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
