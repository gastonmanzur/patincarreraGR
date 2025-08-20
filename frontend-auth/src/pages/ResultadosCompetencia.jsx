import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function ResultadosCompetencia() {
  const { id } = useParams();
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const rol = localStorage.getItem('rol');

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get(`/competitions/${id}/resultados`);
        setResultados(res.data);
      } catch (err) {
        console.error(err);
        setError('Error al cargar resultados');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);
  const importar = async (e) => {
    e.preventDefault();
    if (!archivo) return;
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      await api.post(`/competitions/${id}/resultados/import-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const res = await api.get(`/competitions/${id}/resultados`);
      setResultados(res.data);
      setArchivo(null);
    } catch (err) {
      console.error(err);
      alert('Error al importar resultados');
    }
  };

  if (loading) return <div className="container mt-3">Cargando resultados...</div>;
  if (error) return <div className="container mt-3 text-danger">{error}</div>;

  return (
    <div className="container mt-3">
      <h2>Resultados</h2>
      {rol === 'Delegado' && (
        <form onSubmit={importar} className="mb-3">
          <div className="input-group">
            <input
              type="file"
              accept="application/pdf"
              className="form-control"
              onChange={(e) => setArchivo(e.target.files[0])}
            />
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!archivo}
            >
              Importar PDF
            </button>
          </div>
        </form>
      )}
      {resultados.length === 0 ? (
        <p>No hay resultados cargados.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Posición</th>
                <th>Nombre</th>
                <th>Tiempo (ms)</th>
                <th>Puntos</th>
                <th>Dorsal</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r) => (
                <tr key={r._id}>
                  <td>{r.categoria}</td>
                  <td>{r.posicion}</td>
                  <td>{`${r.deportistaId?.primerNombre || ''} ${r.deportistaId?.segundoNombre || ''} ${r.deportistaId?.apellido || ''}`.trim()}</td>
                  <td>{r.tiempoMs}</td>
                  <td>{r.puntos}</td>
                  <td>{r.dorsal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

