import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function VerReporte() {
  const { id } = useParams();
  const [reporte, setReporte] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get(`/progreso/${id}`);
        setReporte(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    cargar();
  }, [id]);

  if (!reporte) {
    return (
      <div className="container mt-4">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h1 className="mb-4">
        Reporte de {reporte.patinador.primerNombre} {reporte.patinador.apellido}
      </h1>
      <p>
        <strong>Fecha:</strong> {new Date(reporte.fecha).toLocaleDateString('es-AR')}
      </p>
      <p>
        <strong>Descripción:</strong>
      </p>
      <p>{reporte.descripcion}</p>
    </div>
  );
}
