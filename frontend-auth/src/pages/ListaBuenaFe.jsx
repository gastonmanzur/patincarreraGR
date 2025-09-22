import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function ListaBuenaFe() {
  const { id } = useParams();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get(`/competitions/${id}/lista-buena-fe`);
        setLista(res.data);
      } catch (err) {
        console.error(err);
        setError('Error al cargar lista');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  const exportar = async () => {
    try {
      const res = await api.get(`/competitions/${id}/lista-buena-fe/excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'lista_buena_fe.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Error al exportar');
    }
  };

  if (loading) return <div className="container mt-3">Cargando lista...</div>;
  if (error) return <div className="container mt-3 text-danger">{error}</div>;

  return (
    <div className="container mt-3">
      <h2>Lista de Buena Fe</h2>
      <button className="btn btn-success mb-3" onClick={exportar}>
        Exportar a Excel
      </button>
      {lista.length === 0 ? (
        <p>No hay patinadores en la lista.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Apellido y Nombre</th>
              <th>Categoría</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p, idx) => (
              <tr key={p._id || idx}>
                <td>{idx + 1}</td>
                <td>
                  {p.apellido} {p.primerNombre}
                </td>
                <td>{p.categoria}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
