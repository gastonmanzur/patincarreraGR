import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import getImageUrl from '../utils/getImageUrl';

export default function VerNoticia() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [noticia, setNoticia] = useState(null);
  const rol = sessionStorage.getItem('rol');
  const puedeGestionar = rol === 'Delegado' || rol === 'Tecnico';

  useEffect(() => {
    const fetchNoticia = async () => {
      try {
        const clubId = sessionStorage.getItem('clubId');
        const config = clubId ? { params: { clubId } } : {};
        const res = await api.get(`/news/${id}`, config);
        const clubLogo = getImageUrl(res.data?.club?.logo);
        const clubNombre =
          res.data?.club?.nombreAmigable || res.data?.club?.nombre || 'General Rodríguez';

        setNoticia({
          ...res.data,
          imagen: getImageUrl(res.data?.imagen),
          club: res.data?.club
            ? { ...res.data.club, logo: clubLogo, nombreAmigable: clubNombre }
            : null
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchNoticia();
  }, [id]);

  if (!noticia) {
    return <div className="container mt-4">Cargando...</div>;
  }

  const handleDelete = async () => {
    const confirmar = window.confirm('¿Estás seguro de que deseas eliminar esta noticia?');
    if (!confirmar) return;
    try {
      await api.delete(`/news/${id}`);
      navigate('/home');
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al eliminar la noticia');
    }
  };

  const clubNombre = noticia.club?.nombreAmigable || noticia.club?.nombre || 'General Rodríguez';
  const clubLogo = noticia.club?.logo;

  return (
    <div className="container mt-4">
      <h1 className="mb-3 text-center">{noticia.titulo}</h1>
      {noticia.imagen && (
        <img
          src={noticia.imagen}
          alt="imagen noticia"
          className="img-fluid mb-3 d-block mx-auto"
          style={{ maxWidth: '70vw', maxHeight: '70vh', width: '100%', height: 'auto', objectFit: 'contain' }}
        />
      )}
      {puedeGestionar && (
        <div className="mb-3 d-flex gap-2 justify-content-center flex-wrap">
          <Link to={`/noticias/${id}/editar`} className="btn btn-warning">
            Editar
          </Link>
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Eliminar
          </button>
        </div>
      )}
      <p>{noticia.contenido}</p>
      <div className="mt-3 d-flex align-items-center gap-2">
        <img
          src={clubLogo || '/vite.svg'}
          alt={`Logo del club ${clubNombre}`}
          width="30"
          height="30"
          style={{ objectFit: 'cover' }}
        />
        <span>Patín carrera club {clubNombre}</span>
      </div>
    </div>
  );
}

