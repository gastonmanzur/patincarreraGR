import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function VerPatinador() {
  const { id } = useParams();
  const [patinador, setPatinador] = useState(null);

  useEffect(() => {
    const fetchPatinador = async () => {
      try {
        const res = await api.get(`/patinadores/${id}`);
        setPatinador(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPatinador();
  }, [id]);

  if (!patinador) {
    return <div className="container mt-4">Cargando...</div>;
  }

  const fechaNacimiento = new Date(patinador.fechaNacimiento).toLocaleDateString(
    'es-AR',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  );

  return (
    <div className="container mt-4">
      <h1>
        {patinador.primerNombre} {patinador.segundoNombre ? `${patinador.segundoNombre} ` : ''}
        {patinador.apellido}
      </h1>
      {patinador.fotoRostro && (
        <img
          src={patinador.fotoRostro}
          alt={`${patinador.primerNombre} ${patinador.apellido}`}
          style={{ maxWidth: '200px' }}
          className="img-fluid mb-3"
        />
      )}
      <ul className="list-group mb-3">
        <li className="list-group-item">Edad: {patinador.edad}</li>
        <li className="list-group-item">
          <strong>Fecha de Nacimiento: {fechaNacimiento}</strong>
        </li>
        <li className="list-group-item">DNI: {patinador.dni}</li>
        <li className="list-group-item">CUIL: {patinador.cuil}</li>
        <li className="list-group-item">Dirección: {patinador.direccion}</li>
        <li className="list-group-item">DNI Madre: {patinador.dniMadre}</li>
        <li className="list-group-item">DNI Padre: {patinador.dniPadre}</li>
        <li className="list-group-item">Teléfono: {patinador.telefono}</li>
        <li className="list-group-item">Sexo: {patinador.sexo}</li>
        <li className="list-group-item">Nivel: {patinador.nivel}</li>
        <li className="list-group-item">Seguro: {patinador.seguro}</li>
        <li className="list-group-item">
          Número de Corredor: {patinador.numeroCorredor}
        </li>
        <li className="list-group-item">Categoría: {patinador.categoria}</li>
      </ul>
      {patinador.foto && (
        <div className="mb-3">
          <img
            src={patinador.foto}
            alt={`${patinador.primerNombre} ${patinador.apellido}`}
            className="img-fluid"
            style={{ maxWidth: '300px' }}
          />
        </div>
      )}
      <Link to="/patinadores" className="btn btn-secondary">
        Volver
      </Link>
    </div>
  );
}
