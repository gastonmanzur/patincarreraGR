import { useParams } from 'react-router-dom';
import ImportarPuntajesPDF from '../components/importaciones/ImportarPuntajesPDF.jsx';

export default function ImportarPuntajesPDFPage() {
  const { id } = useParams();
  return (
    <div style={{ padding: 20 }}>
      <ImportarPuntajesPDF competenciaId={id} />
    </div>
  );
}
