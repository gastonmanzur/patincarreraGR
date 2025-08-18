import { useEffect, useState } from 'react';
import api from '../api';
import LogoutButton from '../components/LogoutButton';

export default function PanelAdmin() {
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      const res = await api.get('/protegido/usuarios');
      setUsuarios(res.data);
    };

    fetchUsuarios();
  }, []);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="m-0">Panel de Administración</h1>
        <LogoutButton />
      </div>
      <h2 className="mb-3">Usuarios registrados</h2>
      <div className="table-responsive">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Email</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => (
              <tr key={user._id}>
                <td>{user.nombre}</td>
                <td>{user.apellido}</td>
                <td>{user.email}</td>
                <td>{user.rol}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

